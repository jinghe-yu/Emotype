import os
import tempfile
import atexit

# Set before importing persistence. No test ever uses the user's database/key.
_db_folder = tempfile.TemporaryDirectory(prefix="emobridge-tests-")
os.environ["DATABASE_URL"] = "sqlite:///" + _db_folder.name.replace("\\", "/") + "/qa.sqlite3"
os.environ["LLM_ENABLED"] = "false"
os.environ["TEXT_EMOTION_BACKEND"] = "rules"
os.environ["TEXT_EMOTION_LOCAL_FILES_ONLY"] = "1"

import pytest
from fastapi.testclient import TestClient
from tests.support import load_web_app

application = load_web_app()
from emotion_rec.persistence import repository as repo
atexit.register(repo.engine.dispose)


@pytest.fixture(autouse=True)
def database():
    repo.Base.metadata.drop_all(repo.engine)
    repo.init_database()
    application.app.dependency_overrides.clear()
    yield
    application.app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(application.app) as client:
        yield client
