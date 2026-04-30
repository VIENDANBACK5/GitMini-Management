/*
  GITMINI RBAC (Role-Based Access Control)
  Phân quyền truy cập dựa trên vai trò người dùng trong hệ thống.
*/

-- 1. Tạo các nhóm quyền nếu chưa tồn tại, không drop role để tránh mất phụ thuộc quyền trên DB hiện hữu
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'git_admin') THEN
        CREATE ROLE git_admin NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'git_developer') THEN
        CREATE ROLE git_developer NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'git_reviewer') THEN
        CREATE ROLE git_reviewer NOLOGIN;
    END IF;
END $$;

-- 2. Phân quyền cơ sở (Schema usage)
GRANT USAGE ON SCHEMA public TO git_admin, git_developer, git_reviewer;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO git_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO git_admin;

-- 3. Phân quyền cho Developer (Người phát triển)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO git_developer;
GRANT INSERT, UPDATE ON commits, commit_parents, issues, branches TO git_developer;
GRANT INSERT ON pull_requests TO git_developer;
REVOKE DELETE ON TABLE commits, repositories FROM git_developer;

-- 4. Phân quyền cho Reviewer (Người kiểm duyệt)
GRANT git_developer TO git_reviewer;
GRANT UPDATE ON pull_requests TO git_reviewer;

-- 5. Phân quyền cho các Sequence (nếu có dùng SERIAL sau này)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO git_developer, git_reviewer;

-- 6. Ghi chú về bảo mật:
-- Sau khi chạy script này, bạn có thể gán quyền cho một User cụ thể bằng lệnh:
-- GRANT git_developer TO your_database_user;
