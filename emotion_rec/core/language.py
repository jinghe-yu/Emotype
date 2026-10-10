"""Display translations; canonical emotion labels and stored user data stay intact."""
import json
import re
from .config import SHARED_DIR

EMOTION_LABELS_EN = json.loads((SHARED_DIR / "emotion_labels_en.json").read_text(encoding="utf-8"))


def english_emotion(label: str) -> str:
    value = str(label or "Neutral")
    return EMOTION_LABELS_EN.get(value, "Unclear" if re.search(r"[\u3400-\u9fff]", value) else value)
