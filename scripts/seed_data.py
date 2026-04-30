import argparse
import os
import random
import time
import uuid
from datetime import datetime, timedelta

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

PROFILES = {
    "demo": {
        "users": 100,
        "repos": 20,
        "commits": 1_000,
        "issues": 300,
        "pull_requests": 80,
        "batch_size": 1_000,
    },
    "benchmark": {
        "users": 1_000,
        "repos": 1_000,
        "commits": 100_000,
        "issues": 10_000,
        "pull_requests": 2_000,
        "batch_size": 5_000,
    },
}

ISSUE_KEYWORDS = [
    "login bug",
    "search error",
    "database timeout",
    "permission denied",
    "merge conflict",
    "dashboard slow",
    "backup restore",
    "full text search",
]

COMMIT_KEYWORDS = [
    "fix login flow",
    "optimize search query",
    "update dashboard stats",
    "add backup script",
    "resolve merge conflict",
    "improve issue filter",
    "refactor repository view",
    "tune database index",
]

BRANCH_NAMES = ["main", "develop", "feature/login", "feature/search", "bugfix/dashboard"]
FILE_PATHS = [
    "README.md",
    "src/main.py",
    "src/auth.py",
    "src/repository.py",
    "frontend/App.jsx",
    "sql/schema.sql",
    "docs/design.md",
]
LANGUAGES = [("SQL", 45.0), ("Python", 35.0), ("JavaScript", 20.0)]
CI_STATUSES = ["success", "success", "failed", "running", "queued"]
DEMO_USERS = [
    ("admin", "admin@gitmini.local", "GitMini Admin", "Quản trị viên demo xem toàn hệ thống"),
    ("alice", "alice@gitmini.local", "Alice Owner", "Owner demo có toàn quyền repository"),
    ("bob", "bob@gitmini.local", "Bob Maintainer", "Maintainer demo xử lý issue và pull request"),
    ("carol", "carol@gitmini.local", "Carol Developer", "Developer demo tạo issue và pull request"),
    ("david", "david@gitmini.local", "David Viewer", "Viewer demo chỉ xem repository được cấp quyền"),
]
DEMO_PASSWORD_HASH = "demo-password:gitmini_password"


def get_connection():
    if not DB_URL:
        raise RuntimeError("DATABASE_URL is not set. Create .env from .env.example first.")
    return psycopg2.connect(DB_URL)


def random_hash():
    return f"{random.getrandbits(160):040x}"


def batched_insert(cur, sql, rows, batch_size):
    if rows:
        execute_values(cur, sql, rows, page_size=batch_size)


def seed_users(cur, count, batch_size):
    rows = []
    usernames = []

    for username, email, full_name, bio in DEMO_USERS:
        usernames.append(username)
        rows.append((str(uuid.uuid4()), username, email, DEMO_PASSWORD_HASH, full_name, bio))

    generated_count = max(0, count - len(DEMO_USERS))
    for i in range(generated_count):
        username = f"user_{i}"
        usernames.append(username)
        rows.append(
            (
                str(uuid.uuid4()),
                username,
                f"user_{i}@example.com",
                "hashed_password",
                f"Full Name {i}",
                f"GitMini demo user {i}",
            )
        )

    batched_insert(
        cur,
        """
        INSERT INTO users (id, username, email, password_hash, full_name, bio)
        VALUES %s
        ON CONFLICT (username) DO UPDATE SET
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            bio = EXCLUDED.bio
        """,
        rows,
        batch_size,
    )

    cur.execute("SELECT id, username FROM users WHERE username = ANY(%s)", (usernames,))
    users_by_username = {row[1]: str(row[0]) for row in cur.fetchall()}
    user_ids = [users_by_username[username] for username in usernames if username in users_by_username]
    return user_ids, users_by_username


