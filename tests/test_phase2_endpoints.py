import io
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.api.auth import get_current_user

# Mock auth for unit testing
app.dependency_overrides[get_current_user] = lambda: "test-user-id"

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_parse_jd_txt():
    jd_content = b"Looking for a Senior Python Developer with FastAPI and spaCy experience."
    res = client.post(
        "/api/v1/parse-jd",
        files={"file": ("job_description.txt", io.BytesIO(jd_content), "text/plain")},
    )
    assert res.status_code == 200
    data = res.json()
    assert "Senior Python Developer" in data["text"]
    assert data["char_count"] == len(jd_content)

def test_parse_jd_empty():
    res = client.post(
        "/api/v1/parse-jd",
        files={"file": ("job_description.txt", io.BytesIO(b""), "text/plain")},
    )
    assert res.status_code == 422

def test_large_body_rejection():
    # Middleware rejects payload > 6 MB
    oversized_data = b"0" * (6 * 1024 * 1024 + 50)
    res = client.post(
        "/api/v1/parse-jd",
        content=oversized_data,
        headers={"Content-Length": str(len(oversized_data)), "Content-Type": "application/octet-stream"}
    )
    assert res.status_code == 413
