VISIBLE_REPO_CONDITION = """
    (%s = 'admin' OR r.is_private = FALSE OR r.owner_id = %s OR current_member.user_id IS NOT NULL)
"""

REPO_CAPABILITY_FIELDS = """
    CASE
        WHEN %s = 'admin' THEN 'admin'
        WHEN r.owner_id = %s THEN 'owner'
        ELSE current_member.role
    END AS current_user_role,
    (%s = 'admin' OR r.owner_id = %s OR current_member.role IN ('owner', 'maintainer', 'developer', 'reviewer')) AS can_create_issue,
    (%s = 'admin' OR r.owner_id = %s OR current_member.role IN ('owner', 'maintainer', 'developer')) AS can_create_pull,
    (%s = 'admin' OR r.owner_id = %s OR current_member.role IN ('owner')) AS can_update,
    (%s = 'admin' OR r.owner_id = %s OR current_member.role IN ('owner', 'maintainer')) AS can_merge
"""

REPO_LIST = f"""
SELECT
    r.id,
    r.name,
    r.description,
    r.is_private,
    r.default_branch,
    r.stars_count,
    r.forks_count,
    r.created_at,
    r.updated_at,
    u.username AS owner,
    COALESCE(s.commit_count, 0) AS commit_count,
    COALESCE(s.branch_count, 0) AS branch_count,
    COALESCE(s.issue_open_count, 0) AS issue_open_count,
    COALESCE(s.issue_closed_count, 0) AS issue_closed_count,
    COALESCE(s.pr_open_count, 0) AS pr_open_count,
    COALESCE(s.pr_merged_count, 0) AS pr_merged_count,
    s.latest_commit_hash,
    s.latest_commit_time,
    s.latest_commit_msg,
{REPO_CAPABILITY_FIELDS}
FROM repositories r
JOIN users u ON u.id = r.owner_id
LEFT JOIN repo_stats s ON s.repo_id = r.id
LEFT JOIN repo_members current_member ON current_member.repo_id = r.id AND current_member.user_id = %s
WHERE {VISIBLE_REPO_CONDITION}
ORDER BY r.created_at DESC
LIMIT %s
"""

REPO_DETAIL = f"""
SELECT
    r.id,
    r.name,
    r.description,
    r.is_private,
    r.default_branch,
    r.stars_count,
    r.forks_count,
    r.created_at,
    r.updated_at,
    u.username AS owner,
    COALESCE(s.commit_count, 0) AS commit_count,
    COALESCE(s.branch_count, 0) AS branch_count,
    COALESCE(s.issue_open_count, 0) AS issue_open_count,
    COALESCE(s.issue_closed_count, 0) AS issue_closed_count,
    COALESCE(s.pr_open_count, 0) AS pr_open_count,
    COALESCE(s.pr_merged_count, 0) AS pr_merged_count,
    s.latest_commit_hash,
    s.latest_commit_time,
    s.latest_commit_msg,
{REPO_CAPABILITY_FIELDS}
FROM repositories r
JOIN users u ON u.id = r.owner_id
LEFT JOIN repo_stats s ON s.repo_id = r.id
LEFT JOIN repo_members current_member ON current_member.repo_id = r.id AND current_member.user_id = %s
WHERE r.name = %s
  AND {VISIBLE_REPO_CONDITION}
ORDER BY r.created_at DESC
LIMIT 1
"""

REPO_STATS = f"""
SELECT
    r.id AS repo_id,
    r.name AS repo_name,
    COALESCE(s.commit_count, 0) AS commit_count,
    COALESCE(s.branch_count, 0) AS branch_count,
    COALESCE(s.issue_open_count, 0) AS issue_open_count,
    COALESCE(s.issue_closed_count, 0) AS issue_closed_count,
    COALESCE(s.pr_open_count, 0) AS pr_open_count,
    COALESCE(s.pr_merged_count, 0) AS pr_merged_count,
    s.latest_commit_hash,
    s.latest_commit_time,
    s.latest_commit_msg,
    s.updated_at,
{REPO_CAPABILITY_FIELDS}
FROM repositories r
LEFT JOIN repo_stats s ON s.repo_id = r.id
LEFT JOIN repo_members current_member ON current_member.repo_id = r.id AND current_member.user_id = %s
WHERE r.name = %s
  AND {VISIBLE_REPO_CONDITION}
ORDER BY r.created_at DESC
LIMIT 1
"""

