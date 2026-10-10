import json
import re
from datetime import date, timedelta
from types import SimpleNamespace

import pytest
from emotion_rec.integrations import llm
from emotion_rec.persistence import repository as repo
from emotion_rec.services import emo_echo, body_sensation as body
from tests.conftest import application


def echo_request(message="I feel nervous", **kwargs):
    return {"message": message, "session_id": "echo-qa-12345", "participant_code": "qa_alice", **kwargs}


def test_model_turn_not_template_and_current_message_once(client, monkeypatch):
    captured = {}
    def model(messages, **kwargs):
        captured.update(messages=messages, **kwargs)
        return "That presentation seems important to you. What part feels most demanding?"
    monkeypatch.setattr(llm, "chat", model)
    result = client.post("/api/emo-echo/chat", json=echo_request(history=[{"role": "user", "content": "I feel nervous"}])).json()
    assert result["reply_source"] == "model" and result["saved"]
    assert sum(m["content"] == "I feel nervous" for m in captured["messages"]) == 1
    assert captured["non_thinking"] and captured["raise_on_error"]
    assert captured["max_tokens"] >= 1024
    assert len(repo.list_echo_sessions("qa_alice")[0]["messages"]) == 2


@pytest.mark.parametrize("code", ["missing_api_key", "authentication_failed", "timeout", "empty_response", "rate_limited"])
def test_english_fallback_on_provider_failure(client, monkeypatch, code):
    def fail(*_, **__):
        raise llm.LLMError(code)
    monkeypatch.setattr(llm, "chat", fail)
    response = client.post("/api/emo-echo/chat", json=echo_request("我很焦虑"))
    data = response.json()
    assert response.status_code == 200
    assert data["reply_source"] == "fallback" and data["error_code"] == code
    assert not re.search(r"[\u3400-\u9fff]", data["reply"])
    assert repo.list_echo_sessions("qa_alice")[0]["messages"] == []


def test_recent_journal_diary_and_body_context_is_scoped(client, monkeypatch):
    alice = repo.get_or_create_participant("qa_alice")
    bob = repo.get_or_create_participant("qa_bob")
    with repo.SessionLocal() as session:
        session.add_all([
            repo.DiaryEntry(participant_id=alice["id"], raw_text="journal: presentation tomorrow"),
            repo.DiaryEntry(participant_id=bob["id"], raw_text="PRIVATE BOB"),
            repo.FormalDiary(participant_id=alice["id"], diary_date=date.today().isoformat(),
                             content="diary: poor sleep", is_draft=False),
            repo.FormalDiary(participant_id=alice["id"], diary_date=(date.today()-timedelta(days=30)).isoformat(),
                             content="OLD RECORD", is_draft=False),
        ])
        session.commit()
    repo.log_usage_event("qa_alice", "body_sensation_advice", {
        "selected_regions": [{"id": "head", "label": "Head"}],
        "symptoms": [{"label": "Dizziness", "severity": 3, "duration": "2 hours"}],
        "free_text": "body note: little water", "journal_text": "body context: deadline",
        "advice": {"summary": "Earlier AI suggestion"},
    })
    captured = {}
    def model(messages, **kwargs):
        captured["context"] = messages[0]["content"]
        return "Your recent journal mentions the presentation and your body note mentions little water."
    monkeypatch.setattr(llm, "chat", model)
    application.app.dependency_overrides[application._get_optional_user] = lambda: {"username": "qa_alice", "role": "user"}
    data = client.post("/api/emo-echo/chat", json=echo_request(participant_code="qa_bob")).json()
    context = captured["context"]
    assert data["context_loaded"]
    assert all(s in context for s in ("journal: presentation", "diary: poor sleep", "body note: little water", "2 hours"))
    assert "PRIVATE BOB" not in context and "OLD RECORD" not in context
    assert "untrusted personal data" in context


def test_sessions_cannot_cross_participants(client, monkeypatch):
    repo.get_or_create_echo_session("qa_bob", "echo-qa-12345")
    monkeypatch.setattr(llm, "chat", lambda *_, **__: pytest.fail("Must not call model"))
    assert client.post("/api/emo-echo/chat", json=echo_request()).status_code == 403


def test_blank_message_rejected(client):
    assert client.post("/api/emo-echo/chat", json=echo_request("  ")).status_code == 422


def test_first_journal_save_reaches_echo_context(client):
    assert client.get("/participants/qa_new/diaries").json()["diary_entries"] == []
    result = client.post("/diaries", json={"participant_code": "qa_new", "raw_text": "First journal: conference nerves"})
    assert result.status_code == 200
    assert "conference nerves" in repo.get_echo_context("qa_new")


def test_new_user_settings_default_to_english():
    with repo.SessionLocal() as session:
        settings = repo.UserSettings(user_id=999)
        session.add(settings)
        session.flush()
        assert settings.language == "en"


