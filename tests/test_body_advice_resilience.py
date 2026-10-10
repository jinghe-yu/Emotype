"""Body Sense timeouts/language contracts; no real provider, model or private DB."""
import asyncio
import json
import re
import time
import threading

import pytest

from emotion_rec.domain.emotion import text as text_emotion
from emotion_rec.integrations import llm
from emotion_rec.services import body_sensation as body
from tests.conftest import application


def request(**changes):
    return {"selected_regions": [{"id": "head", "label": "头部"}],
            "symptoms": [{"id": "headache", "label": "头痛", "region_id": "head", "severity": 3}],
            "recent_diary_limit": 0, **changes}


@pytest.mark.parametrize("notes,journal,ui,expected", [
    ("", "", "en", "en"), ("", "", "zh", "zh"),
    ("I spent a long time at my desk.", "昨天会议让我紧张", "zh", "en"),
    ("今天坐得太久了", "I had a long meeting.", "en", "zh"),
    ("", "I have a mild headache.", "zh", "en"),
    ("", "今天有一点头痛", "en", "zh"),
])
def test_current_input_controls_model_and_fallback_language(monkeypatch, notes, journal, ui, expected):
    monkeypatch.setenv("BODY_ADVICE_LLM_ENABLED", "false")
    data = body.generate_body_sensation_advice(request(free_text=notes, journal_text=journal, ui_language=ui))
    assert data["language"] == expected
    assert bool(re.search(r"[\u3400-\u9fff]", data["advice"]["summary"])) == (expected == "zh")
    assert bool(re.search(r"[\u3400-\u9fff]", data["advice"]["reflection_prompt"])) == (expected == "zh")
    assert data["advice"]["source"] == "fallback"


def test_historical_chinese_does_not_override_current_english_or_default(monkeypatch):
    monkeypatch.setenv("BODY_ADVICE_LLM_ENABLED", "false")
    monkeypatch.setattr(body, "get_or_create_participant", lambda *_: None)
    monkeypatch.setattr(body, "_collect_recent_diaries", lambda *_: [{"raw_text": "昨天睡得很晚", "final_label": "焦虑"}])
    monkeypatch.setattr(body, "_log_body_sensation_event", lambda *_, **__: True)
    data = body.generate_body_sensation_advice(request(participant_code="qa_history", recent_diary_limit=3))
    assert data["language"] == "en" and data["recent_diaries_used"] == 1


def test_timeout_returns_safety_net_without_an_extra_emotion_model_call(monkeypatch):
    captured = []
    monkeypatch.setattr(text_emotion, "TEXT_EMOTION_BACKEND", "deepseek")
    monkeypatch.setattr(text_emotion, "_analyze_with_llm", lambda *_: pytest.fail("Body must not call emotion LLM"))
    monkeypatch.setenv("BODY_ADVICE_LLM_ENABLED", "true")
    monkeypatch.setenv("BODY_LLM_TIMEOUT_SECONDS", "25")
    def timeout(messages, **kwargs):
        captured.append(kwargs)
        raise llm.LLMError("timeout")
    monkeypatch.setattr(llm, "chat_json", timeout)
    data = body.generate_body_sensation_advice(request(free_text="I had a long meeting."))
    assert len(captured) == 1
    assert captured[0]["retries"] == 0 and captured[0]["non_thinking"]
    assert captured[0]["timeout"] == 25 and captured[0]["raise_on_error"]
    assert captured[0]["max_tokens"] <= 2048
    assert data["status"] == "success" and data["advice"]["source"] == "fallback"
    assert data["debug"]["fallback_reason"] == "timeout" and data["advice"]["steps"]


def test_chinese_model_output_and_missing_fields_stay_chinese(monkeypatch):
    captured = {}
    def complete(messages, **kwargs):
        captured.update(messages=messages, **kwargs)
        return {"title": "留意此刻的身体感受", "summary": "你提到久坐后头部不适，可以先观察变化。",
                "steps": ["短暂暂停当前任务。"]}
    monkeypatch.setenv("BODY_ADVICE_LLM_ENABLED", "true")
    monkeypatch.setattr(llm, "chat_json", complete)
    data = body.generate_body_sensation_advice(request(free_text="今天坐得太久了"))
    assert data["language"] == "zh" and data["advice"]["source"] == "llm"
    assert "Simplified Chinese" in captured["messages"][0]["content"]
    sent = json.loads(captured["messages"][1]["content"].split("\n", 1)[1])
    assert sent["response_language"] == "zh"
    assert "raw" not in sent["current_input_priority"]["symptoms"][0]
    assert re.search(r"[\u3400-\u9fff]", data["advice"]["reflection_prompt"])
    assert re.search(r"[\u3400-\u9fff]", data["advice"]["when_to_seek_help"][0])


