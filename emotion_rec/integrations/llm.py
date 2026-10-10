"""Shared DeepSeek LLM integration using the OpenAI-compatible API.

All model-backed LLM calls in the API go through this module so text emotion,
kinetic typography, diary reflection, and body-sensation advice share one
configuration path.

Configure with environment variables:
- DEEPSEEK_API_KEY, or legacy LLM_API_KEY
- DEEPSEEK_MODEL, or legacy LLM_MODEL
- DEEPSEEK_BASE_URL, or legacy LLM_API_BASE_URL
- DEEPSEEK_TIMEOUT_SECONDS, or legacy LLM_TIMEOUT_SECONDS

If no API key is configured, callers receive ``None`` and use their local
fallbacks.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any
from urllib.parse import urlparse

try:
    from emotion_rec.core import config as _config
except ModuleNotFoundError:
    from core import config as _config  # type: ignore

logger = logging.getLogger(__name__)


DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", os.getenv("LLM_API_KEY", ""))
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", os.getenv("LLM_MODEL", "deepseek-flash"))
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", os.getenv("LLM_API_BASE_URL", "https://api.deepseek.com"))
DEEPSEEK_TIMEOUT_SECONDS = os.getenv("DEEPSEEK_TIMEOUT_SECONDS", os.getenv("LLM_TIMEOUT_SECONDS", "30"))


def _env_bool(name: str, default: bool = True) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off", ""}


def _base_url() -> str:
    return (os.getenv("DEEPSEEK_BASE_URL", os.getenv("LLM_API_BASE_URL", DEEPSEEK_BASE_URL)) or "https://api.deepseek.com").strip()


def default_model() -> str:
    return (os.getenv("DEEPSEEK_MODEL", os.getenv("LLM_MODEL", DEEPSEEK_MODEL)) or "deepseek-flash").strip()


def _timeout() -> float:
    try:
        return max(1.0, float(os.getenv("DEEPSEEK_TIMEOUT_SECONDS", os.getenv("LLM_TIMEOUT_SECONDS", DEEPSEEK_TIMEOUT_SECONDS))))
    except (TypeError, ValueError):
        return 30.0


def _resolve_api_key() -> str:
    key = (os.getenv("DEEPSEEK_API_KEY", os.getenv("LLM_API_KEY", DEEPSEEK_API_KEY)) or "").strip()
    if key.lower().startswith("bearer "):
        key = key[7:].strip()
    return key


def llm_enabled() -> bool:
    """True only when LLM calls are enabled and an API key is configured."""
    return _env_bool("LLM_ENABLED", True) and bool(_resolve_api_key())


_CLIENT: Any = None
_CLIENT_SIGNATURE: tuple[str, str, float] | None = None


class LLMError(RuntimeError):
    """A safe, machine-readable provider failure without secrets or user text."""

    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def configuration_status() -> str:
    if not _env_bool("LLM_ENABLED", True):
        return "disabled"
    if not _resolve_api_key():
        return "missing_api_key"
    from importlib.util import find_spec
    return "configured" if find_spec("openai") else "missing_sdk"


def get_client(*, raise_on_error: bool = False):
    """Return a cached OpenAI client pointed at DeepSeek, or ``None``."""
    global _CLIENT, _CLIENT_SIGNATURE

    if not _env_bool("LLM_ENABLED", True):
        if raise_on_error:
            raise LLMError("disabled")
        return None

    api_key = _resolve_api_key()
    if not api_key:
        if raise_on_error:
            raise LLMError("missing_api_key")
        return None

    signature = (api_key, _base_url(), _timeout())
    if _CLIENT is not None and _CLIENT_SIGNATURE == signature:
        return _CLIENT

    try:
        from openai import OpenAI
    except Exception as exc:  # pragma: no cover - import guard
        logger.warning("LLM SDK unavailable: %s", type(exc).__name__)
        if raise_on_error:
            raise LLMError("missing_sdk") from exc
        return None

    try:
        _CLIENT = OpenAI(
            api_key=api_key,
            base_url=_base_url(),
            timeout=_timeout(),
            max_retries=0,
        )
        _CLIENT_SIGNATURE = signature
        return _CLIENT
    except Exception as exc:
        logger.warning("LLM client initialization failed: %s", type(exc).__name__)
        _CLIENT = None
        _CLIENT_SIGNATURE = None
        if raise_on_error:
            raise LLMError("invalid_configuration") from exc
        return None


def strip_content(content: str) -> str:
    """Clean an assistant message by dropping thinking blocks and code fences."""
    content = str(content or "").strip()
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL | re.IGNORECASE).strip()
    if "```" in content:
        content = content.replace("```json", "").replace("```JSON", "").replace("```", "").strip()
    return content


def extract_json(content: str) -> Any:
    """Best-effort JSON parse from an assistant message. Returns ``None`` on failure."""
    content = strip_content(content)
    if not content:
        return None
    try:
        return json.loads(content)
    except Exception:
        pass

    for open_ch, close_ch in (("{", "}"), ("[", "]")):
        start = content.find(open_ch)
        end = content.rfind(close_ch)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(content[start : end + 1])
            except Exception:
                continue
    return None


def chat(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    temperature: float | None = None,
    json_mode: bool = False,
    max_tokens: int | None = None,
    raise_on_error: bool = False,
    non_thinking: bool = False,
    **kwargs: Any,
) -> str | None:
    """Call DeepSeek chat completions and return raw assistant content."""
    client = get_client(raise_on_error=raise_on_error)
    if client is None:
        return None

    request: dict[str, Any] = {
        "model": model or default_model(),
        "messages": messages,
    }
    if temperature is not None:
        request["temperature"] = temperature
    if max_tokens is not None:
        request["max_tokens"] = max_tokens
    if json_mode:
        request["response_format"] = {"type": "json_object"}
    request.update(kwargs)
    if non_thinking and urlparse(_base_url()).hostname == "api.deepseek.com":
        request["extra_body"] = {**request.get("extra_body", {}), "thinking": {"type": "disabled"}}

    try:
        response = client.chat.completions.create(**request)
        content = response.choices[0].message.content
        if not strip_content(content):
            raise LLMError("empty_response")
        return content
    except Exception as exc:
        status = getattr(exc, "status_code", None)
        code = exc.code if isinstance(exc, LLMError) else (
            "authentication_failed" if status in (401, 403) else
            "rate_limited" if status == 429 else
            "invalid_request" if status in (400, 404, 422) else
            "timeout" if "timeout" in type(exc).__name__.lower() else "provider_unavailable"
        )
        logger.warning("LLM request failed: code=%s status=%s type=%s", code, status, type(exc).__name__)
        if raise_on_error:
            raise LLMError(code) from exc
        return None


def chat_json(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    retries: int = 1,
    **kwargs: Any,
) -> Any:
    """Call the configured DeepSeek-compatible provider in JSON mode."""
    last_content: str | None = None
    for _ in range(max(1, retries + 1)):
        content = chat(
            messages,
            model=model,
            temperature=temperature,
            json_mode=True,
            max_tokens=max_tokens,
            **kwargs,
        )
        if content and content.strip():
            parsed = extract_json(content)
            if parsed is not None:
                return parsed
            last_content = content
    if last_content is not None:
        logger.warning("LLM response was not valid JSON")
    return None
