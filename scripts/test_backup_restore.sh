#!/usr/bin/env bash
set -euo pipefail

SOURCE_CONTAINER=${GITMINI_BACKUP_SOURCE_CONTAINER:-gitmini_backup_source_db}
RESTORE_CONTAINER=${GITMINI_BACKUP_RESTORE_CONTAINER:-gitmini_backup_restore_db}
SOURCE_PORT=${GITMINI_BACKUP_SOURCE_PORT:-55436}
RESTORE_PORT=${GITMINI_BACKUP_RESTORE_PORT:-55437}
BACKUP_DIR=$(mktemp -d)
DUMP_FILE="${BACKUP_DIR}/gitmini_restore_test.dump"
MIGRATIONS=(
  sql/01_schema.sql
  sql/02_indexes.sql
  sql/03_triggers.sql
  sql/04_security_roles.sql
  sql/05_security_rls.sql
  sql/08_phase4_pr_governance.sql
)

cleanup() {
  docker stop "${SOURCE_CONTAINER}" >/dev/null 2>&1 || true
  docker stop "${RESTORE_CONTAINER}" >/dev/null 2>&1 || true
  rm -rf "${BACKUP_DIR}"
}
trap cleanup EXIT

start_db() {
  local name=$1
  local port=$2
  if docker ps -a --format '{{.Names}}' | grep -Fxq "${name}"; then
    echo "Temporary container ${name} already exists. Stop/remove it before rerunning." >&2
    exit 1
  fi
  docker run --rm --name "${name}" \
    -e POSTGRES_USER=gitmini_user \
    -e POSTGRES_PASSWORD=gitmini_password \
    -e POSTGRES_DB=gitmini_test \
    -p "${port}:5432" \
    -d postgres:15 >/dev/null

  for _ in {1..30}; do
    if docker exec "${name}" pg_isready -U gitmini_user -d gitmini_test >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  docker exec "${name}" pg_isready -U gitmini_user -d gitmini_test >/dev/null
}

start_db "${SOURCE_CONTAINER}" "${SOURCE_PORT}"
for migration in "${MIGRATIONS[@]}"; do
  docker exec -i "${SOURCE_CONTAINER}" psql -v ON_ERROR_STOP=1 -U gitmini_user -d gitmini_test < "${migration}" >/dev/null
done
PYTHONIOENCODING=utf-8 DATABASE_URL="postgresql://gitmini_user:gitmini_password@localhost:${SOURCE_PORT}/gitmini_test" python scripts/seed_data.py --profile demo >/dev/null

docker exec "${SOURCE_CONTAINER}" pg_dump -U gitmini_user -d gitmini_test -F c > "${DUMP_FILE}"

start_db "${RESTORE_CONTAINER}" "${RESTORE_PORT}"
docker exec "${RESTORE_CONTAINER}" psql -v ON_ERROR_STOP=1 -U gitmini_user -d gitmini_test -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'git_admin') THEN CREATE ROLE git_admin; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'git_developer') THEN CREATE ROLE git_developer; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'git_reviewer') THEN CREATE ROLE git_reviewer; END IF;
END
\$\$;
" >/dev/null
docker exec -i "${RESTORE_CONTAINER}" pg_restore -v -U gitmini_user -d gitmini_test < "${DUMP_FILE}" >/dev/null

docker exec "${RESTORE_CONTAINER}" psql -v ON_ERROR_STOP=1 -U gitmini_user -d gitmini_test -tAc "
SELECT
  (SELECT COUNT(*) >= 5 FROM users) AND
  (SELECT COUNT(*) >= 2 FROM repositories) AND
  (SELECT COUNT(*) >= 1 FROM repo_members) AND
  (SELECT to_regclass('public.pull_request_reviews') IS NOT NULL) AND
  (SELECT to_regclass('public.audit_logs') IS NOT NULL);
" | grep -Fxq "t"

echo "Backup/restore test passed using temporary PostgreSQL containers."