COMMIT_HISTORY = """
WITH RECURSIVE repo_target AS (
    SELECT r.id, r.default_branch
    FROM repositories r
    LEFT JOIN repo_members current_member ON current_member.repo_id = r.id AND current_member.user_id = %s
    WHERE r.name = %s
      AND (%s = 'admin' OR r.is_private = FALSE OR r.owner_id = %s OR current_member.user_id IS NOT NULL)
    ORDER BY r.created_at DESC
    LIMIT 1
), head AS (
    SELECT COALESCE(
        (
            SELECT b.head_commit_hash
            FROM branches b
            JOIN repo_target rt ON rt.id = b.repo_id
            WHERE b.name = COALESCE(%s, rt.default_branch)
            LIMIT 1
        ),
        (
            SELECT c.commit_hash
            FROM commits c
            JOIN repo_target rt ON rt.id = c.repo_id
            ORDER BY c.created_at DESC
            LIMIT 1
        )
    ) AS head_commit_hash
), commit_history AS (
    SELECT
        c.commit_hash,
        c.message,
        c.created_at,
        c.author_id,
        0 AS depth
    FROM commits c
    JOIN head h ON h.head_commit_hash = c.commit_hash

    UNION ALL

    SELECT
        parent.commit_hash,
        parent.message,
        parent.created_at,
        parent.author_id,
        ch.depth + 1 AS depth
    FROM commit_history ch
    JOIN commit_parents cp ON cp.commit_hash = ch.commit_hash
    JOIN commits parent ON parent.commit_hash = cp.parent_hash
    WHERE ch.depth < %s
)
SELECT
    ch.commit_hash AS hash,
    ch.message,
    ch.created_at AS date,
    u.username AS author,
    ch.depth
FROM commit_history ch
LEFT JOIN users u ON u.id = ch.author_id
ORDER BY ch.depth ASC, ch.created_at DESC
LIMIT %s
"""

COMMIT_HISTORY_FALLBACK = """
SELECT
    c.commit_hash AS hash,
    c.message,
    c.created_at AS date,
    u.username AS author,
    NULL::integer AS depth
FROM commits c
JOIN repositories r ON r.id = c.repo_id
LEFT JOIN users u ON u.id = c.author_id
LEFT JOIN repo_members current_member ON current_member.repo_id = r.id AND current_member.user_id = %s
WHERE r.name = %s
  AND (%s = 'admin' OR r.is_private = FALSE OR r.owner_id = %s OR current_member.user_id IS NOT NULL)
ORDER BY c.created_at DESC
LIMIT %s
"""

ISSUE_LIST = """
SELECT
    i.id,
    r.name AS repo,
    i.title,
    i.body,
    i.status,
    i.labels,
    author.username AS author,
    assignee.username AS assignee,
    i.created_at,
    i.updated_at,
    i.closed_at,
    CASE
        WHEN %s = 'admin' THEN 'admin'
        WHEN r.owner_id = %s THEN 'owner'
        ELSE current_member.role
    END AS current_user_role,
    (%s = 'admin' OR r.owner_id = %s OR current_member.role IN ('owner', 'maintainer', 'developer', 'reviewer')) AS can_update
FROM issues i
JOIN repositories r ON r.id = i.repo_id
LEFT JOIN repo_members current_member ON current_member.repo_id = r.id AND current_member.user_id = %s
LEFT JOIN users author ON author.id = i.author_id
LEFT JOIN users assignee ON assignee.id = i.assignee_id
WHERE (%s = 'admin' OR r.is_private = FALSE OR r.owner_id = %s OR current_member.user_id IS NOT NULL)
  AND (%s IS NULL OR i.status = %s)
  AND (%s IS NULL OR r.name = %s)
ORDER BY i.created_at DESC
LIMIT %s
"""