def seed_repositories(cur, count, user_ids, users_by_username, batch_size):
    rows = []
    repo_names = []
    alice_id = users_by_username.get("alice", user_ids[0])

    for i in range(count):
        repo_name = f"project_{i}"
        repo_names.append(repo_name)
        rows.append(
            (
                str(uuid.uuid4()),
                repo_name,
                f"GitMini repository demo project {i}",
                alice_id if i < 4 else user_ids[i % len(user_ids)],
                i in {1, 3} or (i >= 4 and i % 4 == 0),
            )
        )

    batched_insert(
        cur,
        """
        INSERT INTO repositories (id, name, description, owner_id, is_private)
        VALUES %s
        ON CONFLICT (owner_id, name) DO UPDATE SET
            description = EXCLUDED.description,
            is_private = EXCLUDED.is_private
        """,
        rows,
        batch_size,
    )

    cur.execute("SELECT id, name FROM repositories WHERE name = ANY(%s) ORDER BY name", (repo_names,))
    repos_by_name = {row[1]: str(row[0]) for row in cur.fetchall()}
    return [repos_by_name[name] for name in repo_names if name in repos_by_name]


def seed_repo_members(cur, repo_ids, user_ids, users_by_username, batch_size):
    rows = []
    role_cycle = ["maintainer", "developer", "reviewer", "viewer"]

    for index, repo_id in enumerate(repo_ids):
        owner_id = users_by_username.get("alice") if index < 4 else user_ids[index % len(user_ids)]
        rows.append((repo_id, owner_id, "owner"))

        if index < 4:
            rows.extend(
                [
                    (repo_id, users_by_username["bob"], "maintainer"),
                    (repo_id, users_by_username["carol"], "developer"),
                    (repo_id, users_by_username["david"], "viewer"),
                ]
            )
        else:
            for offset, role in enumerate(role_cycle, start=1):
                member_id = user_ids[(index + offset) % len(user_ids)]
                if member_id != owner_id:
                    rows.append((repo_id, member_id, role))

    batched_insert(
        cur,
        """
        INSERT INTO repo_members (repo_id, user_id, role)
        VALUES %s
        ON CONFLICT (repo_id, user_id) DO UPDATE SET role = EXCLUDED.role
        """,
        rows,
        batch_size,
    )


def seed_commits(cur, count, repo_ids, user_ids, batch_size):
    rows = []
    commits_by_repo = {repo_id: [] for repo_id in repo_ids}
    base_time = datetime.now()

    for i in range(count):
        repo_id = repo_ids[i % len(repo_ids)]
        commit_hash = random_hash()
        commits_by_repo[repo_id].append(commit_hash)
        rows.append(
            (
                commit_hash,
                repo_id,
                user_ids[i % len(user_ids)],
                f"{COMMIT_KEYWORDS[i % len(COMMIT_KEYWORDS)]} #{i}",
                base_time - timedelta(minutes=i),
            )
        )

        if len(rows) >= batch_size:
            batched_insert(
                cur,
                """
                INSERT INTO commits (commit_hash, repo_id, author_id, message, created_at)
                VALUES %s
                """,
                rows,
                batch_size,
            )
            rows = []
            print(f"Đã nạp {i + 1:,} commits...")

    batched_insert(
        cur,
        """
        INSERT INTO commits (commit_hash, repo_id, author_id, message, created_at)
        VALUES %s
        """,
        rows,
        batch_size,
    )
    return commits_by_repo


def seed_commit_parents(cur, commits_by_repo, batch_size):
    rows = []
    for commit_hashes in commits_by_repo.values():
        for i in range(1, len(commit_hashes)):
            rows.append((commit_hashes[i - 1], commit_hashes[i], 0))
            if len(rows) >= batch_size:
                batched_insert(
                    cur,
                    """
                    INSERT INTO commit_parents (commit_hash, parent_hash, ordinal)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    rows,
                    batch_size,
                )
                rows = []

    batched_insert(
        cur,
        """
        INSERT INTO commit_parents (commit_hash, parent_hash, ordinal)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        rows,
        batch_size,
    )


