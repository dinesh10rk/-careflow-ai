import pytest
from fastapi.testclient import TestClient

from app.config import Settings, AIMode
from app.main import create_app


@pytest.fixture
def client(monkeypatch):
    # Isolate from any real .env: no DB, no key.
    monkeypatch.setenv("MONGODB_URI", "")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("AI_MODE", "auto")
    from app.config import get_settings
    get_settings.cache_clear()
    with TestClient(create_app()) as c:
        yield c
    get_settings.cache_clear()


def test_health_degraded_without_database(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "degraded"
    assert body["database"]["status"] == "not_configured"


def test_health_reports_demo_mode_without_key(client):
    body = client.get("/health").json()
    assert body["ai"]["mode"] == "demo"
    assert "not live AI" in body["ai"]["note"]


def test_health_never_leaks_secrets(client):
    text = client.get("/health").text.lower()
    assert "mongodb+srv" not in text
    assert "sk-" not in text


def test_unknown_route_uses_error_format(client):
    r = client.get("/nope")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "http_error"


def test_cors_blocks_unlisted_origin(client):
    r = client.get("/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in r.headers


def test_cors_allows_frontend_origin(client):
    r = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_ai_mode_resolution():
    assert Settings(ai_mode=AIMode.AUTO, openai_api_key="").effective_ai_mode == "demo"
    assert Settings(ai_mode=AIMode.AUTO, openai_api_key="k").effective_ai_mode == "live"
    assert Settings(ai_mode=AIMode.DEMO, openai_api_key="k").effective_ai_mode == "demo"
    with pytest.raises(RuntimeError):
        _ = Settings(ai_mode=AIMode.LIVE, openai_api_key="").effective_ai_mode


def test_wildcard_cors_rejected():
    with pytest.raises(ValueError):
        _ = Settings(cors_origins="*").cors_origin_list
