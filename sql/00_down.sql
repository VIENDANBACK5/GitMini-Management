/*
  GITMINI MIGRATION DOWN
  Rollback toàn bộ schema, trigger, policy, index, role và extension của GitMini.

  Lưu ý:
  - Script này dùng cho môi trường development/test.
  - Không chạy trên database production nếu chưa backup dữ liệu.
*/

-- 1. Gỡ Row-Level Security policies trước khi xóa bảng
DROP POLICY IF EXISTS repo_access_policy ON repositories;
DROP POLICY IF EXISTS repo_modify_policy ON repositories;
DROP POLICY IF EXISTS repo_member_access_policy ON repo_members;
DROP POLICY IF EXISTS commit_access_policy ON commits;
DROP POLICY IF EXISTS issue_access_policy ON issues;
DROP POLICY IF EXISTS pull_request_access_policy ON pull_requests;

-- 2. Gỡ trigger trước khi xóa function
DROP TRIGGER IF EXISTS trg_init_stats_on_repo_create ON repositories;
DROP TRIGGER IF EXISTS trg_commit_changes ON commits;
DROP TRIGGER IF EXISTS trg_issue_changes ON issues;
DROP TRIGGER IF EXISTS trg_pr_changes ON pull_requests;
DROP TRIGGER IF EXISTS trg_branch_changes ON branches;

-- 3. Gỡ function trigger
DROP FUNCTION IF EXISTS fn_init_repo_stats() CASCADE;
DROP FUNCTION IF EXISTS fn_update_stats_on_commit() CASCADE;
DROP FUNCTION IF EXISTS fn_update_stats_on_issue() CASCADE;
DROP FUNCTION IF EXISTS fn_update_stats_on_pr() CASCADE;
DROP FUNCTION IF EXISTS fn_update_stats_on_branch() CASCADE;

-- 4. Gỡ bảng theo thứ tự phụ thuộc
DROP TABLE IF EXISTS backup_jobs CASCADE;
DROP TABLE IF EXISTS ci_runs CASCADE;
DROP TABLE IF EXISTS pull_request_comments CASCADE;
DROP TABLE IF EXISTS issue_comments CASCADE;
DROP TABLE IF EXISTS releases CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS repository_languages CASCADE;
DROP TABLE IF EXISTS commit_files CASCADE;
DROP TABLE IF EXISTS file_blobs CASCADE;
DROP TABLE IF EXISTS repo_stats CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS pull_request_reviews CASCADE;
DROP TABLE IF EXISTS pull_requests CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS commit_parents CASCADE;
DROP TABLE IF EXISTS repo_members CASCADE;
DROP TABLE IF EXISTS commits CASCADE;
DROP TABLE IF EXISTS repositories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 5. Gỡ role RBAC
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'git_reviewer') THEN
        DROP ROLE git_reviewer;
    END IF;
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'git_developer') THEN
        DROP ROLE git_developer;
    END IF;
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'git_admin') THEN
        DROP ROLE git_admin;
    END IF;
END $$;

-- 6. Gỡ extension nếu không còn object phụ thuộc
DROP EXTENSION IF EXISTS "uuid-ossp";