PULL_LIST = """
WITH pull_rows AS (
    SELECT
        pr.id,
        r.name AS repo,
        pr.title,
        pr.body,
        pr.status,
        pr.source_branch,
        pr.target_branch,
        pr.merge_commit_hash,
        u.username AS author,
        pr.created_at,
        pr.updated_at,
        pr.merged_at,
        pr.closed_at,
        CASE
            WHEN %s = 'admin' THEN 'admin'
            WHEN r.owner_id = %s THEN 'owner'
            ELSE current_member.role
        END AS current_user_role,
        (%s = 'admin' OR r.owner_id = %s OR current_member.role IN ('owner', 'maintainer', 'developer')) AS can_update,
        COALESCE(target_branch.is_protected, FALSE) AS target_branch_protected,
        COALESCE(review_stats.approval_count, 0) AS approval_count
    FROM pull_requests pr
    JOIN repositories r ON r.id = pr.repo_id
    LEFT JOIN repo_members current_member ON current_member.repo_id = r.id AND current_member.user_id = %s
    LEFT JOIN users u ON u.id = pr.author_id
    LEFT JOIN branches target_branch ON target_branch.repo_id = pr.repo_id AND target_branch.name = pr.target_branch
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS approval_count
        FROM pull_request_reviews review
        WHERE review.pull_request_id = pr.id
          AND review.status = 'approved'
          AND review.reviewer_id IS DISTINCT FROM pr.author_id
    ) review_stats ON TRUE
    WHERE (%s = 'admin' OR r.is_private = FALSE OR r.owner_id = %s OR current_member.user_id IS NOT NULL)
      AND (%s IS NULL OR pr.status = %s)
      AND (%s IS NULL OR r.name = %s)
)
SELECT
    *,
    approval_count > 0 AS is_approved,
    (
        current_user_role IN ('admin', 'owner', 'maintainer')
        AND status = 'open'
        AND (target_branch_protected = FALSE OR approval_count > 0)
    ) AS can_merge,
    CASE
        WHEN status <> 'open' THEN 'not_open'
        WHEN current_user_role NOT IN ('admin', 'owner', 'maintainer') OR current_user_role IS NULL THEN 'insufficient_role'
        WHEN target_branch_protected = TRUE AND approval_count < 1 THEN 'protected_branch_requires_approval'
        ELSE NULL
    END AS merge_blocked_reason
FROM pull_rows
ORDER BY created_at DESC
LIMIT %s
"""

REPO_SEARCH = """
WITH target_repo AS (
    SELECT r.id
    FROM repositories r
    LEFT JOIN repo_members current_member ON current_member.repo_id = r.id AND current_member.user_id = %s
    WHERE r.name = %s
      AND (%s = 'admin' OR r.is_private = FALSE OR r.owner_id = %s OR current_member.user_id IS NOT NULL)
    ORDER BY r.created_at DESC
    LIMIT 1
), issue_results AS (
    SELECT
        'issue' AS type,
        i.id::text AS id,
        NULL::text AS hash,
        i.title AS title,
        i.body AS body,
        NULL::text AS message,
        i.status AS status,
        r.name AS repo,
        i.created_at,
        ts_rank(i.search_vector, plainto_tsquery('english', %s)) AS rank
    FROM issues i
    JOIN target_repo tr ON tr.id = i.repo_id
    JOIN repositories r ON r.id = i.repo_id
    WHERE i.search_vector @@ plainto_tsquery('english', %s)
), commit_results AS (
    SELECT
        'commit' AS type,
        c.commit_hash AS id,
        c.commit_hash AS hash,
        c.message AS title,
        NULL::text AS body,
        c.message AS message,
        'commit' AS status,
        r.name AS repo,
        c.created_at,
        ts_rank(
            to_tsvector('english', c.message),
            plainto_tsquery('english', %s)
        ) AS rank
    FROM commits c
    JOIN target_repo tr ON tr.id = c.repo_id
    JOIN repositories r ON r.id = c.repo_id
    WHERE to_tsvector('english', c.message)
          @@ plainto_tsquery('english', %s)
)
SELECT *
FROM (
    SELECT * FROM issue_results
    UNION ALL
    SELECT * FROM commit_results
) results
ORDER BY rank DESC, created_at DESC
LIMIT %s
"""

