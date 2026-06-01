/*
  GITMINI BENCHMARK QUERIES
  Các truy vấn dùng để chạy EXPLAIN ANALYZE và điền kết quả vào:
  docs/05_minh_chung_toi_uu_explain.md

  Cách dùng:
  1. Chạy seed dữ liệu trước.
  2. Lấy một repo_id và head_commit_hash thực tế từ database.
  3. Thay các placeholder trong script này.
*/

-- 0. Lấy dữ liệu mẫu để thay placeholder
SELECT id AS sample_repo_id, name
FROM repositories
ORDER BY created_at DESC
LIMIT 5;

SELECT commit_hash AS sample_head_commit_hash, repo_id, message, created_at
FROM commits
ORDER BY created_at DESC
LIMIT 5;

-- 1. Commit history theo thời gian: kiểm tra idx_commits_repo_time
EXPLAIN ANALYZE
SELECT commit_hash, message, created_at
FROM commits
WHERE repo_id = '<repo_id_can_test>'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Full-text search issue: kiểm tra idx_issues_search
EXPLAIN ANALYZE
SELECT id, title, status, created_at
FROM issues
WHERE to_tsvector('english', title || ' ' || body)
      @@ plainto_tsquery('english', 'login bug')
ORDER BY created_at DESC
LIMIT 20;

-- 3. Full-text search commit message: kiểm tra idx_commits_message_search
EXPLAIN ANALYZE
SELECT commit_hash, message, created_at
FROM commits
WHERE to_tsvector('english', message)
      @@ plainto_tsquery('english', 'fix login')
ORDER BY created_at DESC
LIMIT 20;

-- 4. Dashboard dùng repo_stats: kiểm tra đọc thống kê đã phi chuẩn hóa
EXPLAIN ANALYZE
SELECT commit_count,
       branch_count,
       issue_open_count,
       issue_closed_count,
       pr_open_count,
       pr_merged_count,
       latest_commit_hash,
       latest_commit_time
FROM repo_stats
WHERE repo_id = '<repo_id_can_test>';

-- 5. Dashboard tính trực tiếp: so sánh với repo_stats
EXPLAIN ANALYZE
SELECT
    (SELECT COUNT(*) FROM commits WHERE repo_id = '<repo_id_can_test>') AS commit_count,
    (SELECT COUNT(*) FROM branches WHERE repo_id = '<repo_id_can_test>') AS branch_count,
    (SELECT COUNT(*) FROM issues WHERE repo_id = '<repo_id_can_test>' AND status = 'open') AS issue_open_count,
    (SELECT COUNT(*) FROM issues WHERE repo_id = '<repo_id_can_test>' AND status = 'closed') AS issue_closed_count,
    (SELECT COUNT(*) FROM pull_requests WHERE repo_id = '<repo_id_can_test>' AND status = 'open') AS pr_open_count,
    (SELECT COUNT(*) FROM pull_requests WHERE repo_id = '<repo_id_can_test>' AND status = 'merged') AS pr_merged_count;

-- 6. Recursive CTE: duyệt commit graph dạng DAG từ HEAD về parent
EXPLAIN ANALYZE
WITH RECURSIVE commit_history AS (
    SELECT c.commit_hash,
           c.message,
           c.created_at,
           0 AS depth
    FROM commits c
    WHERE c.commit_hash = '<head_commit_hash_can_test>'

    UNION ALL

    SELECT parent.commit_hash,
           parent.message,
           parent.created_at,
           ch.depth + 1
    FROM commit_history ch
    JOIN commit_parents cp ON cp.commit_hash = ch.commit_hash
    JOIN commits parent ON parent.commit_hash = cp.parent_hash
    WHERE ch.depth < 100
)
SELECT commit_hash, message, created_at, depth
FROM commit_history
ORDER BY depth
LIMIT 100;

-- 7. Lọc issue theo repo + status: kiểm tra idx_issues_repo_status
EXPLAIN ANALYZE
SELECT id, title, status, created_at
FROM issues
WHERE repo_id = '<repo_id_can_test>'
  AND status = 'open'
ORDER BY created_at DESC
LIMIT 20;

-- 8. Lọc pull request theo repo + status: kiểm tra idx_pr_repo_status
EXPLAIN ANALYZE
SELECT id, title, status, source_branch, target_branch, created_at
FROM pull_requests
WHERE repo_id = '<repo_id_can_test>'
  AND status = 'open'
ORDER BY created_at DESC
LIMIT 20;

/* ================================================================
   SECTION B — Tự chứa (tự lấy repo_id/commit_hash từ DB)
   Dùng để chụp kết quả EXPLAIN ANALYZE đưa vào báo cáo.
   Chạy sau khi đã seed dữ liệu, không cần thay placeholder.
   ================================================================ */

-- Mục đích: Minh chứng Composite Index (repo_id, created_at DESC) trên commits
-- Index sử dụng: idx_commits_repo_time
-- Kết quả mong đợi: Index Scan trên idx_commits_repo_time, cost thấp, rows=10
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT commit_hash, message, created_at
FROM commits
WHERE repo_id = (SELECT id FROM repositories ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;

-- Mục đích: Minh chứng GIN Index trên generated column search_vector cho full-text search
-- Index sử dụng: idx_issues_search (GIN trên search_vector)
-- Kết quả mong đợi: Bitmap Index Scan trên idx_issues_search, không có Seq Scan
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title
FROM issues
WHERE search_vector @@ to_tsquery('english', 'login | error')
LIMIT 10;

-- Mục đích: Minh chứng Recursive CTE duyệt DAG lịch sử commit từ HEAD
-- Index sử dụng: idx_parents_commit trên commit_parents(commit_hash)
-- Kết quả mong đợi: CTE Scan với WorkTable Scan, depth tối đa 100
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
WITH RECURSIVE commit_history AS (
    SELECT commit_hash, parent_hash, 1 AS depth
    FROM commit_parents
    WHERE commit_hash = (
        SELECT head_commit_hash
        FROM branches
        WHERE name = 'main'
          AND head_commit_hash IS NOT NULL
        LIMIT 1
    )
    UNION ALL
    SELECT cp.commit_hash, cp.parent_hash, ch.depth + 1
    FROM commit_parents cp
    JOIN commit_history ch ON cp.commit_hash = ch.parent_hash
    WHERE ch.depth < 100
)
SELECT * FROM commit_history LIMIT 50;

-- Mục đích: Minh chứng hiệu quả bảng phi chuẩn hóa repo_stats so với tính trực tiếp
-- Index sử dụng: PK lookup trên repo_stats(repo_id) — Index Scan tức thì
-- Kết quả mong đợi: Index Scan cost ~0.15..8, so sánh với Query 5 (nhiều Seq Scan)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT commit_count, issue_open_count, pr_open_count,
       latest_commit_hash, latest_commit_time
FROM repo_stats
WHERE repo_id = (SELECT id FROM repositories ORDER BY created_at DESC LIMIT 1);
