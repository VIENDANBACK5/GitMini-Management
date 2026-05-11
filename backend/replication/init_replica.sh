#!/bin/bash
# =============================================================
# init_replica.sh
# Script khởi tạo Standby (Slave) từ Primary qua pg_basebackup
# Chạy bên trong container db_replica khi start lần đầu
# =============================================================

set -e

PRIMARY_HOST="${PRIMARY_HOST:-db}"
PRIMARY_PORT="${PRIMARY_PORT:-5432}"
REPL_USER="${REPL_USER:-replicator}"
REPL_PASSWORD="${REPL_PASSWORD:-repl_gitmini_2024}"
PGDATA="/var/lib/postgresql/data"

echo "[REPLICA] Waiting for Primary at ${PRIMARY_HOST}:${PRIMARY_PORT}..."

# Đợi cho đến khi Primary sẵn sàng nhận kết nối
until PGPASSWORD="$REPL_PASSWORD" pg_isready -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$REPL_USER" -q; do
    echo "[REPLICA] Primary not ready. Retrying in 3s..."
    sleep 3
done

echo "[REPLICA] Primary is ready. Starting pg_basebackup..."

# Sửa quyền thư mục data (Postgres yêu cầu 0700)
chmod 0700 "$PGDATA"

# Nếu thư mục data trống hoặc lỗi, tiến hành clone từ Master
if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "[REPLICA] Data directory is empty or incomplete. Starting pg_basebackup..."
    
    # Chạy pg_basebackup dưới quyền user postgres
    PGPASSWORD="$REPL_PASSWORD" su-exec postgres pg_basebackup \
        -h "$PRIMARY_HOST" \
        -p "$PRIMARY_PORT" \
        -U "$REPL_USER" \
        -D "$PGDATA" \
        --wal-method=stream \
        --checkpoint=fast \
        --progress \
        --verbose

    echo "[REPLICA] pg_basebackup completed."

    # Tạo file standby.signal và sửa owner
    touch "$PGDATA/standby.signal"
    chown postgres:postgres "$PGDATA/standby.signal"

    # Cấu hình recovery
    cat > "$PGDATA/postgresql.auto.conf" <<EOF
primary_conninfo = 'host=${PRIMARY_HOST} port=${PRIMARY_PORT} user=${REPL_USER} password=${REPL_PASSWORD} application_name=gitmini_replica'
hot_standby = on
EOF
    chown postgres:postgres "$PGDATA/postgresql.auto.conf"
    echo "[REPLICA] Standby configuration written."
else
    echo "[REPLICA] Data directory already initialized. Starting as standby."
fi

echo "[REPLICA] Starting PostgreSQL as user postgres..."
exec su-exec postgres postgres
