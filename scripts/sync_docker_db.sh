#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME=${GITMINI_DB_CONTAINER:-gitmini_db_container}
DB_USER=${GITMINI_DB_USER:-gitmini_user}
DB_NAME=${GITMINI_DB_NAME:-gitmini_db}
MIGRATIONS=(
  sql/01_schema.sql
  sql/02_indexes.sql
  sql/03_triggers.sql
  sql/04_security_roles.sql
  sql/05_security_rls.sql
  sql/08_phase4_pr_governance.sql
)

if ! docker ps --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  echo "Database container ${CONTAINER_NAME} is not running. Start it with: docker compose up -d db" >&2
  exit 1
fi

for migration in "${MIGRATIONS[@]}"; do
  echo "Applying ${migration}..."
  docker exec -i "${CONTAINER_NAME}" psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" < "${migration}" >/dev/null
done

docker exec "${CONTAINER_NAME}" psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" -tAc "
INSERT INTO repo_stats (repo_id)
SELECT id FROM repositories
ON CONFLICT (repo_id) DO NOTHING;

INSERT INTO repo_members (repo_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM repositories
ON CONFLICT (repo_id, user_id) DO UPDATE SET role = 'owner';

INSERT INTO branches (repo_id, name, is_protected)
SELECT id, COALESCE(default_branch, 'main'), TRUE
FROM repositories
ON CONFLICT (repo_id, name) DO UPDATE SET is_protected = TRUE;

SELECT
  (SELECT to_regclass('public.repo_members') IS NOT NULL) AND
  (SELECT to_regclass('public.pull_request_reviews') IS NOT NULL) AND
  (SELECT to_regclass('public.audit_logs') IS NOT NULL) AND
  (SELECT COUNT(*) = 5 FROM pg_trigger WHERE tgname IN (
    'trg_init_stats_on_repo_create',
    'trg_commit_changes',
    'trg_issue_changes',
    'trg_pr_changes',
    'trg_branch_changes'
  )) AND
  (SELECT COUNT(*) = 6 FROM pg_policies WHERE schemaname = 'public' AND policyname IN (
    'repo_access_policy',
    'repo_modify_policy',
    'repo_member_access_policy',
    'commit_access_policy',
    'issue_access_policy',
    'pull_request_access_policy'
  ));
" | grep -Fxq "t"

echo "Docker database schema is synchronized."
