/*
  GITMINI INDEXING STRATEGY
  Tối ưu hóa các truy vấn tìm kiếm và kết hợp bảng (JOIN)
*/

-- 1. Chỉ mục cho các Khóa ngoại (Foreign Keys)
-- Mặc định PostgreSQL không tự tạo index cho FK, việc này giúp JOIN nhanh hơn.
CREATE INDEX IF NOT EXISTS idx_repos_owner ON repositories(owner_id);
CREATE INDEX IF NOT EXISTS idx_commits_repo ON commits(repo_id);
CREATE INDEX IF NOT EXISTS idx_commits_author ON commits(author_id);
CREATE INDEX IF NOT EXISTS idx_parents_commit ON commit_parents(commit_hash);
CREATE INDEX IF NOT EXISTS idx_parents_parent ON commit_parents(parent_hash);
CREATE INDEX IF NOT EXISTS idx_branches_repo ON branches(repo_id);
CREATE INDEX IF NOT EXISTS idx_issues_repo ON issues(repo_id);
CREATE INDEX IF NOT EXISTS idx_pr_repo ON pull_requests(repo_id);

-- 2. Chỉ mục phức hợp (Composite Indexes) cho các luồng truy vấn chính
-- Tối ưu hóa việc lấy lịch sử commit (Git Log) sắp xếp theo thời gian
CREATE INDEX IF NOT EXISTS idx_commits_repo_time ON commits(repo_id, created_at DESC);

-- Tối ưu hóa việc lọc Issue theo trạng thái trong một Repository
CREATE INDEX IF NOT EXISTS idx_issues_repo_status ON issues(repo_id, status);

-- Tối ưu hóa việc lọc Pull Request theo trạng thái
CREATE INDEX IF NOT EXISTS idx_pr_repo_status ON pull_requests(repo_id, status);

-- 3. Chỉ mục Tìm kiếm toàn văn (Full-text Search - GIN Index)
-- Tối ưu hóa tìm kiếm Issue theo tiêu đề và nội dung
CREATE INDEX IF NOT EXISTS idx_issues_search 
ON issues USING GIN (to_tsvector('english', title || ' ' || body));

-- Tối ưu hóa tìm kiếm Commit theo nội dung message
CREATE INDEX IF NOT EXISTS idx_commits_message_search 
ON commits USING GIN (to_tsvector('english', message));

-- 4. Chỉ mục cho thống kê Dashboard
CREATE INDEX IF NOT EXISTS idx_repo_stats_updated ON repo_stats(updated_at DESC);
