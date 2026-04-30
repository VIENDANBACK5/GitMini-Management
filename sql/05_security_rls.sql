/*
  GITMINI ROW-LEVEL SECURITY (RLS)
  Đảm bảo người dùng chỉ truy cập được dữ liệu họ có quyền ở mức hàng (Row).
*/

-- 1. Kích hoạt RLS cho các bảng quan trọng
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;

-- 2. Chính sách cho bảng REPOSITORIES
-- Mọi người đều xem được Repo Public, nhưng Repo Private chỉ chủ sở hữu mới xem được.
CREATE POLICY repo_access_policy ON repositories
    FOR SELECT
    USING (
        is_private = FALSE 
        OR owner_id::text = current_setting('app.current_user_id', true)
    );

-- Quyền sửa/xóa Repo chỉ dành cho chủ sở hữu
CREATE POLICY repo_modify_policy ON repositories
    FOR ALL
    TO git_developer
    USING (owner_id::text = current_setting('app.current_user_id', true));

-- 3. Chính sách cho bảng COMMITS
-- Người dùng chỉ được xem commit của những repo họ có quyền xem.
CREATE POLICY commit_access_policy ON commits
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM repositories 
            WHERE repositories.id = commits.repo_id
        )
    );

-- 4. Chính sách cho bảng ISSUES
-- Tương tự: Chỉ xem issue của repo được quyền xem.
CREATE POLICY issue_access_policy ON issues
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM repositories 
            WHERE repositories.id = issues.repo_id
        )
    );

-- 5. Cho phép Role Admin vượt qua mọi chính sách RLS
ALTER TABLE repositories FORCE ROW LEVEL SECURITY;
-- Admin role (git_admin) thường được cấu hình để BYPASSRLS trong PostgreSQL 

/*
  HƯỚNG DẪN SỬ DỤNG TRONG ỨNG DỤNG (FASTAPI):
  Trước khi thực hiện truy vấn, ứng dụng cần thiết lập ID người dùng hiện tại:
  SET app.current_user_id = 'uuid-cua-nguoi-dung-dang-nhap';
  SELECT * FROM repositories;
*/
