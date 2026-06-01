#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME=${GITMINI_TEST_DB_CONTAINER:-gitmini_phase5_test_db}
PORT=${GITMINI_TEST_DB_PORT:-55435}
DATABASE_URL="postgresql://gitmini_user:gitmini_password@localhost:${PORT}/gitmini_test"
MIGRATIONS=(
  sql/01_schema.sql
  sql/02_indexes.sql
  sql/03_triggers.sql
  sql/04_security_roles.sql
  sql/05_security_rls.sql
  sql/08_phase4_pr_governance.sql
  sql/09_extend_to_20_tables.sql
  sql/03_triggers.sql
  sql/04_security_roles.sql
  sql/05_security_rls.sql
  sql/08_phase4_pr_governance.sql
  sql/09_extend_to_20_tables.sql
)

cleanup() {
  docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  echo "Temporary container ${CONTAINER_NAME} already exists. Stop/remove it before rerunning." >&2
  exit 1
fi

docker run --rm --name "${CONTAINER_NAME}" \
  -e POSTGRES_USER=gitmini_user \
  -e POSTGRES_PASSWORD=gitmini_password \
  -e POSTGRES_DB=gitmini_test \
  -p "${PORT}:5432" \
  -d postgres:15 >/dev/null

for _ in {1..30}; do
  if docker exec "${CONTAINER_NAME}" pg_isready -U gitmini_user -d gitmini_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "${CONTAINER_NAME}" pg_isready -U gitmini_user -d gitmini_test >/dev/null

for migration in "${MIGRATIONS[@]}"; do
  docker exec -i "${CONTAINER_NAME}" psql -v ON_ERROR_STOP=1 -U gitmini_user -d gitmini_test < "${migration}" >/dev/null
done

docker exec "${CONTAINER_NAME}" psql -v ON_ERROR_STOP=1 -U gitmini_user -d gitmini_test -tAc "
SELECT COUNT(*) = 20
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'repositories', 'repo_members', 'commits', 'commit_parents',
    'branches', 'issues', 'pull_requests', 'pull_request_reviews', 'audit_logs',
    'repo_stats', 'file_blobs', 'commit_files', 'repository_languages', 'tags',
    'releases', 'issue_comments', 'pull_request_comments', 'ci_runs', 'backup_jobs'
  );
" | grep -Fxq "t"

echo "Migration smoke test passed on temporary PostgreSQL container ${CONTAINER_NAME}."
