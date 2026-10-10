"""Local browser QA only: isolated temp DB, audio stub and no paid model calls.

Run: python -m uvicorn tests.smoke_server:app --host 127.0.0.1 --port 8765
"""
import sys
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")

from tests.conftest import application

app = application.app
