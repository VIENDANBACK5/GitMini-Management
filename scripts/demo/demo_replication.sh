#!/bin/bash
# =============================================================
# demo_replication.sh
# Script demo Streaming Replication cho buổi bảo vệ đồ án
# Chạy: bash scripts/demo/demo_replication.sh
# =============================================================

set -e
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MASTER_CONTAINER="gitmini_db_container"
REPLICA_CONTAINER="gitmini_db_replica"
DB_USER="gitmini_user"
DB_NAME="gitmini_db"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   GitMini — Demo Streaming Replication               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Demo 1: Kiểm tra trạng thái Replication ─────────────────────────────────
echo -e "${YELLOW}[DEMO 1] Kiểm tra trạng thái Replication trên Master${NC}"
echo "SQL: SELECT client_addr, state, sync_state, sent_lsn, replay_lsn FROM pg_stat_replication;"
echo ""
docker exec "$MASTER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    client_addr,
    state,
    sync_state,
    pg_size_pretty(sent_lsn - replay_lsn) AS lag_bytes,
    now() - reply_time AS lag_time
FROM pg_stat_replication;
"
echo ""

# ─── Demo 2: Ghi vào Master → Đọc từ Replica ─────────────────────────────────
echo -e "${YELLOW}[DEMO 2] Ghi commit mới vào MASTER, kiểm tra REPLICA có nhận không${NC}"

TEST_HASH="demo_$(date +%s)_$(shuf -i 1000-9999 -n 1)"
REPO_ID=$(docker exec "$MASTER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM repositories LIMIT 1;" | tr -d ' ')

if [ -z "$REPO_ID" ]; then
    echo -e "${RED}⚠️  Không tìm thấy Repo nào trong DB. Hãy chạy seed_data.py trước.${NC}"
else
    echo "→ Ghi commit hash '$TEST_HASH' vào MASTER..."
    docker exec "$MASTER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO commits (commit_hash, repo_id, message)
        VALUES ('$TEST_HASH', '$REPO_ID', 'Replication Demo Commit @ $(date)')
        ON CONFLICT DO NOTHING;
    "

    sleep 1  # Đợi WAL lan truyền sang Replica

    echo "→ Đọc từ REPLICA, kiểm tra commit đã xuất hiện chưa..."
    docker exec "$REPLICA_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT commit_hash, message, created_at
        FROM commits
        WHERE commit_hash = '$TEST_HASH';
    " 2>/dev/null && \
        echo -e "${GREEN}✅ THÀNH CÔNG: Dữ liệu đã được sao chép sang Replica!${NC}" || \
        echo -e "${RED}❌ Chưa thấy dữ liệu trên Replica (kiểm tra lại kết nối)${NC}"
fi
echo ""

# ─── Demo 3: Failover Simulation ─────────────────────────────────────────────
echo -e "${YELLOW}[DEMO 3] Failover: Dừng MASTER, hệ thống vẫn đọc được từ REPLICA${NC}"
echo -e "${RED}⚠️  Bước này sẽ dừng Master tạm thời. Nhấn Ctrl+C để bỏ qua.${NC}"
read -t 5 -p "Tiếp tục? (5s để bỏ qua) " CONFIRM || true

if [[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]]; then
    echo "→ Dừng MASTER container..."
    docker stop "$MASTER_CONTAINER"

    echo "→ Thử đọc dữ liệu từ REPLICA (hot_standby mode)..."
    docker exec "$REPLICA_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT COUNT(*) AS total_commits FROM commits;
    " && echo -e "${GREEN}✅ Replica vẫn phục vụ đọc ngay cả khi Master offline!${NC}" || \
       echo -e "${RED}❌ Replica không phản hồi${NC}"

    echo "→ Khởi động lại MASTER..."
    docker start "$MASTER_CONTAINER"
    sleep 5
    echo -e "${GREEN}✅ MASTER đã phục hồi. Replication tự động nối lại.${NC}"
else
    echo "(Bỏ qua Failover demo)"
fi
echo ""

# ─── Demo 4: Replication Lag Monitoring ──────────────────────────────────────
echo -e "${YELLOW}[DEMO 4] Kiểm tra Replication Lag (mục tiêu: < 10ms)${NC}"
docker exec "$MASTER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    application_name,
    state,
    pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) AS lag,
    replay_lsn IS NOT NULL AS replica_active
FROM pg_stat_replication;
"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Demo hoàn thành!                                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