ANALYTICS_OVERVIEW = """
WITH visible_repos AS (
    SELECT r.id
    FROM repositories r
    LEFT JOIN repo_members current_member ON current_member.repo_id = r.id AND current_member.user_id = %s
    WHERE %s = 'admin' OR r.is_private = FALSE OR r.owner_id = %s OR current_member.user_id IS NOT NULL
), totals AS (
    SELECT
        (SELECT COUNT(*) FROM visible_repos) AS repo_count,
        (SELECT COUNT(*) FROM commits c JOIN visible_repos vr ON vr.id = c.repo_id) AS commit_count,
        (SELECT COUNT(*) FROM issues i JOIN visible_repos vr ON vr.id = i.repo_id WHERE i.status = 'open') AS open_issue_count,
        (SELECT COUNT(*) FROM issues i JOIN visible_repos vr ON vr.id = i.repo_id WHERE i.status = 'closed') AS closed_issue_count,
        (SELECT COUNT(*) FROM pull_requests pr JOIN visible_repos vr ON vr.id = pr.repo_id WHERE pr.status = 'open') AS open_pr_count,
        (SELECT COUNT(*) FROM pull_requests pr JOIN visible_repos vr ON vr.id = pr.repo_id WHERE pr.status = 'merged') AS merged_pr_count
), top_repositories AS (
    SELECT COALESCE(json_agg(row_to_json(repo_row)), '[]'::json) AS items
    FROM (
        SELECT
            r.name,
            u.username AS owner,
            COALESCE(s.commit_count, 0) AS commit_count,
            COALESCE(s.issue_open_count, 0) AS open_issues,
            COALESCE(s.pr_open_count, 0) AS open_pull_requests,
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
        JOIN visible_repos vr ON vr.id = r.id
        JOIN users u ON u.id = r.owner_id
        LEFT JOIN repo_stats s ON s.repo_id = r.id
        ORDER BY COALESCE(s.commit_count, 0) DESC, r.created_at DESC
        LIMIT 5
    ) repo_row
), top_contributors AS (
    SELECT COALESCE(json_agg(row_to_json(contributor_row)), '[]'::json) AS items
    FROM (
        SELECT
            u.username,
            COUNT(c.commit_hash) AS commit_count,
            COUNT(DISTINCT c.repo_id) AS repositories_touched,
            MAX(c.created_at) AS latest_commit_time
        FROM commits c
        JOIN visible_repos vr ON vr.id = c.repo_id
        JOIN users u ON u.id = c.author_id
        GROUP BY u.id, u.username
        ORDER BY commit_count DESC, latest_commit_time DESC
        LIMIT 5
    ) contributor_row
), recent_activity AS (
    SELECT COALESCE(json_agg(row_to_json(activity_row)), '[]'::json) AS items
    FROM (
        SELECT *
        FROM (
            SELECT
                'commit' AS type,
                c.commit_hash AS id,
                r.name AS repo,
                c.message AS title,
                c.created_at AS created_at
            FROM commits c
            JOIN visible_repos vr ON vr.id = c.repo_id
            JOIN repositories r ON r.id = c.repo_id

            UNION ALL

            SELECT
                'issue' AS type,
                i.id::text AS id,
                r.name AS repo,
                i.title,
                i.created_at
            FROM issues i
            JOIN visible_repos vr ON vr.id = i.repo_id
            JOIN repositories r ON r.id = i.repo_id

            UNION ALL

            SELECT
                'pull_request' AS type,
                pr.id::text AS id,
                r.name AS repo,
                pr.title,
                pr.created_at
            FROM pull_requests pr
            JOIN visible_repos vr ON vr.id = pr.repo_id
            JOIN repositories r ON r.id = pr.repo_id
        ) activity
        ORDER BY created_at DESC
        LIMIT 10
    ) activity_row
)
SELECT
    totals.repo_count,
    totals.commit_count,
    totals.open_issue_count,
    totals.closed_issue_count,
    totals.open_pr_count,
    totals.merged_pr_count,
    top_repositories.items AS top_repositories,
    top_contributors.items AS top_contributors,
    recent_activity.items AS recent_activity
FROM totals, top_repositories, top_contributors, recent_activity
"""

GLOBAL_SEARCH = """
WITH visible_repos AS (
    SELECT r.id
    FROM repositories r
    LEFT JOIN repo_members current_member ON current_member.repo_id = r.id AND current_member.user_id = %s
    WHERE %s = 'admin' OR r.is_private = FALSE OR r.owner_id = %s OR current_member.user_id IS NOT NULL
), issue_results AS (
    SELECT
        'issue' AS type,
        i.id::text AS id,
        NULL::text AS hash,
        i.title AS title,
        i.body AS body,
        NULL::text AS message,
        i.status AS status,
        r.name AS repo,
        i.created_at,
        ts_rank(i.search_vector, plainto_tsquery('english', %s)) AS rank
    FROM issues i
    JOIN visible_repos vr ON vr.id = i.repo_id
    JOIN repositories r ON r.id = i.repo_id
    WHERE i.search_vector @@ plainto_tsquery('english', %s)
), commit_results AS (
    SELECT
        'commit' AS type,
        c.commit_hash AS id,
        c.commit_hash AS hash,
        c.message AS title,
        NULL::text AS body,
        c.message AS message,
        'commit' AS status,
        r.name AS repo,
        c.created_at,
        ts_rank(
            to_tsvector('english', c.message),
            plainto_tsquery('english', %s)
        ) AS rank
    FROM commits c
    JOIN visible_repos vr ON vr.id = c.repo_id
    JOIN repositories r ON r.id = c.repo_id
    WHERE to_tsvector('english', c.message)
          @@ plainto_tsquery('english', %s)
)
SELECT *
FROM (
    SELECT * FROM issue_results
    UNION ALL
    SELECT * FROM commit_results
) results
ORDER BY rank DESC, created_at DESC
LIMIT %s
"""
