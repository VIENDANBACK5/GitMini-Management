import os

import pytest
from fastapi.testclient import TestClient

from app import db
from app.auth import SESSIONS
from app.main import app

TEST_TABLES = """
TRUNCATE
  audit_logs,
  pull_request_reviews,
  pull_requests,
  issues,
  commit_parents,
  branches,
  commits,
  repo_stats,
  repo_members,
  repositories,
  users
CASCADE
"""


def clear_tables():
    with db.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(TEST_TABLES)


@pytest.fixture
def client():
    if not os.getenv("DATABASE_URL"):
        pytest.fail("DATABASE_URL must point to a temporary PostgreSQL test database")

    SESSIONS.clear()
    with TestClient(app) as test_client:
        clear_tables()
        yield test_client
        clear_tables()
    SESSIONS.clear()


@pytest.fixture
def login(client):
    def _login(username: str):
        response = client.post("/auth/login", json={"username": username, "password": "gitmini_password"})
        assert response.status_code == 200, response.text
        return response

    return _login


@pytest.fixture
def as_user(client, login):
    def _as_user(username: str):
        login(username)
        return client

    return _as_user


@pytest.fixture
def make_repo(client, login):
    def _make_repo(owner: str = "alice", name: str = "alpha", is_private: bool = False):
        login(owner)
        response = client.post(
            "/repos",
            json={"name": name, "description": f"{name} repo", "is_private": is_private},
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _make_repo


@pytest.fixture
def add_member(client, login):
    def _add_member(repo: str, username: str, role: str, actor: str = "alice"):
        login(actor)
        response = client.post(f"/repos/{repo}/members", json={"username": username, "role": role})
        assert response.status_code == 201, response.text
        return response.json()

    return _add_member


@pytest.fixture
def make_issue(client, login):
    def _make_issue(repo: str, actor: str = "alice", title: str = "Issue"):
        login(actor)
        response = client.post(f"/repos/{repo}/issues", json={"title": title, "body": "", "labels": []})
        assert response.status_code == 201, response.text
        return response.json()

    return _make_issue


@pytest.fixture
def make_pull(client, login):
    def _make_pull(repo: str, actor: str = "carol", title: str = "Improve docs"):
        login(actor)
        response = client.post(
            f"/repos/{repo}/pulls",
            json={"title": title, "body": "", "source_branch": "feature/docs", "target_branch": "main"},
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _make_pull


@pytest.fixture
def audit_actions(client, login):
    def _audit_actions(action: str | None = None):
        login("admin")
        params = {"action": action} if action else {}
        response = client.get("/admin/audit-logs", params=params)
        assert response.status_code == 200, response.text
        return [row["action"] for row in response.json()]

    return _audit_actions
