import hashlib
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

import psycopg2
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from psycopg2 import errors
from psycopg2.extras import Json

from app import queries
from app.auth import SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, create_session, delete_session, init_sessions_table, require_user, verify_credentials
from app.db import close_pool, execute_one, fetch_all, fetch_one, init_pool, get_connection
from app.schemas import BranchCreate, CommitCreate, IssueCreate, IssueUpdate, LoginRequest, PullRequestCreate, PullRequestReviewCreate, PullRequestUpdate, RepoCreate, RepoMemberCreate, RepoMemberUpdate, RepoUpdate

FRONTEND_DIR = Path("/app/frontend")
CurrentUser = Annotated[str, Depends(require_user)]
WRITE_ISSUE_ROLES = {"owner", "maintainer", "developer", "reviewer"}
WRITE_PULL_ROLES = {"owner", "maintainer", "developer"}
REVIEW_PULL_ROLES = {"owner", "maintainer", "reviewer"}
UPDATE_ROLES = {"owner", "maintainer"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    init_sessions_table()
    yield
    close_pool()


app = FastAPI(title="GitMini API", version="1.0.0", lifespan=lifespan)


def clamp_limit(limit: int, maximum: int = 200) -> int:
    return max(1, min(limit, maximum))


def get_or_create_user(username: str) -> str:
    row = execute_one(
        """
        INSERT INTO users (username, email, password_hash, full_name)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
        RETURNING id
        """,
        (username, f"{username}@gitmini.local", "basic-auth-demo", username),
    )
    return row["id"]


def current_context(username: str) -> dict:
    return {"username": username, "id": get_or_create_user(username), "is_admin": username == "admin"}


def query_context(ctx: dict) -> tuple:
    return (ctx["username"], ctx["id"])


def require_repo_access(repo_name: str, ctx: dict) -> dict:
    repo = fetch_one(
        """
        SELECT
            r.id,
            r.name,
            r.owner_id,
            r.is_private,
            r.default_branch,
            rm.role AS member_role,
            CASE
                WHEN %s = 'admin' THEN 'admin'
                WHEN r.owner_id = %s THEN 'owner'
                ELSE rm.role
            END AS current_user_role
        FROM repositories r
        LEFT JOIN repo_members rm ON rm.repo_id = r.id AND rm.user_id = %s
        WHERE r.name = %s
        ORDER BY r.created_at DESC
        LIMIT 1
        """,
        (ctx["username"], ctx["id"], ctx["id"], repo_name),
    )
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    can_read = ctx["is_admin"] or not repo["is_private"] or repo["owner_id"] == ctx["id"] or repo["member_role"] is not None
    if not can_read:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this repository")
    return repo


def require_role(repo: dict, allowed_roles: set[str]) -> None:
    role = repo.get("current_user_role")
    if role == "admin" or role in allowed_roles:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission for this action")


def require_owner_or_admin(repo: dict) -> None:
    require_role(repo, {"owner"})


def require_admin(ctx: dict) -> None:
    if not ctx["is_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def require_admin_or_owner(repo: dict, ctx: dict) -> None:
    if ctx["is_admin"] or repo["owner_id"] == ctx["id"]:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or owner access required")


def log_audit(ctx: dict, repo_id: str | None, action: str, target_type: str, target_id: str | None, metadata: dict | None = None) -> None:
    execute_one(
        """
        INSERT INTO audit_logs (actor_id, repo_id, action, target_type, target_id, metadata)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (ctx["id"], repo_id, action, target_type, str(target_id) if target_id is not None else None, Json(metadata or {})),
    )


def ensure_owner_remains(repo_id: str, user_id: str | None = None) -> None:
    params: tuple = (repo_id,) if user_id is None else (repo_id, user_id)
    condition = "repo_id = %s" if user_id is None else "repo_id = %s AND user_id <> %s"
    row = fetch_one(f"SELECT COUNT(*) AS owner_count FROM repo_members WHERE {condition} AND role = 'owner'", params)
    if row["owner_count"] < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Repository must keep at least one owner")


def require_issue_update(issue_id: str, ctx: dict) -> dict:
    issue = fetch_one(
        """
        SELECT i.id, i.title, i.status, i.author_id, r.id AS repo_id, r.name AS repo_name, r.owner_id, rm.role AS member_role
        FROM issues i
        JOIN repositories r ON r.id = i.repo_id
        LEFT JOIN repo_members rm ON rm.repo_id = r.id AND rm.user_id = %s
        WHERE i.id = %s
        """,
        (ctx["id"], issue_id),
    )
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    role = "admin" if ctx["is_admin"] else "owner" if issue["owner_id"] == ctx["id"] else issue["member_role"]
    if role in {"admin", "owner", "maintainer", "developer", "reviewer"} or issue["author_id"] == ctx["id"]:
        return issue
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to update this issue")


def require_pull_update(pull_id: str, target_status: str, ctx: dict) -> dict:
    pull = fetch_one(
        """
        SELECT
            pr.id,
            pr.title,
            pr.status,
            pr.author_id,
            pr.target_branch,
            r.id AS repo_id,
            r.name AS repo_name,
            r.owner_id,
            rm.role AS member_role,
            COALESCE(target_branch.is_protected, FALSE) AS target_branch_protected,
            COALESCE(review_stats.approval_count, 0) AS approval_count
        FROM pull_requests pr
        JOIN repositories r ON r.id = pr.repo_id
        LEFT JOIN repo_members rm ON rm.repo_id = r.id AND rm.user_id = %s
        LEFT JOIN branches target_branch ON target_branch.repo_id = pr.repo_id AND target_branch.name = pr.target_branch
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS approval_count
            FROM pull_request_reviews review
            WHERE review.pull_request_id = pr.id
              AND review.status = 'approved'
              AND review.reviewer_id IS DISTINCT FROM pr.author_id
        ) review_stats ON TRUE
        WHERE pr.id = %s
        """,
        (ctx["id"], pull_id),
    )
    if not pull:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pull request not found")
    role = "admin" if ctx["is_admin"] else "owner" if pull["owner_id"] == ctx["id"] else pull["member_role"]
    if target_status == "merged":
        if role not in {"admin", "owner", "maintainer"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner or maintainer can merge pull requests")
        if pull["status"] != "open":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only open pull requests can be merged")
        if pull["target_branch_protected"] and pull["approval_count"] < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Protected branch requires at least one reviewer approval before merge")
    if target_status == "closed" and role not in {"admin", "owner", "maintainer", "developer"} and pull["author_id"] != ctx["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to close this pull request")
    return pull


@app.get("/health")
def health():
    try:
        fetch_one("SELECT 1 AS ok")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database unavailable: {exc}") from exc
    return {"status": "ok", "database": "ok"}


def auth_identity(username: str) -> dict:
    ctx = current_context(username)
    return {"username": ctx["username"], "id": ctx["id"], "system_role": "admin" if ctx["is_admin"] else "user"}


@app.post("/auth/login")
def auth_login(payload: LoginRequest, response: Response):
    if not verify_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_session(payload.username)
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return auth_identity(payload.username)


@app.post("/auth/logout")
def auth_logout(request: Request, response: Response):
    delete_session(request.cookies.get(SESSION_COOKIE_NAME))
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "logged_out"}


@app.get("/auth/me")
def auth_me(current_user: CurrentUser):
    return auth_identity(current_user)


@app.get("/repos")
def list_repos(current_user: CurrentUser, limit: int = Query(default=100, ge=1, le=200)):
    ctx = current_context(current_user)
    username, user_id = query_context(ctx)
    return fetch_all(
        queries.REPO_LIST,
        (
            username, user_id,
            username, user_id,
            username, user_id,
            username, user_id,
            username, user_id,
            user_id,
            username, user_id,
            clamp_limit(limit),
        ),
    )


@app.post("/repos", status_code=status.HTTP_201_CREATED)
def create_repo(payload: RepoCreate, current_user: CurrentUser):
    ctx = current_context(current_user)
    try:
        return execute_one(
            """
            WITH new_repo AS (
                INSERT INTO repositories (name, description, owner_id, is_private)
                VALUES (%s, %s, %s, %s)
                RETURNING id, name, description, is_private, default_branch, created_at, updated_at
            ), new_member AS (
                INSERT INTO repo_members (repo_id, user_id, role)
                SELECT id, %s, 'owner' FROM new_repo
                ON CONFLICT (repo_id, user_id) DO UPDATE SET role = EXCLUDED.role
            ), default_branch AS (
                INSERT INTO branches (repo_id, name, is_protected)
                SELECT id, default_branch, TRUE FROM new_repo
                ON CONFLICT (repo_id, name) DO NOTHING
            )
            SELECT * FROM new_repo
            """,
            (payload.name, payload.description, ctx["id"], payload.is_private, ctx["id"]),
        )
    except errors.UniqueViolation as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Repository name already exists for this owner") from exc
    except psycopg2.Error as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc).strip()) from exc


@app.get("/repos/{repo_name}")
def get_repo(repo_name: str, current_user: CurrentUser):
    ctx = current_context(current_user)
    username, user_id = query_context(ctx)
    repo = fetch_one(
        queries.REPO_DETAIL,
        (
            username, user_id,
            username, user_id,
            username, user_id,
            username, user_id,
            username, user_id,
            user_id,
            repo_name,
            username, user_id,
        ),
    )
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    return repo


@app.get("/repos/{repo_name}/stats")
def get_repo_stats(repo_name: str, current_user: CurrentUser):
    ctx = current_context(current_user)
    username, user_id = query_context(ctx)
    stats = fetch_one(
        queries.REPO_STATS,
        (
            username, user_id,
            username, user_id,
            username, user_id,
            username, user_id,
            username, user_id,
            user_id,
            repo_name,
            username, user_id,
        ),
    )
    if not stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    return stats


@app.get("/repos/{repo_name}/members")
def list_repo_members(repo_name: str, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    if repo["current_user_role"] not in {"admin", "owner", "maintainer", "developer", "reviewer"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only repo members can view the member list")
    return fetch_all(
        """
        SELECT u.username, u.full_name, rm.role, rm.joined_at
        FROM repo_members rm
        JOIN users u ON u.id = rm.user_id
        WHERE rm.repo_id = %s
        ORDER BY
            CASE rm.role
                WHEN 'owner' THEN 1
                WHEN 'maintainer' THEN 2
                WHEN 'developer' THEN 3
                WHEN 'reviewer' THEN 4
                ELSE 5
            END,
            u.username
        """,
        (repo["id"],),
    )


@app.post("/repos/{repo_name}/members", status_code=status.HTTP_201_CREATED)
def add_repo_member(repo_name: str, payload: RepoMemberCreate, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    require_owner_or_admin(repo)
    member_id = get_or_create_user(payload.username)
    member = execute_one(
        """
        INSERT INTO repo_members (repo_id, user_id, role)
        VALUES (%s, %s, %s)
        ON CONFLICT (repo_id, user_id) DO UPDATE SET role = EXCLUDED.role
        RETURNING repo_id, user_id, role, joined_at
        """,
        (repo["id"], member_id, payload.role),
    )
    log_audit(
        ctx,
        repo["id"],
        "member.add",
        "repo_member",
        member_id,
        {"username": payload.username, "role": member["role"], "repo": repo["name"]},
    )
    return member


@app.patch("/repos/{repo_name}/members/{username}")
def update_repo_member(repo_name: str, username: str, payload: RepoMemberUpdate, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    require_owner_or_admin(repo)
    member = fetch_one(
        """
        SELECT rm.user_id, rm.role
        FROM repo_members rm
        JOIN users u ON u.id = rm.user_id
        WHERE rm.repo_id = %s AND u.username = %s
        """,
        (repo["id"], username),
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if member["role"] == "owner" and payload.role != "owner":
        ensure_owner_remains(repo["id"], member["user_id"])
    updated_member = execute_one(
        """
        UPDATE repo_members
        SET role = %s
        WHERE repo_id = %s AND user_id = %s
        RETURNING repo_id, user_id, role, joined_at
        """,
        (payload.role, repo["id"], member["user_id"]),
    )
    if member["role"] != payload.role:
        log_audit(
            ctx,
            repo["id"],
            "member.change",
            "repo_member",
            member["user_id"],
            {"username": username, "old_role": member["role"], "new_role": payload.role, "repo": repo["name"]},
        )
    return updated_member


@app.delete("/repos/{repo_name}/members/{username}")
def remove_repo_member(repo_name: str, username: str, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    require_owner_or_admin(repo)
    member = fetch_one(
        """
        SELECT rm.user_id, rm.role
        FROM repo_members rm
        JOIN users u ON u.id = rm.user_id
        WHERE rm.repo_id = %s AND u.username = %s
        """,
        (repo["id"], username),
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if member["role"] == "owner":
        ensure_owner_remains(repo["id"], member["user_id"])
    execute_one("DELETE FROM repo_members WHERE repo_id = %s AND user_id = %s RETURNING repo_id", (repo["id"], member["user_id"]))
    log_audit(
        ctx,
        repo["id"],
        "member.remove",
        "repo_member",
        member["user_id"],
        {"username": username, "role": member["role"], "repo": repo["name"]},
    )
    return {"status": "removed", "username": username}


@app.delete("/repos/{repo_name}")
def delete_repo(repo_name: str, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    require_admin_or_owner(repo, ctx)
    
    execute_one("DELETE FROM repositories WHERE id = %s RETURNING id", (repo["id"],))
    log_audit(
        ctx,
        None,
        "repo.delete",
        "repository",
        repo["id"],
        {"name": repo["name"], "repo": repo_name}
    )
    return {"status": "deleted", "name": repo_name}


@app.get("/repos/{repo_name}/branches")
def list_repo_branches(repo_name: str, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    return fetch_all(
        "SELECT id, name, head_commit_hash, is_protected, created_at, updated_at FROM branches WHERE repo_id = %s ORDER BY is_protected DESC, name",
        (repo["id"],),
    )


@app.post("/repos/{repo_name}/branches", status_code=status.HTTP_201_CREATED)
def create_branch(repo_name: str, payload: BranchCreate, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    require_role(repo, WRITE_PULL_ROLES)
    start_commit = payload.from_commit
    if not start_commit:
        head = fetch_one(
            "SELECT b.head_commit_hash FROM branches b JOIN repositories r ON r.id = b.repo_id WHERE b.repo_id = %s AND b.name = r.default_branch",
            (repo["id"],),
        )
        start_commit = head["head_commit_hash"] if head else None
    try:
        branch = execute_one(
            "INSERT INTO branches (repo_id, name, head_commit_hash, is_protected) VALUES (%s, %s, %s, %s) RETURNING id, name, head_commit_hash, is_protected, created_at",
            (repo["id"], payload.name, start_commit, payload.is_protected),
        )
    except errors.UniqueViolation as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Branch '{payload.name}' already exists") from exc
    log_audit(ctx, repo["id"], "branch.create", "branch", branch["id"], {"name": payload.name, "repo": repo_name})
    return branch


@app.patch("/repos/{repo_name}")
def update_repo(repo_name: str, payload: RepoUpdate, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    require_owner_or_admin(repo)
    updated = execute_one(
        "UPDATE repositories SET description = %s, is_private = %s, updated_at = NOW() WHERE id = %s RETURNING id, name, description, is_private, updated_at",
        (payload.description, payload.is_private, repo["id"]),
    )
    log_audit(ctx, repo["id"], "repo.update", "repository", repo["id"], {"name": repo_name})
    return updated


@app.get("/repos/{repo_name}/commits/{commit_hash}/files")
def get_commit_files(repo_name: str, commit_hash: str, current_user: CurrentUser):
    ctx = current_context(current_user)
    require_repo_access(repo_name, ctx)
    return fetch_all(
        """
        SELECT cf.file_path, cf.change_type, fb.content, fb.size_bytes
        FROM commit_files cf
        LEFT JOIN file_blobs fb ON fb.id = cf.blob_id
        WHERE cf.commit_hash = %s
        ORDER BY cf.file_path
        """,
        (commit_hash,),
    )


@app.delete("/repos/{repo_name}/branches/{branch_name:path}")
def delete_branch(repo_name: str, branch_name: str, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    require_role(repo, UPDATE_ROLES)
    if branch_name == repo["default_branch"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete the default branch")
    branch = fetch_one("SELECT id FROM branches WHERE repo_id = %s AND name = %s", (repo["id"], branch_name))
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    open_prs = fetch_one(
        "SELECT COUNT(*) AS cnt FROM pull_requests WHERE repo_id = %s AND (source_branch = %s OR target_branch = %s) AND status = 'open'",
        (repo["id"], branch_name, branch_name),
    )
    if open_prs and open_prs["cnt"] > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a branch with open pull requests")
    execute_one("DELETE FROM branches WHERE id = %s", (branch["id"],))
    log_audit(ctx, repo["id"], "branch.delete", "branch", branch["id"], {"name": branch_name, "repo": repo_name})
    return {"status": "deleted", "name": branch_name}


@app.get("/repos/{repo_name}/history")
def get_repo_history(
    repo_name: str,
    current_user: CurrentUser,
    limit: int = Query(default=50, ge=1, le=200),
    depth: int = Query(default=100, ge=1, le=500),
    branch: str | None = Query(default=None),
):
    ctx = current_context(current_user)
    require_repo_access(repo_name, ctx)
    limited = clamp_limit(limit)
    rows = fetch_all(queries.COMMIT_HISTORY, (ctx["id"], repo_name, ctx["username"], ctx["id"], branch, depth, limited))
    if len(rows) <= 1:
        fallback = fetch_all(queries.COMMIT_HISTORY_FALLBACK, (ctx["id"], repo_name, ctx["username"], ctx["id"], limited))
        return fallback or rows
    return rows


@app.post("/repos/{repo_name}/commits", status_code=status.HTTP_201_CREATED)
def create_commit(repo_name: str, payload: CommitCreate, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    require_role(repo, WRITE_PULL_ROLES) # Developer+ role

    branch = fetch_one(
        "SELECT head_commit_hash FROM branches WHERE repo_id = %s AND name = %s",
        (repo["id"], payload.branch)
    )
    if not branch:
        raise HTTPException(status_code=404, detail=f"Branch '{payload.branch}' not found")

    parent_hash = branch["head_commit_hash"]
    
    # Generate commit hash (simulated)
    raw_content = f"{repo['id']}:{payload.branch}:{payload.message}:{parent_hash}:{uuid.uuid4()}"
    new_hash = hashlib.sha1(raw_content.encode()).hexdigest()

    with get_connection() as conn:
        with conn.cursor() as cur:
            # 1. Insert commit
            cur.execute(
                "INSERT INTO commits (commit_hash, repo_id, author_id, message) VALUES (%s, %s, %s, %s)",
                (new_hash, repo["id"], ctx["id"], payload.message),
            )
            # 2. Link parent in DAG
            if parent_hash:
                cur.execute(
                    "INSERT INTO commit_parents (commit_hash, parent_hash, ordinal) VALUES (%s, %s, 0)",
                    (new_hash, parent_hash),
                )
            # 3. Store file blobs (skip blob for deleted files)
            for f in payload.files:
                blob_id = None
                if f.change_type != "deleted":
                    blob_hash = hashlib.sha1(f.content.encode()).hexdigest()
                    cur.execute(
                        "INSERT INTO file_blobs (blob_hash, content, size_bytes) VALUES (%s, %s, %s) ON CONFLICT (blob_hash) DO NOTHING RETURNING id",
                        (blob_hash, f.content, len(f.content)),
                    )
                    row = cur.fetchone()
                    if not row:
                        cur.execute("SELECT id FROM file_blobs WHERE blob_hash = %s", (blob_hash,))
                        row = cur.fetchone()
                    blob_id = row[0] if row else None
                cur.execute(
                    "INSERT INTO commit_files (commit_hash, file_path, blob_id, change_type) VALUES (%s, %s, %s, %s)",
                    (new_hash, f.path, blob_id, f.change_type),
                )
            # 4. Advance branch HEAD
            cur.execute(
                "UPDATE branches SET head_commit_hash = %s, updated_at = NOW() WHERE repo_id = %s AND name = %s",
                (new_hash, repo["id"], payload.branch),
            )
            # 5. Audit log in same transaction
            cur.execute(
                "INSERT INTO audit_logs (actor_id, repo_id, action, target_type, target_id, metadata) VALUES (%s, %s, %s, %s, %s, %s)",
                (ctx["id"], repo["id"], "commit.create", "commit", new_hash, Json({"message": payload.message, "branch": payload.branch})),
            )

    return {"status": "ok", "commit_hash": new_hash}


@app.get("/issues")
def list_issues(
    current_user: CurrentUser,
    status_filter: str | None = Query(default=None, alias="status", pattern="^(open|closed)$"),
    repo: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
):
    ctx = current_context(current_user)
    return fetch_all(
        queries.ISSUE_LIST,
        (
            ctx["username"], ctx["id"],
            ctx["username"], ctx["id"],
            ctx["id"],
            ctx["username"], ctx["id"],
            status_filter, status_filter,
            repo, repo,
            clamp_limit(limit),
        ),
    )


@app.post("/repos/{repo_name}/issues", status_code=status.HTTP_201_CREATED)
def create_issue(repo_name: str, payload: IssueCreate, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    require_role(repo, WRITE_ISSUE_ROLES)
    try:
        return execute_one(
            """
            INSERT INTO issues (repo_id, author_id, title, body, labels)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, title, body, status, labels, created_at, updated_at, closed_at
            """,
            (repo["id"], ctx["id"], payload.title, payload.body, payload.labels),
        )
    except psycopg2.Error as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc).strip()) from exc


@app.patch("/issues/{issue_id}")
def update_issue(issue_id: str, payload: IssueUpdate, current_user: CurrentUser):
    ctx = current_context(current_user)
    previous_issue = require_issue_update(issue_id, ctx)
    issue = execute_one(
        """
        UPDATE issues
        SET status = %s,
            closed_at = CASE WHEN %s = 'closed' THEN NOW() ELSE NULL END,
            updated_at = NOW()
        WHERE id = %s
        RETURNING id, title, status, closed_at, updated_at
        """,
        (payload.status, payload.status, issue_id),
    )
    if previous_issue["status"] != issue["status"]:
        action = "issue.close" if issue["status"] == "closed" else "issue.reopen"
        log_audit(
            ctx,
            previous_issue["repo_id"],
            action,
            "issue",
            issue["id"],
            {"repo": previous_issue["repo_name"], "title": issue["title"], "old_status": previous_issue["status"], "new_status": issue["status"]},
        )
    return issue


@app.get("/pulls")
def list_pulls(
    current_user: CurrentUser,
    status_filter: str | None = Query(default=None, alias="status", pattern="^(open|closed|merged)$"),
    limit: int = Query(default=100, ge=1, le=200),
):
    ctx = current_context(current_user)
    return fetch_all(
        queries.PULL_LIST,
        (
            ctx["username"], ctx["id"],
            ctx["username"], ctx["id"],
            ctx["id"],
            ctx["username"], ctx["id"],
            status_filter, status_filter,
            None, None,
            clamp_limit(limit),
        ),
    )


@app.get("/repos/{repo_name}/pulls")
def list_repo_pulls(
    repo_name: str,
    current_user: CurrentUser,
    status_filter: str | None = Query(default=None, alias="status", pattern="^(open|closed|merged)$"),
    limit: int = Query(default=100, ge=1, le=200),
):
    ctx = current_context(current_user)
    require_repo_access(repo_name, ctx)
    return fetch_all(
        queries.PULL_LIST,
        (
            ctx["username"], ctx["id"],
            ctx["username"], ctx["id"],
            ctx["id"],
            ctx["username"], ctx["id"],
            status_filter, status_filter,
            repo_name, repo_name,
            clamp_limit(limit),
        ),
    )


@app.post("/repos/{repo_name}/pulls", status_code=status.HTTP_201_CREATED)
def create_pull(repo_name: str, payload: PullRequestCreate, current_user: CurrentUser):
    ctx = current_context(current_user)
    repo = require_repo_access(repo_name, ctx)
    require_role(repo, WRITE_PULL_ROLES)
    try:
        return execute_one(
            """
            INSERT INTO pull_requests (repo_id, author_id, title, body, source_branch, target_branch)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, title, body, status, source_branch, target_branch, created_at, updated_at
            """,
            (repo["id"], ctx["id"], payload.title, payload.body, payload.source_branch, payload.target_branch),
        )
    except psycopg2.Error as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc).strip()) from exc


@app.post("/pulls/{pull_id}/reviews", status_code=status.HTTP_201_CREATED)
def approve_pull(pull_id: str, payload: PullRequestReviewCreate, current_user: CurrentUser):
    ctx = current_context(current_user)
    pull = fetch_one(
        """
        SELECT pr.id, pr.title, pr.status, pr.author_id, pr.target_branch, r.id AS repo_id, r.name AS repo_name, r.owner_id, rm.role AS member_role
        FROM pull_requests pr
        JOIN repositories r ON r.id = pr.repo_id
        LEFT JOIN repo_members rm ON rm.repo_id = r.id AND rm.user_id = %s
        WHERE pr.id = %s
        """,
        (ctx["id"], pull_id),
    )
    if not pull:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pull request not found")
    role = "admin" if ctx["is_admin"] else "owner" if pull["owner_id"] == ctx["id"] else pull["member_role"]
    if role not in {"admin", *REVIEW_PULL_ROLES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner, maintainer or reviewer can approve pull requests")
    if pull["status"] != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only open pull requests can be approved")
    if pull["author_id"] == ctx["id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pull request author cannot approve their own pull request")

    review = execute_one(
        """
        INSERT INTO pull_request_reviews (pull_request_id, reviewer_id, status)
        VALUES (%s, %s, %s)
        ON CONFLICT (pull_request_id, reviewer_id) DO UPDATE SET status = EXCLUDED.status, created_at = NOW()
        RETURNING id, pull_request_id, reviewer_id, status, created_at
        """,
        (pull_id, ctx["id"], payload.status),
    )
    log_audit(
        ctx,
        pull["repo_id"],
        "pull.review.approve",
        "pull_request",
        pull_id,
        {"repo": pull["repo_name"], "title": pull["title"], "reviewer": ctx["username"], "target_branch": pull["target_branch"]},
    )
    review["reviewer"] = ctx["username"]
    return review


@app.patch("/pulls/{pull_id}")
def update_pull(pull_id: str, payload: PullRequestUpdate, current_user: CurrentUser):
    ctx = current_context(current_user)
    previous_pull = require_pull_update(pull_id, payload.status, ctx)
    pull = execute_one(
        """
        UPDATE pull_requests
        SET status = %s,
            merge_commit_hash = CASE WHEN %s = 'merged' THEN COALESCE(%s, merge_commit_hash) ELSE merge_commit_hash END,
            merged_at = CASE WHEN %s = 'merged' THEN NOW() ELSE NULL END,
            closed_at = CASE WHEN %s = 'closed' THEN NOW() ELSE NULL END,
            updated_at = NOW()
        WHERE id = %s
        RETURNING id, title, status, merge_commit_hash, merged_at, closed_at, updated_at
        """,
        (payload.status, payload.status, payload.merge_commit_hash, payload.status, payload.status, pull_id),
    )
    if previous_pull["status"] != pull["status"] and pull["status"] in {"closed", "merged"}:
        action = "pull.merge" if pull["status"] == "merged" else "pull.close"
        log_audit(
            ctx,
            previous_pull["repo_id"],
            action,
            "pull_request",
            pull["id"],
            {"repo": previous_pull["repo_name"], "title": pull["title"], "old_status": previous_pull["status"], "new_status": pull["status"]},
        )
    return pull


@app.get("/repos/{repo_name}/search")
def search_repo(
    repo_name: str,
    current_user: CurrentUser,
    q: str = Query(min_length=1),
    limit: int = Query(default=50, ge=1, le=100),
):
    ctx = current_context(current_user)
    require_repo_access(repo_name, ctx)
    return fetch_all(queries.REPO_SEARCH, (ctx["id"], repo_name, ctx["username"], ctx["id"], q, q, q, q, clamp_limit(limit, 100)))


@app.get("/search")
def search_global(
    current_user: CurrentUser,
    q: str = Query(min_length=1),
    limit: int = Query(default=50, ge=1, le=100),
):
    ctx = current_context(current_user)
    return fetch_all(queries.GLOBAL_SEARCH, (ctx["id"], ctx["username"], ctx["id"], q, q, q, q, clamp_limit(limit, 100)))


@app.get("/analytics")
def get_analytics(current_user: CurrentUser):
    ctx = current_context(current_user)
    analytics = fetch_one(queries.ANALYTICS_OVERVIEW, (ctx["id"], ctx["username"], ctx["id"]))
    analytics["scope"] = "global" if ctx["is_admin"] else "visible_repositories"
    return analytics


@app.get("/admin/audit-logs")
def list_audit_logs(
    current_user: CurrentUser,
    actor: str | None = Query(default=None),
    repo: str | None = Query(default=None),
    action: str | None = Query(default=None),
    target_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
):
    ctx = current_context(current_user)
    require_admin(ctx)
    filters = []
    params: list = []
    if actor:
        filters.append("actor.username = %s")
        params.append(actor)
    if repo:
        filters.append("repo.name = %s")
        params.append(repo)
    if action:
        filters.append("al.action = %s")
        params.append(action)
    if target_type:
        filters.append("al.target_type = %s")
        params.append(target_type)
    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    params.append(clamp_limit(limit))
    return fetch_all(
        f"""
        SELECT
            al.id,
            actor.username AS actor,
            repo.name AS repo,
            al.action,
            al.target_type,
            al.target_id,
            al.metadata,
            al.created_at
        FROM audit_logs al
        LEFT JOIN users actor ON actor.id = al.actor_id
        LEFT JOIN repositories repo ON repo.id = al.repo_id
        {where_clause}
        ORDER BY al.created_at DESC
        LIMIT %s
        """,
        tuple(params),
    )


@app.get("/", include_in_schema=False)
def index():
    index_path = FRONTEND_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frontend not found")
    return FileResponse(index_path)


assets_dir = FRONTEND_DIR / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
