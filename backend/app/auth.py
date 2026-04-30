import os
import secrets
import time

from fastapi import HTTPException, Request, status

SESSION_COOKIE_NAME = "gitmini_session"
SESSION_TTL_SECONDS = int(os.getenv("APP_SESSION_TTL_SECONDS", "28800"))
DEMO_USERS = ("admin", "alice", "bob", "carol", "david")
SESSIONS: dict[str, dict] = {}


def allowed_users() -> set[str]:
    configured = os.getenv("APP_BASIC_USERS")
    if configured:
        return {username.strip() for username in configured.split(",") if username.strip()}
    legacy_user = os.getenv("APP_BASIC_USER")
    return set(DEMO_USERS) | ({legacy_user} if legacy_user else set())


def verify_credentials(username: str, password: str) -> bool:
    expected_password = os.getenv("APP_BASIC_PASSWORD", "gitmini_password")
    return username in allowed_users() and secrets.compare_digest(password, expected_password)


def create_session(username: str) -> str:
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = {"username": username, "expires_at": time.time() + SESSION_TTL_SECONDS}
    return token


def delete_session(token: str | None) -> None:
    if token:
        SESSIONS.pop(token, None)


def require_user(request: Request) -> str:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    session = SESSIONS.get(token) if token else None
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if session["expires_at"] <= time.time():
        delete_session(token)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    return session["username"]
