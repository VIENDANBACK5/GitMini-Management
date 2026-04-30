/*
  GITMINI ROW-LEVEL SECURITY (RLS)
  Minh họa lớp bảo vệ ở PostgreSQL: private repository chỉ admin, owner hoặc member xem được.
*/

-- 1. Kích hoạt RLS cho các bảng quan trọng
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;

-- 2. Chính sách cho bảng REPOSITORIES
DROP POLICY IF EXISTS repo_access_policy ON repositories;
CREATE POLICY repo_access_policy ON repositories
    FOR SELECT
    USING (
        current_setting('app.current_username', true) = 'admin'
        OR is_private = FALSE
        OR owner_id::text = current_setting('app.current_user_id', true)
        OR EXISTS (
            SELECT 1
            FROM repo_members rm
            WHERE rm.repo_id = repositories.id
              AND rm.user_id::text = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS repo_modify_policy ON repositories;
CREATE POLICY repo_modify_policy ON repositories
    FOR ALL
    TO git_developer
    USING (
        current_setting('app.current_username', true) = 'admin'
        OR owner_id::text = current_setting('app.current_user_id', true)
        OR EXISTS (
            SELECT 1
            FROM repo_members rm
            WHERE rm.repo_id = repositories.id
              AND rm.user_id::text = current_setting('app.current_user_id', true)
              AND rm.role IN ('owner', 'maintainer')
        )
    );

-- 3. Chính sách cho bảng REPO_MEMBERS
DROP POLICY IF EXISTS repo_member_access_policy ON repo_members;
CREATE POLICY repo_member_access_policy ON repo_members
    FOR SELECT
    USING (
        current_setting('app.current_username', true) = 'admin'
        OR user_id::text = current_setting('app.current_user_id', true)
        OR EXISTS (
            SELECT 1
            FROM repositories r
            WHERE r.id = repo_members.repo_id
              AND r.owner_id::text = current_setting('app.current_user_id', true)
        )
    );

-- 4. Chính sách cho bảng COMMITS
DROP POLICY IF EXISTS commit_access_policy ON commits;
CREATE POLICY commit_access_policy ON commits
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM repositories r
            WHERE r.id = commits.repo_id
        )
    );

-- 5. Chính sách cho bảng ISSUES
DROP POLICY IF EXISTS issue_access_policy ON issues;
CREATE POLICY issue_access_policy ON issues
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM repositories r
            WHERE r.id = issues.repo_id
        )
    );

-- 6. Chính sách cho bảng PULL_REQUESTS
DROP POLICY IF EXISTS pull_request_access_policy ON pull_requests;
CREATE POLICY pull_request_access_policy ON pull_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM repositories r
            WHERE r.id = pull_requests.repo_id
        )
    );

ALTER TABLE repositories FORCE ROW LEVEL SECURITY;

/*
  HƯỚNG DẪN SỬ DỤNG TRONG ỨNG DỤNG (FASTAPI):
  SET app.current_user_id = 'uuid-cua-nguoi-dung-dang-nhap';
  SET app.current_username = 'alice';
  SELECT * FROM repositories;
*/
