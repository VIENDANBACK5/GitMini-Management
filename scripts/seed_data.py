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
    for i in range(count):
        keyword = ISSUE_KEYWORDS[i % len(ISSUE_KEYWORDS)]
        status = "closed" if i % 4 == 0 else "open"
        created_at = datetime.now() - timedelta(hours=i)
        closed_at = created_at + timedelta(hours=4) if status == "closed" else None
        rows.append(
            (
                str(uuid.uuid4()),
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


def seed_pull_requests(cur, count, repo_ids, user_ids, commits_by_repo, batch_size):
    rows = []
    statuses = ["open", "open", "closed", "merged"]
    source_branches = ["develop", "feature/login", "feature/search", "bugfix/dashboard"]

    for i in range(count):
        repo_id = repo_ids[i % len(repo_ids)]
        status = statuses[i % len(statuses)]
        commit_hashes = commits_by_repo.get(repo_id, [])
        merge_commit_hash = random.choice(commit_hashes) if status == "merged" and commit_hashes else None
        created_at = datetime.now() - timedelta(hours=i * 2)
        merged_at = created_at + timedelta(hours=2) if status == "merged" else None
        closed_at = created_at + timedelta(hours=3) if status == "closed" else None

        rows.append(
            (
                str(uuid.uuid4()),
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
        seed_issues(cur, config["issues"], repo_ids, user_ids, config["batch_size"])

        print("Đang tạo pull requests...")
        seed_pull_requests(cur, config["pull_requests"], repo_ids, user_ids, commits_by_repo, config["batch_size"])

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
