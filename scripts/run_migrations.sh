#!/usr/bin/env bash
# scripts/run_migrations.sh
# Chạy toàn bộ migration GitMini theo đúng thứ tự.
# Dừng ngay nếu bất kỳ bước nào thất bại.

set -euo pipefail

# --- Đọc biến môi trường ---
if [ -f "$(dirname "$0")/../.env" ]; then
    # shellcheck disable=SC1091
    source "$(dirname "$0")/../.env"
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-gitmini_db}"
DB_USER="${DB_USER:-gitmini}"
DB_PASS="${DB_PASS:-}"

export PGPASSWORD="$DB_PASS"

SQL_DIR="$(dirname "$0")/../sql"

run_sql() {
    local step="$1"
    local file="$2"
    echo "━━━ Bước $step: $file ━━━"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_DIR/$file"
    echo "✓ Bước $step hoàn thành."
    echo ""
}

echo "============================================"
echo " GitMini Migration UP — bắt đầu"
echo " Host: $DB_HOST:$DB_PORT  DB: $DB_NAME"
echo "============================================"
echo ""

run_sql 1 "01_schema.sql"
run_sql 2 "02_indexes.sql"
run_sql 3 "03_triggers.sql"
run_sql 4 "04_security_roles.sql"
run_sql 5 "05_security_rls.sql"
run_sql 6 "08_phase4_pr_governance.sql"
run_sql 7 "09_extend_to_20_tables.sql"

echo "============================================"
echo " Migration UP hoàn tất thành công!"
echo "============================================"
echo ""
echo "Bước tiếp theo:"
echo "  python scripts/seed_data.py --profile demo"
