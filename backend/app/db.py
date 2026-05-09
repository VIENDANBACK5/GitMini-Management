import os
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool

_pool: SimpleConnectionPool | None = None


def init_pool() -> None:
    global _pool
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    _pool = SimpleConnectionPool(1, int(os.getenv("DB_POOL_MAX", "10")), database_url)


def close_pool() -> None:
    global _pool
    if _pool:
        _pool.closeall()
        _pool = None


@contextmanager
def get_connection():
    if _pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database pool is not initialized",
        )

    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def serialize(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize(item) for key, item in value.items()}
    return value


def serialize_row(row):
    if row is None:
        return None
    return {key: serialize(value) for key, value in dict(row).items()}


def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return [serialize_row(row) for row in cur.fetchall()]


def fetch_one(sql: str, params: tuple = ()) -> dict | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            if cur.description is None: # No results to fetch (DELETE/UPDATE without RETURNING)
                return None
            return serialize_row(cur.fetchone())


def execute_one(sql: str, params: tuple = ()) -> dict | None:
    return fetch_one(sql, params)
