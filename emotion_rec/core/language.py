"""Display translations; canonical emotion labels and stored user data stay intact."""
import json
import re
from .config import SHARED_DIR

EMOTION_LABELS_EN = json.loads((SHARED_DIR / "emotion_labels_en.json").read_text(encoding="utf-8"))


def english_emotion(label: str) -> str:
    value = str(label or "Neutral")
    return EMOTION_LABELS_EN.get(value, "Unclear" if re.search(r"[\u3400-\u9fff]", value) else value)


def input_language(*texts: str, default: str = "en") -> str:
    """First meaningful current input wins; stored context is deliberately excluded."""
    for text in texts:
        chinese = len(re.findall(r"[\u3400-\u9fff]", str(text or "")))
        english = len(re.findall(r"[A-Za-z]+", str(text or "")))
        if chinese or english:
            return "zh" if chinese >= english else "en"
    return "zh" if default == "zh" else "en"
