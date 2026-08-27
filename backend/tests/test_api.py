"""Integration tests for FastAPI endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "BAMBATA 2.0 - AI DJ Mashup Studio"
    assert "endpoints" in data


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_brain_arrange_endpoint():
    payload = {
        "prompt": "1-minute festival banger drop",
        "track_a": {
            "track_id": "track_1",
            "name": "Acapella Vocals",
            "bpm": 128.0,
            "key": "A minor",
            "camelot": "8A",
            "role": "vocal"
        },
        "track_b": {
            "track_id": "track_2",
            "name": "Club Instrumental Beat",
            "bpm": 126.0,
            "key": "C Major",
            "camelot": "8B",
            "role": "beat"
        }
    }
    response = client.post("/api/brain/arrange", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "target_bpm" in data
    assert "target_camelot_key" in data
    assert len(data["preview_plans"]) == 3


def test_recommendations_endpoint():
    response = client.get("/api/recommendations?bpm=128.0&camelot_key=8A")
    assert response.status_code == 200
    data = response.json()
    assert data["master_bpm"] == 128.0
    assert len(data["recommendations"]) == 3
