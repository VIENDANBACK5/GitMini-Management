/*
  GITMINI DATABASE SCHEMA
  Version: 1.0 (PostgreSQL 15 Compatible)
  Primary Key: UUID
*/

-- Kích hoạt extension để sinh mã UUID v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng USERS: Lưu trữ thông tin tài khoản người dùng
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT DEFAULT '',
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng REPOSITORIES: Lưu trữ thông tin các kho mã nguồn
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_private BOOLEAN DEFAULT FALSE,
    default_branch VARCHAR(100) DEFAULT 'main',
    stars_count INT DEFAULT 0,
    forks_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, name)
);

-- 3. Bảng REPO_MEMBERS: Thành viên và vai trò theo từng repository
CREATE TABLE IF NOT EXISTS repo_members (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'maintainer', 'developer', 'reviewer', 'viewer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (repo_id, user_id)
);

-- 4. Bảng COMMITS: Lưu trữ snapshot lịch sử mã nguồn
CREATE TABLE IF NOT EXISTS commits (
    commit_hash CHAR(40) PRIMARY KEY, -- SHA-1 hash (40 chars)
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng COMMIT_PARENTS: Lưu quan hệ cha-con (Cấu trúc DAG)
CREATE TABLE IF NOT EXISTS commit_parents (
    commit_hash CHAR(40) REFERENCES commits(commit_hash) ON DELETE CASCADE,
    parent_hash CHAR(40) REFERENCES commits(commit_hash) ON DELETE CASCADE,
    ordinal INT DEFAULT 0, -- 0 cho parent chính, 1 cho merge parent
    PRIMARY KEY (commit_hash, parent_hash)
);

-- 5. Bảng BRANCHES: Các con trỏ nhánh
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    head_commit_hash CHAR(40) REFERENCES commits(commit_hash) ON DELETE SET NULL,
    is_protected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repo_id, name)
);

-- 6. Bảng ISSUES: Quản lý vấn đề kỹ thuật
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    body TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    labels TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Full-text search: generated column được tính sẵn và lưu vật lý (STORED),
-- index GIN không cần recompute expression khi truy vấn → nhanh hơn expression index.
ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || COALESCE(body, ''))
    ) STORED;

-- 7. Bảng PULL_REQUESTS: Yêu cầu hợp nhất mã nguồn
CREATE TABLE IF NOT EXISTS pull_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    body TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'merged')),
    source_branch VARCHAR(255) NOT NULL,
    target_branch VARCHAR(255) NOT NULL DEFAULT 'main',
    merge_commit_hash CHAR(40) REFERENCES commits(commit_hash) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    merged_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- 8. Bảng PULL_REQUEST_REVIEWS: Lưu approval tối thiểu cho Pull Request
CREATE TABLE IF NOT EXISTS pull_request_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('approved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pull_request_id, reviewer_id)
);

-- 9. Bảng AUDIT_LOGS: Dấu vết hành động nhạy cảm
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    repo_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Bảng REPO_STATS: Bảng phi chuẩn hóa để tối ưu Dashboard
CREATE TABLE IF NOT EXISTS repo_stats (
    repo_id UUID PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
    commit_count INT DEFAULT 0,
    branch_count INT DEFAULT 0,
    issue_open_count INT DEFAULT 0,
    issue_closed_count INT DEFAULT 0,
    pr_open_count INT DEFAULT 0,
    pr_merged_count INT DEFAULT 0,
    latest_commit_hash CHAR(40),
    latest_commit_time TIMESTAMPTZ,
    latest_commit_msg TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint updates for completeness
-- Mở rộng trạng thái review: approved, changes_requested, commented
ALTER TABLE pull_request_reviews
    DROP CONSTRAINT IF EXISTS pull_request_reviews_status_check;
ALTER TABLE pull_request_reviews
    ADD CONSTRAINT pull_request_reviews_status_check
    CHECK (status IN ('approved', 'changes_requested', 'commented'));

-- backup_jobs.job_type constraint được mở rộng trong 09_extend_to_20_tables.sql
-- (backup_jobs được tạo ở file đó, không thể ALTER ở đây)
