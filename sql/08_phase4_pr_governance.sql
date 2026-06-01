/*
  GITMINI PHASE 4 — PR GOVERNANCE
  Bổ sung cơ chế kiểm soát chất lượng Pull Request:
  - required_approvals: số approval tối thiểu trước khi merge
  - fn_check_pr_approvals(): kiểm tra đủ approval
  - fn_enforce_pr_approvals(): trigger chặn merge khi chưa đủ approval

  Safe to run on an existing development database. Does not reset data.
*/

-- 1. Thêm cột required_approvals vào pull_requests
--    Mặc định 1: mỗi PR cần ít nhất 1 approval trước khi merge
ALTER TABLE pull_requests
    ADD COLUMN IF NOT EXISTS required_approvals INT DEFAULT 1
    CHECK (required_approvals >= 1);

-- 2. Hàm kiểm tra số approval hiện có so với yêu cầu
CREATE OR REPLACE FUNCTION fn_check_pr_approvals(pr_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    approved_count INT;
    required       INT;
BEGIN
    SELECT COUNT(*)
    INTO approved_count
    FROM pull_request_reviews
    WHERE pull_request_id = pr_id
      AND status = 'approved';

    SELECT required_approvals
    INTO required
    FROM pull_requests
    WHERE id = pr_id;

    RETURN approved_count >= required;
END;
$$ LANGUAGE plpgsql;

-- 3. Hàm trigger chặn merge khi chưa đủ approval
CREATE OR REPLACE FUNCTION fn_enforce_pr_approvals()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT fn_check_pr_approvals(NEW.id) THEN
        RAISE EXCEPTION
            'PR chưa đủ số lượng approval yêu cầu (cần % approval)',
            NEW.required_approvals;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger BEFORE UPDATE: chỉ kích hoạt khi status chuyển sang 'merged'
DROP TRIGGER IF EXISTS trg_enforce_pr_approvals ON pull_requests;
CREATE TRIGGER trg_enforce_pr_approvals
BEFORE UPDATE ON pull_requests
FOR EACH ROW
WHEN (OLD.status != 'merged' AND NEW.status = 'merged')
EXECUTE FUNCTION fn_enforce_pr_approvals();
