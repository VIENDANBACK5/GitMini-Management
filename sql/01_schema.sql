/*
  GITMINI DATABASE SCHEMA
  Version: 1.0 (PostgreSQL 12.15 Compatible)
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

-- 3. Bảng COMMITS: Lưu trữ snapshot lịch sử mã nguồn
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

-- 8. Bảng REPO_STATS: Bảng phi chuẩn hóa để tối ưu Dashboard
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
