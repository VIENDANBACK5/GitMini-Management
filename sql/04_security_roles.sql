/*
  GITMINI RBAC (Role-Based Access Control)
  Phân quyền truy cập dựa trên vai trò người dùng trong hệ thống.
*/

-- 1. Xóa các Role cũ nếu tồn tại (để dọn dẹp)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'git_admin') THEN
        DROP ROLE git_admin;
    END IF;
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'git_developer') THEN
        DROP ROLE git_developer;
    END IF;
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'git_reviewer') THEN
        DROP ROLE git_reviewer;
    END IF;
END $$;

-- 2. Tạo các Nhóm quyền (Roles)
CREATE ROLE git_admin NOLOGIN;
CREATE ROLE git_developer NOLOGIN;
CREATE ROLE git_reviewer NOLOGIN;

-- 3. Phân quyền cơ sở (Schema usage)
GRANT USAGE ON SCHEMA public TO git_admin, git_developer, git_reviewer;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO git_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO git_admin;

-- 4. Phân quyền cho Developer (Người phát triển)
-- Developer được quyền xem mọi thứ nhưng chỉ được thêm/sửa một số bảng nhất định
GRANT SELECT ON ALL TABLES IN SCHEMA public TO git_developer;
GRANT INSERT, UPDATE ON commits, commit_parents, issues, branches TO git_developer;
-- Developer không được phép xóa (DELETE) dữ liệu quan trọng như Commits hay Repos
REVOKE DELETE ON TABLE commits, repositories FROM git_developer;

-- 5. Phân quyền cho Reviewer (Người kiểm duyệt)
-- Reviewer có quyền như Developer nhưng được phép cập nhật trạng thái Pull Request
GRANT git_developer TO git_reviewer;
GRANT UPDATE ON pull_requests TO git_reviewer;

-- 6. Phân quyền cho các Sequence (nếu có dùng SERIAL sau này)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO git_developer, git_reviewer;

-- 7. Ghi chú về bảo mật:
-- Sau khi chạy script này, bạn có thể gán quyền cho một User cụ thể bằng lệnh:
-- GRANT git_developer TO your_database_user;