def seed_branches(cur, repo_ids, commits_by_repo, batch_size):
    rows = []
    for repo_id in repo_ids:
        commit_hashes = commits_by_repo.get(repo_id, [])
        if not commit_hashes:
            continue

        head = commit_hashes[-1]
        for name in BRANCH_NAMES:
            branch_head = head if name == "main" else random.choice(commit_hashes)
            rows.append((str(uuid.uuid4()), repo_id, name, branch_head, name == "main"))

    batched_insert(
        cur,
        """
        INSERT INTO branches (id, repo_id, name, head_commit_hash, is_protected)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        rows,
        batch_size,
    )


def seed_issues(cur, count, repo_ids, user_ids, batch_size):
    rows = []
    issue_ids = []
    for i in range(count):
        issue_id = str(uuid.uuid4())
        issue_ids.append(issue_id)
        keyword = ISSUE_KEYWORDS[i % len(ISSUE_KEYWORDS)]
        status = "closed" if i % 4 == 0 else "open"
        created_at = datetime.now() - timedelta(hours=i)
        closed_at = created_at + timedelta(hours=4) if status == "closed" else None
        rows.append(
            (
                issue_id,
                repo_ids[i % len(repo_ids)],
                user_ids[i % len(user_ids)],
                user_ids[(i + 7) % len(user_ids)],
                f"{keyword.title()} #{i}",
                f"Issue body contains keyword: {keyword}. This record is used for full text search benchmark.",
                status,
                [keyword.split()[0], "benchmark" if i % 10 == 0 else "demo"],
                created_at,
                closed_at,
            )
        )

        if len(rows) >= batch_size:
            batched_insert(
                cur,
                """
                INSERT INTO issues (id, repo_id, author_id, assignee_id, title, body, status, labels, created_at, closed_at)
                VALUES %s
                """,
                rows,
                batch_size,
            )
            rows = []

    batched_insert(
        cur,
        """
        INSERT INTO issues (id, repo_id, author_id, assignee_id, title, body, status, labels, created_at, closed_at)
        VALUES %s
        """,
        rows,
        batch_size,
    )
    return issue_ids


def seed_pull_requests(cur, count, repo_ids, user_ids, commits_by_repo, batch_size):
    rows = []
    pull_request_ids = []
    statuses = ["open", "open", "closed", "merged"]
    source_branches = ["develop", "feature/login", "feature/search", "bugfix/dashboard"]

    for i in range(count):
        pull_request_id = str(uuid.uuid4())
        pull_request_ids.append(pull_request_id)
        repo_id = repo_ids[i % len(repo_ids)]
        status = statuses[i % len(statuses)]
        commit_hashes = commits_by_repo.get(repo_id, [])
        merge_commit_hash = random.choice(commit_hashes) if status == "merged" and commit_hashes else None
        created_at = datetime.now() - timedelta(hours=i * 2)
        merged_at = created_at + timedelta(hours=2) if status == "merged" else None
        closed_at = created_at + timedelta(hours=3) if status == "closed" else None

        rows.append(
            (
                pull_request_id,
                repo_id,
                user_ids[i % len(user_ids)],
                f"Pull request {i}: {COMMIT_KEYWORDS[i % len(COMMIT_KEYWORDS)]}",
                "Pull request generated by GitMini seed script.",
                status,
                source_branches[i % len(source_branches)],
                "main",
                merge_commit_hash,
                created_at,
                merged_at,
                closed_at,
            )
        )

        if len(rows) >= batch_size:
            batched_insert(
                cur,
                """
                INSERT INTO pull_requests (id, repo_id, author_id, title, body, status, source_branch, target_branch, merge_commit_hash, created_at, merged_at, closed_at)
                VALUES %s
                """,
                rows,
                batch_size,
            )
            rows = []

    batched_insert(
        cur,
        """
        INSERT INTO pull_requests (id, repo_id, author_id, title, body, status, source_branch, target_branch, merge_commit_hash, created_at, merged_at, closed_at)
        VALUES %s
        """,
        rows,
        batch_size,
    )
    return pull_request_ids


def seed_extended_tables(cur, repo_ids, user_ids, commits_by_repo, issue_ids, pull_request_ids, batch_size):
    all_commits = [commit_hash for hashes in commits_by_repo.values() for commit_hash in hashes]
    if not all_commits:
        return

    blob_rows = []
    blob_ids = []
    for i, path in enumerate(FILE_PATHS):
        blob_id = str(uuid.uuid4())
        blob_ids.append(blob_id)
        blob_rows.append((blob_id, random_hash(), f"Sample content for {path}", 100 + i * 25, "text/plain"))

    batched_insert(
        cur,
        """
        INSERT INTO file_blobs (id, blob_hash, content, size_bytes, mime_type)
        VALUES %s
        ON CONFLICT (blob_hash) DO NOTHING
        """,
        blob_rows,
        batch_size,
    )

    commit_file_rows = []
    for i, commit_hash in enumerate(all_commits[: max(len(repo_ids) * 5, 1)]):
        commit_file_rows.append(
            (
                commit_hash,
                FILE_PATHS[i % len(FILE_PATHS)],
                blob_ids[i % len(blob_ids)],
                ["added", "modified", "deleted", "renamed"][i % 4],
                i % 30,
                i % 12,
            )
        )

    batched_insert(
        cur,
        """
        INSERT INTO commit_files (commit_hash, file_path, blob_id, change_type, additions, deletions)
        VALUES %s
        ON CONFLICT (commit_hash, file_path) DO UPDATE SET
            blob_id = EXCLUDED.blob_id,
            change_type = EXCLUDED.change_type,
            additions = EXCLUDED.additions,
            deletions = EXCLUDED.deletions
        """,
        commit_file_rows,
        batch_size,
    )

    language_rows = []
    for repo_id in repo_ids:
        for language, percentage in LANGUAGES:
            language_rows.append((repo_id, language, int(50_000 * percentage), percentage))

    batched_insert(
        cur,
        """
        INSERT INTO repository_languages (repo_id, language, bytes_count, percentage)
        VALUES %s
        ON CONFLICT (repo_id, language) DO UPDATE SET
            bytes_count = EXCLUDED.bytes_count,
            percentage = EXCLUDED.percentage
        """,
        language_rows,
        batch_size,
    )

    tag_rows = []
    tag_ids = []
    for i, repo_id in enumerate(repo_ids):
        tag_id = str(uuid.uuid4())
        tag_ids.append(tag_id)
        tag_rows.append((tag_id, repo_id, f"v1.{i}.0", commits_by_repo[repo_id][-1], user_ids[i % len(user_ids)]))

    batched_insert(
        cur,
        """
        INSERT INTO tags (id, repo_id, name, target_commit_hash, created_by)
        VALUES %s
        ON CONFLICT (repo_id, name) DO UPDATE SET
            target_commit_hash = EXCLUDED.target_commit_hash,
            created_by = EXCLUDED.created_by
        """,
        tag_rows,
        batch_size,
    )

    cur.execute(
        "SELECT repo_id, name, id FROM tags WHERE repo_id = ANY(%s::uuid[])",
        (repo_ids,),
    )
    tag_ids_by_repo_name = {(str(row[0]), row[1]): str(row[2]) for row in cur.fetchall()}

    release_rows = []
    for i, repo_id in enumerate(repo_ids):
        release_rows.append(
            (
                str(uuid.uuid4()),
                repo_id,
                tag_ids_by_repo_name[(repo_id, f"v1.{i}.0")],
                f"GitMini release v1.{i}.0",
                "Release record generated by GitMini seed script.",
                i % 3 == 0,
                user_ids[i % len(user_ids)],
            )
        )

    batched_insert(
        cur,
        """
        INSERT INTO releases (id, repo_id, tag_id, title, description, is_prerelease, published_by)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        release_rows,
        batch_size,
    )

    issue_comment_rows = []
    for i, issue_id in enumerate(issue_ids[: max(len(repo_ids) * 3, 1)]):
        issue_comment_rows.append((str(uuid.uuid4()), issue_id, user_ids[i % len(user_ids)], f"Issue comment {i} for GitMini demo."))

    batched_insert(
        cur,
        """
        INSERT INTO issue_comments (id, issue_id, author_id, body)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        issue_comment_rows,
        batch_size,
    )

    pr_comment_rows = []
    for i, pull_request_id in enumerate(pull_request_ids[: max(len(repo_ids) * 2, 1)]):
        pr_comment_rows.append(
            (
                str(uuid.uuid4()),
                pull_request_id,
                user_ids[i % len(user_ids)],
                f"Pull request review comment {i}.",
                FILE_PATHS[i % len(FILE_PATHS)],
                (i % 80) + 1,
            )
        )

    batched_insert(
        cur,
        """
        INSERT INTO pull_request_comments (id, pull_request_id, author_id, body, file_path, line_number)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        pr_comment_rows,
        batch_size,
    )

    ci_rows = []
    for i, commit_hash in enumerate(all_commits[: max(len(repo_ids) * 3, 1)]):
        ci_rows.append(
            (
                str(uuid.uuid4()),
                repo_ids[i % len(repo_ids)],
                commit_hash,
                pull_request_ids[i % len(pull_request_ids)] if pull_request_ids else None,
                CI_STATUSES[i % len(CI_STATUSES)],
                datetime.now() - timedelta(minutes=i * 10),
                datetime.now() - timedelta(minutes=i * 10) + timedelta(minutes=5) if CI_STATUSES[i % len(CI_STATUSES)] in {"success", "failed"} else None,
                '{"runner":"gitmini-demo"}',
            )
        )

    batched_insert(
        cur,
        """
        INSERT INTO ci_runs (id, repo_id, commit_hash, pull_request_id, status, started_at, finished_at, metadata)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        ci_rows,
        batch_size,
    )

    backup_rows = [
        (str(uuid.uuid4()), "full", "success", "backups/gitmini_demo_full.dump", datetime.now() - timedelta(days=1), datetime.now() - timedelta(days=1, minutes=-8), '{"tool":"pg_dump"}'),
        (str(uuid.uuid4()), "restore_test", "success", "backups/gitmini_restore_test.dump", datetime.now() - timedelta(hours=2), datetime.now() - timedelta(hours=1, minutes=50), '{"tool":"pg_restore"}'),
    ]
    batched_insert(
        cur,
        """
        INSERT INTO backup_jobs (id, job_type, status, backup_path, started_at, finished_at, metadata)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        backup_rows,
        batch_size,
    )


