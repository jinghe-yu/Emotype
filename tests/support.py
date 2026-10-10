"""QA-only app setup. Audio inference is stubbed; production code is unchanged."""
import importlib
import sys
import types


def load_web_app():
    # These tests exercise web/LLM/storage contracts, not heavy audio weights.
    name = "emotion_rec.services.audio_emotion"
    audio = types.ModuleType(name)
    audio.RegressionHead = type("RegressionHead", (), {})
    audio.EmotionModel = type("EmotionModel", (), {})
    audio.MODEL_NAME_OR_PATH = "qa-audio-stub"
    audio.TARGET_SAMPLE_RATE = 16000
    audio.DEVICE = "qa"
    audio.convert_to_wav = lambda *_: None
    audio.extract_acoustic_features = lambda *_: {}
    audio.model_loaded = lambda: False
    audio.load_model = lambda: False
    sys.modules[name] = audio
    return importlib.import_module("emotion_rec.api.application")
