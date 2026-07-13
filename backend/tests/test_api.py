import uuid

from fastapi.testclient import TestClient

from app import auth, db
from app.main import app

client = TestClient(app)


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@test.techkraft.com"


def _register_and_login(email: str, password: str = "testpass123") -> str:
    client.post("/auth/register", json={"email": email, "password": password})
    resp = client.post("/auth/login", data={"username": email, "password": password})
    return resp.json()["access_token"]


def _make_admin_token(email: str, password: str = "testpass123") -> str:
    # Bypasses the API on purpose - there is no HTTP path that creates an
    # admin (see auth.register_user, which hardcodes role="reviewer").
    # Test setup goes straight to db.create_user instead.
    db.create_user(email=email, password_hash=auth.hash_password(password), role="admin")
    resp = client.post("/auth/login", data={"username": email, "password": password})
    return resp.json()["access_token"]


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_candidates_requires_auth():
    resp = client.get("/candidates")
    assert resp.status_code == 401


def test_create_candidate_endpoint():
    admin_token = _make_admin_token(_unique_email("admin"))

    resp = client.post(
        "/candidates",
        json={
            "name": "Test Candidate",
            "email": _unique_email("cand"),
            "role_applied": "Backend Engineer",
            "skills": ["Python", "FastAPI"],
        },
        headers=_auth_header(admin_token),
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Test Candidate"
    assert body["role_applied"] == "Backend Engineer"
    assert body["status"] == "new"
    assert "id" in body


def test_reviewer_cannot_see_another_reviewers_scores():
    admin_token = _make_admin_token(_unique_email("admin"))
    r1_token = _register_and_login(_unique_email("r1"))
    r2_token = _register_and_login(_unique_email("r2"))

    candidate = client.post(
        "/candidates",
        json={
            "name": "Shared Candidate",
            "email": _unique_email("cand"),
            "role_applied": "Full-stack Engineer",
            "skills": [],
        },
        headers=_auth_header(admin_token),
    ).json()
    candidate_id = candidate["id"]

    client.post(
        f"/candidates/{candidate_id}/scores",
        json={"category": "Technical", "score": 4},
        headers=_auth_header(r1_token),
    )
    client.post(
        f"/candidates/{candidate_id}/scores",
        json={"category": "Communication", "score": 5},
        headers=_auth_header(r2_token),
    )

    r1_view = client.get(f"/candidates/{candidate_id}", headers=_auth_header(r1_token)).json()
    r2_view = client.get(f"/candidates/{candidate_id}", headers=_auth_header(r2_token)).json()
    admin_view = client.get(f"/candidates/{candidate_id}", headers=_auth_header(admin_token)).json()

    # each reviewer sees only their own score
    assert len(r1_view["scores"]) == 1
    assert r1_view["scores"][0]["category"] == "Technical"
    assert "internal_notes" not in r1_view  # field absent, not just empty

    assert len(r2_view["scores"]) == 1
    assert r2_view["scores"][0]["category"] == "Communication"
    assert "internal_notes" not in r2_view

    # admin sees both, plus internal_notes
    assert len(admin_view["scores"]) == 2
    assert "internal_notes" in admin_view