@pytest.mark.parametrize("notes,summary,expected", [("今天坐得太久了", "English output", "zh"),
                                                     ("I sat for a long time.", "这是中文回答", "en")])
def test_wrong_language_uses_correct_language_safety_net(monkeypatch, notes, summary, expected):
    monkeypatch.setenv("BODY_ADVICE_LLM_ENABLED", "true")
    monkeypatch.setattr(llm, "chat_json", lambda *_, **__: {"title": "Advice", "summary": summary, "steps": ["Pause"]})
    data = body.generate_body_sensation_advice(request(free_text=notes))
    assert data["language"] == expected and data["debug"]["fallback_reason"] == "language_mismatch"
    assert data["advice"]["source"] == "fallback"


def test_chinese_summary_does_not_allow_english_action_steps(monkeypatch):
    monkeypatch.setenv("BODY_ADVICE_LLM_ENABLED", "true")
    monkeypatch.setattr(llm, "chat_json", lambda *_, **__: {"title": "留意身体信号", "summary": "你提到久坐后头部不适。",
                                                         "steps": ["Take a short pause."]})
    data = body.generate_body_sensation_advice(request(free_text="今天坐得太久了"))
    assert data["debug"]["fallback_reason"] == "language_mismatch"
    assert all(re.search(r"[\u3400-\u9fff]", step) for step in data["advice"]["steps"])


def test_chinese_warning_signs_bypass_model_and_preserve_safety(monkeypatch):
    monkeypatch.setattr(body, "_call_body_llm", lambda *_: pytest.fail("Do not wait on a model for warning signs"))
    data = body.generate_body_sensation_advice(request(free_text="突然出现最严重的头痛，还感到无力"))
    assert data["language"] == "zh" and data["safety"]["risk_level"] == "high"
    assert data["debug"]["fallback_reason"] == "safety_priority"
    assert data["safety"]["red_flags"] and "医疗" in data["advice"]["steps"][-1]


def test_endpoint_total_deadline_returns_fast_fallback(client, monkeypatch):
    async def slow_worker(*args, **kwargs):
        await asyncio.sleep(1)
    monkeypatch.setattr(application, "run_in_threadpool", slow_worker)
    monkeypatch.setattr(body, "body_advice_deadline_seconds", lambda: 0.01)
    monkeypatch.setattr(body, "get_or_create_participant", lambda *_: pytest.fail("Emergency fallback must not touch DB"))
    monkeypatch.setattr(body, "_call_body_llm", lambda *_: pytest.fail("Emergency fallback must not call model"))
    start = time.monotonic()
    data = client.post("/body-sensation/advice", json=request(free_text="今天坐得太久了")).json()
    assert time.monotonic() - start < 0.75
    assert data["status"] == "success" and data["language"] == "zh"
    assert data["advice"]["source"] == "fallback" and data["advice"]["steps"]
    assert data["debug"]["fallback_reason"] == "request_timeout" and not data["logged"]


def test_cancelled_worker_does_not_start_another_model_or_log_unshown_advice(monkeypatch):
    cancel = threading.Event()
    cancel.set()
    monkeypatch.setattr(body, "_call_body_llm", lambda *_: pytest.fail("Cancelled work must skip the model"))
    monkeypatch.setattr(body, "_log_body_sensation_event", lambda *_, **__: pytest.fail("Do not log unshown advice"))
    data = body.generate_body_sensation_advice(request(), cancel_event=cancel)
    assert data["debug"]["fallback_reason"] == "request_timeout" and not data["logged"]


def test_invalid_body_language_hint_is_rejected(client):
    assert client.post("/body-sensation/advice", json=request(ui_language="invalid")).status_code == 422
