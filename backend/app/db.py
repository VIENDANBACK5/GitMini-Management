import logging
import os
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool

logger = logging.getLogger(__name__)

# ─── Connection Pools ────────────────────────────────────────────────────────
# Primary: nhận cả READ và WRITE
_write_pool: SimpleConnectionPool | None = None
# Replica: chỉ READ (hot_standby mode)
_read_pool: SimpleConnectionPool | None = None
# Flag: có Replica đang hoạt động không
_replica_available: bool = False


def init_pool() -> None:
    """Khởi tạo connection pool tới Primary và (nếu có) Replica."""
    global _write_pool, _read_pool, _replica_available

    # --- Primary (ghi + đọc fallback) ---
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    _write_pool = SimpleConnectionPool(1, int(os.getenv("DB_POOL_MAX", "10")), database_url)
    logger.info("[DB] Primary pool initialized: %s", database_url.split("@")[-1])

    # --- Replica (chỉ đọc, tùy chọn) ---
    replica_url = os.getenv("DATABASE_REPLICA_URL")
    if replica_url:
        try:
            _read_pool = SimpleConnectionPool(1, int(os.getenv("DB_REPLICA_POOL_MAX", "10")), replica_url)
            # Kiểm tra kết nối ngay lập tức
            test_conn = _read_pool.getconn()
            test_conn.cursor().execute("SELECT 1")
            _read_pool.putconn(test_conn)
            _replica_available = True
            logger.info("[DB] Replica pool initialized: %s ✅", replica_url.split("@")[-1])
        except Exception as exc:
            _read_pool = None
            _replica_available = False
            logger.warning("[DB] Replica unavailable, falling back to Primary: %s", exc)
    else:
        logger.info("[DB] No DATABASE_REPLICA_URL set, all reads go to Primary.")


def close_pool() -> None:
    global _write_pool, _read_pool, _replica_available
    if _write_pool:
        _write_pool.closeall()
        _write_pool = None
    if _read_pool:
        _read_pool.closeall()
        _read_pool = None
    _replica_available = False


# ─── Context Managers ─────────────────────────────────────────────────────────

@contextmanager
def get_connection():
    """Lấy kết nối từ Primary — dùng cho INSERT, UPDATE, DELETE và transactions."""
    if _write_pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database pool is not initialized",
        )
    conn = _write_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _write_pool.putconn(conn)


@contextmanager
def get_read_connection():
    """
    Lấy kết nối từ Replica nếu có (READ-WRITE SPLITTING).
    Tự động fallback về Primary nếu Replica không hoạt động.
    """
    pool = _read_pool if _replica_available and _read_pool else _write_pool
    if pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database pool is not initialized",
        )
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


# ─── Serializers ─────────────────────────────────────────────────────────────

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


# ─── Query Helpers ────────────────────────────────────────────────────────────

def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
    """SELECT nhiều hàng — tự động dùng Replica nếu có (Read-Write Splitting)."""
    with get_read_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return [serialize_row(row) for row in cur.fetchall()]


def fetch_one(sql: str, params: tuple = ()) -> dict | None:
    """SELECT một hàng — tự động dùng Replica nếu có."""
    with get_read_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            if cur.description is None:
                return None
            return serialize_row(cur.fetchone())


def execute_one(sql: str, params: tuple = ()) -> dict | None:
    """INSERT/UPDATE/DELETE — LUÔN dùng Primary (ghi)."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            if cur.description is None:
                return None
            return serialize_row(cur.fetchone())


def replica_status() -> dict:
    """Trả về trạng thái Replication để hiển thị trên Admin Dashboard."""
    status_info = {
        "replica_active": False,
        "state": "Inactive",
        "lag": "0 bytes",
        "sync_state": "N/A"
    }
    
    if _replica_available:
        try:
            with get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT
                            state,
                            sync_state,
                            pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS lag
                        FROM pg_stat_replication
                        LIMIT 1
                    """)
                    row = cur.fetchone()
                    if row:
                        status_info.update({
                            "replica_active": True,
                            "state": row["state"],
                            "lag": row["lag"] if row["lag"] else "0 bytes",
                            "sync_state": row["sync_state"]
                        })
        except Exception as exc:
            status_info["error"] = str(exc)
    return status_info