def test_language_follows_latest_message_not_context():
    assert emo_echo.reply_language("How are you?", [{"role": "user", "content": "你好"}]) == "en"
    assert emo_echo.reply_language("今天压力很大", [{"role": "user", "content": "Hi"}]) == "zh"
    prompt = emo_echo.build_messages("Hi", [], '{"journals":["中文"]}')[0]["content"]
    assert "LATEST user message" in prompt and "English input -> English" in prompt
    assert "Chinese input -> Chinese" in prompt


def test_llm_request_uses_non_thinking_only_for_deepseek(monkeypatch):
    captured = {}
    def create(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="Specific reply"))])
    monkeypatch.setattr(llm, "get_client", lambda **_: SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create))))
    monkeypatch.setenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    assert llm.chat([{"role": "user", "content": "Hi"}], non_thinking=True, raise_on_error=True) == "Specific reply"
    assert captured["extra_body"]["thinking"]["type"] == "disabled"
    captured.clear()
    monkeypatch.setenv("DEEPSEEK_BASE_URL", "https://example.com/v1")
    llm.chat([{"role": "user", "content": "Hi"}], non_thinking=True)
    assert "extra_body" not in captured


def test_body_fallback_english_logs_notes(client, monkeypatch):
    monkeypatch.setenv("BODY_ADVICE_LLM_ENABLED", "false")
    data = client.post("/body-sensation/advice", json={
        "participant_code": "qa_alice", "selected_regions": [{"id": "head", "label": "头部"}],
        "symptoms": [{"id": "dizziness", "label": "头晕", "severity": 3, "duration": "2 hours"}],
        "free_text": "今天喝水少", "journal_text": "准备演讲", "recent_diary_limit": 0,
    }).json()
    assert data["logged"] and data["recent_diaries_used"] == 0
    for field in ("advice", "safety", "possible_links", "emotion_context"):
        # Emotion evidence can quote original user input, so audit display labels separately.
        value = data[field] if field != "emotion_context" else data[field]["primary_label"]
        assert not re.search(r"[\u3400-\u9fff]", json.dumps(value, ensure_ascii=False))
    context = json.loads(repo.get_echo_context("qa_alice"))
    assert context["body_sense"][0]["notes"] == "今天喝水少"
    records = client.get("/api/records?participant_code=qa_alice&source=body_sensation").json()["records"]
    assert records[0]["summary"].startswith("Body Sense: ")
    assert not re.search(r"[\u3400-\u9fff]", records[0]["summary"])


@pytest.mark.parametrize("symptom,region,notes", [
    ("short_breath", "chest", "difficulty breathing"),
    ("headache", "head", "sudden worst headache"),
    ("diarrhea", "stomach", "bloody stool"),
])
def test_english_warning_signs_bypass_model(monkeypatch, symptom, region, notes):
    monkeypatch.setattr(body, "_call_body_llm", lambda *_: pytest.fail("Warning signs bypass model"))
    data = body.generate_body_sensation_advice({"symptoms": [{"id": symptom, "region_id": region}], "free_text": notes})
    assert data["safety"]["risk_level"] == "high"
    assert not re.search(r"[\u3400-\u9fff]", json.dumps(data["advice"], ensure_ascii=False))


def test_body_model_prompt_output_and_explanations(monkeypatch):
    captured = {}
    def generate(messages, **kwargs):
        captured.update(messages=messages, **kwargs)
        return {"title": "Ease your shoulders", "summary": "You noted tense shoulders after a long meeting.",
                "state_reading": "This may be worth observing.", "steps": ["Take a short pause."],
                "possible_links": [{"label": "Posture", "explanation": "You reported prolonged sitting.", "confidence": "low"}]}
    monkeypatch.setattr(llm, "chat_json", generate)
    data = body.generate_body_sensation_advice({"symptoms": [{"id": "muscle_tight", "region_id": "shoulder_neck"}], "free_text": "long meeting"})
    assert data["advice"]["source"] == "llm"
    assert data["possible_links"][0]["explanation"]
    assert "English" in captured["messages"][0]["content"] and captured["non_thinking"]


def test_positive_body_sensation_not_treated_as_severe_illness(monkeypatch):
    monkeypatch.setenv("BODY_ADVICE_LLM_ENABLED", "false")
    data = body.generate_body_sensation_advice({"symptoms": [{"id": "clear_head", "severity": 5}]})
    assert data["safety"]["risk_level"] == "low"
    assert "positive sensations" in data["advice"]["summary"]


def test_custom_chinese_body_labels_keep_original_but_feedback_is_english(monkeypatch):
    monkeypatch.setenv("BODY_ADVICE_LLM_ENABLED", "false")
    data = body.generate_body_sensation_advice({"symptoms": ["奇怪的感觉"], "selected_regions": ["自定义部位"]})
    assert data["body_sensation"]["symptoms"][0]["raw"] == "奇怪的感觉"
    assert not re.search(r"[\u3400-\u9fff]", json.dumps(data["advice"], ensure_ascii=False))
