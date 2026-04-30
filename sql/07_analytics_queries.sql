/*
  GITMINI ANALYTICS QUERIES
  Các truy vấn này chứng minh GitMini không chỉ lưu trữ repository/commit,
  mà còn khai thác dữ liệu quản lý mã nguồn bằng PostgreSQL.
*/

-- 1. Repository health overview: đọc nhanh từ repo_stats
SELECT
    r.name AS repository,
    u.username AS owner,
    COALESCE(s.commit_count, 0) AS commits,
    COALESCE(s.branch_count, 0) AS branches,
    COALESCE(s.issue_open_count, 0) AS open_issues,
    COALESCE(s.issue_closed_count, 0) AS closed_issues,
    COALESCE(s.pr_open_count, 0) AS open_pull_requests,
    COALESCE(s.pr_merged_count, 0) AS merged_pull_requests,
    s.latest_commit_time,
    GREATEST(
        0,
        100
        - COALESCE(s.issue_open_count, 0) * 2
        - COALESCE(s.pr_open_count, 0) * 3
        - CASE
            WHEN s.latest_commit_time IS NULL THEN 10
            WHEN s.latest_commit_time < NOW() - INTERVAL '30 days' THEN 10
            ELSE 0
          END
    ) AS health_score
FROM repositories r
JOIN users u ON u.id = r.owner_id
LEFT JOIN repo_stats s ON s.repo_id = r.id
ORDER BY health_score ASC, open_issues DESC, open_pull_requests DESC
LIMIT 20;

-- 2. Issue resolution analytics: tỷ lệ xử lý issue theo repository
SELECT
    r.name AS repository,
    COUNT(i.id) AS total_issues,
    COUNT(*) FILTER (WHERE i.status = 'open') AS open_issues,
    COUNT(*) FILTER (WHERE i.status = 'closed') AS closed_issues,
    ROUND(
        COUNT(*) FILTER (WHERE i.status = 'closed') * 100.0 / NULLIF(COUNT(i.id), 0),
        2
    ) AS close_rate_percent,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (i.closed_at - i.created_at)) / 3600)
            FILTER (WHERE i.closed_at IS NOT NULL),
        2
    ) AS avg_close_hours
FROM repositories r
LEFT JOIN issues i ON i.repo_id = r.id
GROUP BY r.id, r.name
ORDER BY open_issues DESC, total_issues DESC
LIMIT 20;

-- 3. Pull request throughput: tỷ lệ merge PR theo repository
SELECT
    r.name AS repository,
    COUNT(pr.id) AS total_pull_requests,
    COUNT(*) FILTER (WHERE pr.status = 'open') AS open_pull_requests,
    COUNT(*) FILTER (WHERE pr.status = 'closed') AS closed_pull_requests,
    COUNT(*) FILTER (WHERE pr.status = 'merged') AS merged_pull_requests,
    ROUND(
        COUNT(*) FILTER (WHERE pr.status = 'merged') * 100.0 / NULLIF(COUNT(pr.id), 0),
        2
    ) AS merge_rate_percent,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 3600)
            FILTER (WHERE pr.merged_at IS NOT NULL),
        2
    ) AS avg_merge_hours
FROM repositories r
LEFT JOIN pull_requests pr ON pr.repo_id = r.id
GROUP BY r.id, r.name
ORDER BY open_pull_requests DESC, total_pull_requests DESC
LIMIT 20;

-- 4. Contributor activity: ai đóng góp commit nhiều nhất
SELECT
    u.username AS contributor,
    COUNT(c.commit_hash) AS commit_count,
    COUNT(DISTINCT c.repo_id) AS repositories_touched,
    MAX(c.created_at) AS latest_commit_time
FROM commits c
JOIN users u ON u.id = c.author_id
GROUP BY u.id, u.username
ORDER BY commit_count DESC, latest_commit_time DESC
LIMIT 20;

-- 5. Recent activity: luồng hoạt động gần nhất trên commit/issue/PR
SELECT *
FROM (
    SELECT
        'commit' AS activity_type,
        c.commit_hash AS object_id,
        r.name AS repository,
        c.message AS title,
        c.created_at AS activity_time
    FROM commits c
    JOIN repositories r ON r.id = c.repo_id

    UNION ALL

    SELECT
        'issue' AS activity_type,
        i.id::text AS object_id,
        r.name AS repository,
        i.title,
        i.created_at AS activity_time
    FROM issues i
    JOIN repositories r ON r.id = i.repo_id

    UNION ALL

    SELECT
        'pull_request' AS activity_type,
        pr.id::text AS object_id,
        r.name AS repository,
        pr.title,
        pr.created_at AS activity_time
    FROM pull_requests pr
    JOIN repositories r ON r.id = pr.repo_id
) activity
ORDER BY activity_time DESC
LIMIT 20;

-- 6. Commit graph depth: minh chứng commit history là DAG có thể duyệt bằng Recursive CTE
WITH RECURSIVE default_heads AS (
    SELECT
        r.id AS repo_id,
        r.name AS repository,
        b.head_commit_hash
    FROM repositories r
    JOIN branches b ON b.repo_id = r.id AND b.name = r.default_branch
    WHERE b.head_commit_hash IS NOT NULL
), commit_walk AS (
    SELECT
        dh.repo_id,
        dh.repository,
        dh.head_commit_hash AS commit_hash,
        0 AS depth
    FROM default_heads dh

    UNION ALL

    SELECT
        cw.repo_id,
        cw.repository,
        cp.parent_hash AS commit_hash,
        cw.depth + 1 AS depth
    FROM commit_walk cw
    JOIN commit_parents cp ON cp.commit_hash = cw.commit_hash
    WHERE cw.depth < 100
)
SELECT
    repository,
    MAX(depth) AS graph_depth,
    COUNT(DISTINCT commit_hash) AS commits_reached_from_default_branch
FROM commit_walk
GROUP BY repository
ORDER BY graph_depth DESC, commits_reached_from_default_branch DESC
LIMIT 20;
