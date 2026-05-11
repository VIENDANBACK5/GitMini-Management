-- =============================================================
-- 10_replication_setup.sql
-- Thiết lập Streaming Replication: tạo user replicator
-- Chạy trên PRIMARY (master) một lần duy nhất
-- =============================================================

-- Tạo user dành riêng cho replication
-- REPLICATION privilege cho phép pg_basebackup và WAL streaming
CREATE USER replicator WITH REPLICATION LOGIN PASSWORD 'repl_gitmini_2024';

-- Kiểm tra kết quả
SELECT usename, userepl FROM pg_user WHERE usename = 'replicator';

-- Xem trạng thái WAL hiện tại (phải là 'replica' hoặc 'logical')
SHOW wal_level;
SHOW max_wal_senders;
SHOW max_replication_slots;
