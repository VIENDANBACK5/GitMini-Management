/*
  GITMINI TRIGGERS & AUTOMATION
  Tự động hóa việc duy trì bảng phi chuẩn hóa repo_stats
*/

-- 0. Hàm khởi tạo bản ghi repo_stats nếu chưa tồn tại
CREATE OR REPLACE FUNCTION fn_init_repo_stats() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO repo_stats (repo_id)
    VALUES (NEW.id)
    ON CONFLICT (repo_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_init_stats_on_repo_create
AFTER INSERT ON repositories
FOR EACH ROW EXECUTE FUNCTION fn_init_repo_stats();

-- 1. Hàm cập nhật thống kê Commit
CREATE OR REPLACE FUNCTION fn_update_stats_on_commit() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE repo_stats 
        SET commit_count = commit_count + 1,
            latest_commit_hash = NEW.commit_hash,
            latest_commit_time = NEW.created_at,
            latest_commit_msg = NEW.message,
            updated_at = NOW()
        WHERE repo_id = NEW.repo_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE repo_stats 
        SET commit_count = commit_count - 1,
            updated_at = NOW()
        WHERE repo_id = OLD.repo_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_commit_changes
AFTER INSERT OR DELETE ON commits
FOR EACH ROW EXECUTE FUNCTION fn_update_stats_on_commit();

-- 2. Hàm cập nhật thống kê Issue
CREATE OR REPLACE FUNCTION fn_update_stats_on_issue() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE repo_stats 
        SET issue_open_count = issue_open_count + 1,
            updated_at = NOW()
        WHERE repo_id = NEW.repo_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Nếu đóng Issue
        IF (OLD.status = 'open' AND NEW.status = 'closed') THEN
            UPDATE repo_stats 
            SET issue_open_count = issue_open_count - 1,
                issue_closed_count = issue_closed_count + 1,
                updated_at = NOW()
            WHERE repo_id = NEW.repo_id;
        -- Nếu mở lại Issue
        ELSIF (OLD.status = 'closed' AND NEW.status = 'open') THEN
            UPDATE repo_stats 
            SET issue_open_count = issue_open_count + 1,
                issue_closed_count = issue_closed_count - 1,
                updated_at = NOW()
            WHERE repo_id = NEW.repo_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_issue_changes
AFTER INSERT OR UPDATE ON issues
FOR EACH ROW EXECUTE FUNCTION fn_update_stats_on_issue();

-- 3. Hàm cập nhật thống kê Pull Request
CREATE OR REPLACE FUNCTION fn_update_stats_on_pr() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE repo_stats 
        SET pr_open_count = pr_open_count + 1,
            updated_at = NOW()
        WHERE repo_id = NEW.repo_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Nếu PR được Merged
        IF (OLD.status = 'open' AND NEW.status = 'merged') THEN
            UPDATE repo_stats 
            SET pr_open_count = pr_open_count - 1,
                pr_merged_count = pr_merged_count + 1,
                updated_at = NOW()
            WHERE repo_id = NEW.repo_id;
        -- Nếu PR bị đóng mà không Merge
        ELSIF (OLD.status = 'open' AND NEW.status = 'closed') THEN
            UPDATE repo_stats 
            SET pr_open_count = pr_open_count - 1,
                updated_at = NOW()
            WHERE repo_id = NEW.repo_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pr_changes
AFTER INSERT OR UPDATE ON pull_requests
FOR EACH ROW EXECUTE FUNCTION fn_update_stats_on_pr();
