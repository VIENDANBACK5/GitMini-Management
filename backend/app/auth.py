import os
import secrets

from fastapi import HTTPException, Request, status

SESSION_COOKIE_NAME = "gitmini_session"
SESSION_TTL_SECONDS = int(os.getenv("APP_SESSION_TTL_SECONDS", "28800"))
DEMO_USERS = ("admin", "alice", "bob", "carol", "david")


def init_sessions_table() -> None:
    from app.db import execute_one
    execute_one(
        """
        CREATE TABLE IF NOT EXISTS user_sessions (
            token TEXT PRIMARY KEY,
            username VARCHAR(50) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )


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
    from app.db import execute_one
    token = secrets.token_urlsafe(32)
    execute_one(
        "INSERT INTO user_sessions (token, username, expires_at) VALUES (%s, %s, NOW() + %s * INTERVAL '1 second') ON CONFLICT (token) DO UPDATE SET username = EXCLUDED.username, expires_at = EXCLUDED.expires_at",
        (token, username, SESSION_TTL_SECONDS),
    )
    execute_one("DELETE FROM user_sessions WHERE expires_at <= NOW()")
    return token


def delete_session(token: str | None) -> None:
    if not token:
        return
    from app.db import execute_one
    execute_one("DELETE FROM user_sessions WHERE token = %s", (token,))


def require_user(request: Request) -> str:
    from app.db import fetch_one
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    session = fetch_one(
        "SELECT username FROM user_sessions WHERE token = %s AND expires_at > NOW()",
        (token,),
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return session["username"]
