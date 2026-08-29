"""BAMBATA 2.0 - Test for AI Phrase Suggestion Endpoint."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_suggest_regions_endpoint():
    payload = {
        "bpm_a": 126.0,
        "bpm_b": 126.0,
        "duration_a_s": 180.0,
        "duration_b_s": 240.0,
        "genre_style": "Afrohouse / Tech House"
    }
    response = client.post("/api/v1/mashup/suggest-regions", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "deck_a" in data
    assert "deck_b" in data
    assert data["deck_a"]["start_s"] > 0
    assert data["deck_a"]["end_s"] > data["deck_a"]["start_s"]
    assert data["deck_b"]["start_s"] > 0
    assert data["deck_b"]["end_s"] > data["deck_b"]["start_s"]
    assert "Optimal Phrase Match" in data["suggestion_strategy"]
    print("Suggest Regions endpoint verified successfully!")

if __name__ == "__main__":
    test_suggest_regions_endpoint()