def seed_data(profile_name):
    config = PROFILES[profile_name]
    started_at = time.time()

    conn = get_connection()
    cur = conn.cursor()

    try:
        print(f"--- Bắt đầu seed GitMini profile={profile_name} ---")
        print("Đang tạo users...")
        user_ids, users_by_username = seed_users(cur, config["users"], config["batch_size"])

        print("Đang tạo repositories...")
        repo_ids = seed_repositories(cur, config["repos"], user_ids, users_by_username, config["batch_size"])

        print("Đang tạo repo members...")
        seed_repo_members(cur, repo_ids, user_ids, users_by_username, config["batch_size"])

        print("Đang tạo commits...")
        commits_by_repo = seed_commits(cur, config["commits"], repo_ids, user_ids, config["batch_size"])

        print("Đang tạo commit parents...")
        seed_commit_parents(cur, commits_by_repo, config["batch_size"])

        print("Đang tạo branches...")
        seed_branches(cur, repo_ids, commits_by_repo, config["batch_size"])

        print("Đang tạo issues...")
        issue_ids = seed_issues(cur, config["issues"], repo_ids, user_ids, config["batch_size"])

        print("Đang tạo pull requests...")
        pull_request_ids = seed_pull_requests(cur, config["pull_requests"], repo_ids, user_ids, commits_by_repo, config["batch_size"])

        print("Đang tạo dữ liệu mở rộng cho schema 20 bảng...")
        seed_extended_tables(cur, repo_ids, user_ids, commits_by_repo, issue_ids, pull_request_ids, config["batch_size"])

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

    elapsed = time.time() - started_at
    print(f"--- Hoàn tất seed profile={profile_name} trong {elapsed:.2f} giây ---")
    print("Gợi ý: chạy sql/06_benchmark_queries.sql sau khi thay placeholder repo_id/head_commit_hash.")


def parse_args():
    parser = argparse.ArgumentParser(description="Seed dữ liệu mẫu cho GitMini")
    parser.add_argument(
        "--profile",
        choices=PROFILES.keys(),
        default="demo",
        help="Chọn quy mô dữ liệu seed: demo hoặc benchmark",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    seed_data(args.profile)
