-- =============================================================
-- demo_partitioning.sql
-- Script demo Partition Pruning cho buổi bảo vệ đồ án
-- Chạy: docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -f /scripts/demo/demo_partitioning.sql
-- =============================================================

\echo '╔══════════════════════════════════════════════════════╗'
\echo '║   GitMini — Demo Table Partitioning (Sharding)       ║'
\echo '╚══════════════════════════════════════════════════════╝'

-- ─── Bước 1: Xem cấu trúc phân mảnh ──────────────────────────────────────────
\echo ''
\echo '[1] Cấu trúc phân mảnh của commits_partitioned:'
SELECT
    inhrelid::regclass AS partition_name,
    pg_size_pretty(pg_relation_size(inhrelid)) AS size
FROM pg_inherits
WHERE inhparent = 'commits_partitioned'::regclass
ORDER BY partition_name;

-- ─── Bước 2: Đếm dữ liệu trong từng partition ─────────────────────────────────
\echo ''
\echo '[2] Số lượng dữ liệu trong từng partition (năm):'
SELECT
    'commits_y2024' AS partition,
    COUNT(*) AS row_count,
    MIN(committed_at)::date AS earliest,
    MAX(committed_at)::date AS latest
FROM commits_y2024
UNION ALL
SELECT 'commits_y2025', COUNT(*), MIN(committed_at)::date, MAX(committed_at)::date FROM commits_y2025
UNION ALL
SELECT 'commits_y2026', COUNT(*), MIN(committed_at)::date, MAX(committed_at)::date FROM commits_y2026
UNION ALL
SELECT 'commits_default', COUNT(*), MIN(committed_at)::date, MAX(committed_at)::date FROM commits_default;

-- ─── Bước 3: Demo Partition Pruning ───────────────────────────────────────────
\echo ''
\echo '[3] KHÔNG có Partition — EXPLAIN ANALYZE trên bảng gốc:'
\echo '    Query: SELECT COUNT(*) FROM commits WHERE created_at >= 2026-01-01'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*)
FROM commits
WHERE created_at >= '2026-01-01';

\echo ''
\echo '[4] CÓ Partition — EXPLAIN ANALYZE với Partition Pruning:'
\echo '    Query: SELECT COUNT(*) FROM commits_partitioned WHERE committed_at >= 2026-01-01'
\echo '    → PostgreSQL chỉ scan commits_y2026, bỏ qua 2024 và 2025!'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*)
FROM commits_partitioned
WHERE committed_at >= '2026-01-01';

-- ─── Bước 4: Demo tìm kiếm theo khoảng thời gian ─────────────────────────────
\echo ''
\echo '[5] Demo: Lấy commits tháng 3/2025 — Partition Pruning tự động:'
EXPLAIN (ANALYZE, FORMAT TEXT)
SELECT commit_hash, message, committed_at
FROM commits_partitioned
WHERE committed_at BETWEEN '2025-03-01' AND '2025-03-31'
ORDER BY committed_at DESC
LIMIT 10;

\echo ''
\echo '╔══════════════════════════════════════════════════════╗'
\echo '║   Kết luận: Partition Pruning giúp bỏ qua N-1       ║'
\echo '║   partition, tăng tốc query theo thời gian           ║'
\echo '╚══════════════════════════════════════════════════════╝'
