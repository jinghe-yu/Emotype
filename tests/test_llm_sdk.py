"""Exercise the real SDK request/response boundary without network or real keys."""
import json
import importlib

import pytest

from emotion_rec.integrations import llm

openai = pytest.importorskip("openai")
httpx = importlib.import_module("httpx2" if int(openai.__version__.split(".")[0]) >= 3 else "httpx")


def install_transport(monkeypatch, handler):
    monkeypatch.setenv("LLM_ENABLED", "true")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "qa-placeholder-not-a-real-key")
    monkeypatch.setenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    monkeypatch.setenv("DEEPSEEK_MODEL", "deepseek-flash")
    monkeypatch.setenv("DEEPSEEK_TIMEOUT_SECONDS", "30")
    client = openai.OpenAI(api_key="qa-placeholder-not-a-real-key", base_url="https://api.deepseek.com",
                           max_retries=0, http_client=httpx.Client(transport=httpx.MockTransport(handler)))
    monkeypatch.setattr(llm, "_CLIENT", client)
    monkeypatch.setattr(llm, "_CLIENT_SIGNATURE", ("qa-placeholder-not-a-real-key", "https://api.deepseek.com", 30.0))
    return client


def completion(content="A specific response", **message_fields):
    return {"id": "qa", "object": "chat.completion", "created": 0, "model": "deepseek-flash",
            "choices": [{"index": 0, "finish_reason": "stop",
                         "message": {"role": "assistant", "content": content, **message_fields}}]}


def test_real_sdk_serializes_non_thinking_request(monkeypatch):
    requests = []
    def respond(request):
        requests.append(request)
        return httpx.Response(200, json=completion())
    with install_transport(monkeypatch, respond):
        assert llm.chat([{"role": "user", "content": "Hello"}], max_tokens=1024,
                        non_thinking=True, raise_on_error=True) == "A specific response"
    payload = json.loads(requests[0].content)
    assert requests[0].method == "POST" and requests[0].url.path == "/chat/completions"
    assert payload["model"] == "deepseek-flash" and payload["max_tokens"] == 1024
    assert payload["thinking"] == {"type": "disabled"}
    assert payload["messages"] == [{"role": "user", "content": "Hello"}]


@pytest.mark.parametrize("status,code", [(401, "authentication_failed"), (429, "rate_limited"),
                                         (400, "invalid_request"), (503, "provider_unavailable")])
def test_real_sdk_errors_have_safe_codes(monkeypatch, status, code):
    def respond(request):
        return httpx.Response(status, json={"error": {"message": "Private provider detail", "type": "qa"}})
    with install_transport(monkeypatch, respond):
        with pytest.raises(llm.LLMError) as error:
            llm.chat([{"role": "user", "content": "Hello"}], raise_on_error=True)
    assert error.value.code == code and "Private" not in str(error.value)


def test_real_sdk_reasoning_only_response_uses_fallback_path(monkeypatch):
    with install_transport(monkeypatch, lambda request: httpx.Response(
        200, json=completion(None, reasoning_content="Thinking without a final reply"))):
        with pytest.raises(llm.LLMError, match="empty_response"):
            llm.chat([{"role": "user", "content": "Hello"}], raise_on_error=True)


def test_real_sdk_timeout_is_bounded_and_classified(monkeypatch):
    def timeout(request):
        raise httpx.ReadTimeout("Private provider detail", request=request)
    with install_transport(monkeypatch, timeout):
        with pytest.raises(llm.LLMError, match="timeout"):
            llm.chat([{"role": "user", "content": "Hello"}], raise_on_error=True)


def test_body_timeout_override_is_transport_option_not_model_parameter(monkeypatch):
    requests = []
    def respond(request):
        requests.append(request)
        return httpx.Response(200, json=completion('{"title":"Advice","summary":"A short pause.","steps":["Pause"]}'))
    with install_transport(monkeypatch, respond):
        result = llm.chat_json([{"role": "user", "content": "Body advice JSON"}], timeout=25,
                               retries=0, non_thinking=True, raise_on_error=True)
    assert result["steps"] == ["Pause"] and len(requests) == 1
    assert "timeout" not in json.loads(requests[0].content)
    assert requests[0].extensions["timeout"]["read"] == 25


def test_missing_key_and_disabled_are_distinguishable(monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "true")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "")
    assert llm.configuration_status() == "missing_api_key"
    with pytest.raises(llm.LLMError, match="missing_api_key"):
        llm.get_client(raise_on_error=True)
    monkeypatch.setenv("LLM_ENABLED", "false")
    assert llm.configuration_status() == "disabled"
    with pytest.raises(llm.LLMError, match="disabled"):
        llm.get_client(raise_on_error=True)
