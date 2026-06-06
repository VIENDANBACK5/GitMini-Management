/*
  KỊCH BẢN KIỂM TRA PHỤC HỒI DỮ LIỆU (RESTORE TEST)
  Sử dụng để kiểm tra tính toàn vẹn của bản sao lưu.
*/

-- 1. Xóa Database test cũ (nếu có)
-- DROP DATABASE IF EXISTS gitmini_restore_test;

-- 2. Tạo Database mới để test phục hồi
-- CREATE DATABASE gitmini_restore_test;

-- 3. Lệnh phục hồi từ file .dump (Chạy trên Terminal)
/*
  pg_restore -U your_user -d gitmini_restore_test backups/gitmini_xxxxxxxx.dump
*/

-- 4. Các câu lệnh SQL kiểm tra sau khi phục hồi
-- Kiểm tra số lượng bảng (phải là 8 bảng chính + bảng stats)
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Kiểm tra tính toàn vẹn của dữ liệu Commit (Recursive CTE)
-- Lấy lịch sử 10 commit gần nhất của một repo
WITH RECURSIVE commit_history AS (
    SELECT commit_hash, message, created_at
    FROM commits
    WHERE commit_hash = 'sha1-cua-commit-moi-nhat'
    
    UNION ALL
    
    SELECT c.commit_hash, c.message, c.created_at
    FROM commits c
    JOIN commit_parents cp ON c.commit_hash = cp.parent_hash
    JOIN commit_history ch ON ch.commit_hash = cp.commit_hash
)
SELECT * FROM commit_history LIMIT 10;

-- Kiểm tra Logic Thống kê
SELECT * FROM repo_stats LIMIT 5;
