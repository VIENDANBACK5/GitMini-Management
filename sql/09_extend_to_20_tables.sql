/*
  GITMINI EXTENDED SCHEMA
  Adds 9 database-administration focused tables so the physical schema has 20 core tables.
  Safe to run repeatedly on existing development/demo databases.
*/

CREATE TABLE IF NOT EXISTS file_blobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blob_hash CHAR(40) NOT NULL UNIQUE,
    content TEXT,
    size_bytes BIGINT DEFAULT 0 CHECK (size_bytes >= 0),
    mime_type VARCHAR(100) DEFAULT 'text/plain',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commit_files (
    commit_hash CHAR(40) NOT NULL REFERENCES commits(commit_hash) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    blob_id UUID REFERENCES file_blobs(id) ON DELETE SET NULL,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('added', 'modified', 'deleted', 'renamed')),
    additions INT DEFAULT 0 CHECK (additions >= 0),
    deletions INT DEFAULT 0 CHECK (deletions >= 0),
    PRIMARY KEY (commit_hash, file_path)
);

CREATE TABLE IF NOT EXISTS repository_languages (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    bytes_count BIGINT DEFAULT 0 CHECK (bytes_count >= 0),
    percentage NUMERIC(5,2) DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
    PRIMARY KEY (repo_id, language)
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_commit_hash CHAR(40) REFERENCES commits(commit_hash) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repo_id, name)
);

CREATE TABLE IF NOT EXISTS releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    is_prerelease BOOLEAN DEFAULT FALSE,
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issue_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pull_request_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    file_path TEXT,
    line_number INT CHECK (line_number IS NULL OR line_number > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ci_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_hash CHAR(40) REFERENCES commits(commit_hash) ON DELETE SET NULL,
    pull_request_id UUID REFERENCES pull_requests(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS backup_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('full', 'incremental', 'restore_test')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    backup_path TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_file_blobs_hash ON file_blobs(blob_hash);
CREATE INDEX IF NOT EXISTS idx_commit_files_blob ON commit_files(blob_id);
CREATE INDEX IF NOT EXISTS idx_commit_files_path ON commit_files(file_path);
CREATE INDEX IF NOT EXISTS idx_repository_languages_language ON repository_languages(language);
CREATE INDEX IF NOT EXISTS idx_tags_repo ON tags(repo_id);
CREATE INDEX IF NOT EXISTS idx_tags_target_commit ON tags(target_commit_hash);
CREATE INDEX IF NOT EXISTS idx_releases_repo ON releases(repo_id);
CREATE INDEX IF NOT EXISTS idx_releases_tag ON releases(tag_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_created ON issue_comments(issue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_comments_author ON issue_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_pr_comments_pr_created ON pull_request_comments(pull_request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_comments_author ON pull_request_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_ci_runs_repo_status ON ci_runs(repo_id, status);
CREATE INDEX IF NOT EXISTS idx_ci_runs_commit ON ci_runs(commit_hash);
CREATE INDEX IF NOT EXISTS idx_ci_runs_pull_request ON ci_runs(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_started ON backup_jobs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status, started_at DESC);

GRANT ALL PRIVILEGES ON
    file_blobs,
    commit_files,
    repository_languages,
    tags,
    releases,
    issue_comments,
    pull_request_comments,
    ci_runs,
    backup_jobs
TO git_admin;

GRANT SELECT ON
    file_blobs,
    commit_files,
    repository_languages,
    tags,
    releases,
    issue_comments,
    pull_request_comments,
    ci_runs,
    backup_jobs
TO git_developer;

GRANT INSERT, UPDATE ON
    issue_comments,
    pull_request_comments
TO git_developer;

GRANT INSERT, UPDATE ON ci_runs TO git_reviewer;
