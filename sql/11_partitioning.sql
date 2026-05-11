-- =============================================================
-- 11_partitioning.sql
-- Table Partitioning (Sharding Logic) cho bảng commits
-- Chia theo năm để demo Partition Pruning
-- =============================================================

-- ─── Bước 1: Tạo bảng commits_partitioned (song song với bảng cũ) ─────────────
-- Giữ nguyên bảng commits hiện tại để so sánh
-- commits_partitioned là bảng MỚI dùng kỹ thuật PARTITION BY RANGE

CREATE TABLE IF NOT EXISTS commits_partitioned (
    commit_hash   VARCHAR(40)  NOT NULL,
    repo_id       UUID         NOT NULL,
    author_id     UUID,
    message       TEXT         NOT NULL DEFAULT '',
    committed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (commit_hash, committed_at)   -- PK phải gồm partition key
) PARTITION BY RANGE (committed_at);

-- ─── Bước 2: Tạo các Partition (phân mảnh) theo từng năm ────────────────────

-- Phân mảnh cho dữ liệu năm 2024
CREATE TABLE IF NOT EXISTS commits_y2024
    PARTITION OF commits_partitioned
    FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');

-- Phân mảnh cho dữ liệu năm 2025
CREATE TABLE IF NOT EXISTS commits_y2025
    PARTITION OF commits_partitioned
    FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');

-- Phân mảnh cho dữ liệu năm 2026
CREATE TABLE IF NOT EXISTS commits_y2026
    PARTITION OF commits_partitioned
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- Phân mảnh mặc định: catch-all cho dữ liệu ngoài range trên
CREATE TABLE IF NOT EXISTS commits_default
    PARTITION OF commits_partitioned DEFAULT;

-- ─── Bước 3: Tạo Index trên từng partition ────────────────────────────────────
-- PostgreSQL tự động tạo index riêng cho mỗi partition khi tạo index trên bảng cha

CREATE INDEX IF NOT EXISTS idx_commits_part_repo_id
    ON commits_partitioned (repo_id);

CREATE INDEX IF NOT EXISTS idx_commits_part_committed_at
    ON commits_partitioned (committed_at DESC);

CREATE INDEX IF NOT EXISTS idx_commits_part_author
    ON commits_partitioned (author_id);

-- ─── Bước 4: Sao chép dữ liệu từ bảng cũ ────────────────────────────────────
-- Migrate dữ liệu có sẵn từ commits → commits_partitioned

INSERT INTO commits_partitioned (commit_hash, repo_id, author_id, message, committed_at)
SELECT
    commit_hash,
    repo_id,
    author_id,
    message,
    COALESCE(created_at, NOW())
FROM commits
ON CONFLICT DO NOTHING;

-- ─── Bước 5: Thêm dữ liệu test thêm cho từng năm ─────────────────────────────

DO $$
DECLARE
    test_repo_id UUID;
    test_user_id UUID;
BEGIN
    -- Lấy một repo và user có sẵn để test
    SELECT id INTO test_repo_id FROM repositories LIMIT 1;
    SELECT id INTO test_user_id FROM users LIMIT 1;

    IF test_repo_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Thêm 100 commit giả cho năm 2024
        INSERT INTO commits_partitioned (commit_hash, repo_id, author_id, message, committed_at)
        SELECT
            md5(random()::text || '2024' || generate_series::text),
            test_repo_id,
            test_user_id,
            'Test commit for partitioning demo (2024) #' || generate_series,
            '2024-01-01 00:00:00+00'::timestamptz + (generate_series * interval '1 day')
        FROM generate_series(1, 100)
        ON CONFLICT DO NOTHING;

        -- Thêm 100 commit giả cho năm 2025
        INSERT INTO commits_partitioned (commit_hash, repo_id, author_id, message, committed_at)
        SELECT
            md5(random()::text || '2025' || generate_series::text),
            test_repo_id,
            test_user_id,
            'Test commit for partitioning demo (2025) #' || generate_series,
            '2025-01-01 00:00:00+00'::timestamptz + (generate_series * interval '1 day')
        FROM generate_series(1, 100)
        ON CONFLICT DO NOTHING;

        -- Thêm 100 commit giả cho năm 2026
        INSERT INTO commits_partitioned (commit_hash, repo_id, author_id, message, committed_at)
        SELECT
            md5(random()::text || '2026' || generate_series::text),
            test_repo_id,
            test_user_id,
            'Test commit for partitioning demo (2026) #' || generate_series,
            '2026-01-01 00:00:00+00'::timestamptz + (generate_series * interval '1 day')
        FROM generate_series(1, 100)
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Inserted test data for partitioning demo.';
    ELSE
        RAISE NOTICE 'No repo or user found. Run seed_data.py first.';
    END IF;
END $$;

-- ─── Bước 6: Kiểm tra kết quả ─────────────────────────────────────────────────

-- Xem số lượng dữ liệu trong từng partition
SELECT
    inhrelid::regclass AS partition_name,
    pg_size_pretty(pg_relation_size(inhrelid)) AS size,
    (SELECT COUNT(*) FROM commits_partitioned
     WHERE tableoid = inhrelid) AS row_count
FROM pg_inherits
WHERE inhparent = 'commits_partitioned'::regclass
ORDER BY partition_name;
