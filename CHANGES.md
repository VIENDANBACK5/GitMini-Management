# GitMini — Tài liệu Cải tiến CSDL

> Đây là tóm tắt **8 fix** đã thực hiện trên hệ thống GitMini để đạt chuẩn môn
> Quản trị CSDL Nâng cao. Mỗi mục ghi rõ: **vấn đề gốc**, **giải pháp**, **file
> thay đổi**, và **cách kiểm tra**.

---

## Mục lục nhanh

| # | Vấn đề | File thay đổi |
|---|--------|---------------|
| [Fix 1](#fix-1--rls-policy-bảo-mật-thực-sự) | RLS policy commits/issues/PRs không lọc theo private/member | `05_security_rls.sql` |
| [Fix 2](#fix-2--generated-column-search_vector) | Full-text search dùng expression index không nhất quán | `01_schema.sql`, `02_indexes.sql` |
| [Fix 3](#fix-3--ngăn-tự-approve-pr-của-chính-mình) | Không có gì ngăn author tự approve PR của mình | `03_triggers.sql` |
| [Fix 4](#fix-4--mở-rộng-check-constraint) | `pull_request_reviews.status` chỉ có 1 giá trị; `backup_jobs.job_type` thiếu `incremental` | `01_schema.sql` |
| [Fix 5](#fix-5--viết-lại-08_phase4_pr_governancesql) | File 08 chỉ chứa code trùng lặp, không có giá trị thực | `08_phase4_pr_governance.sql` |
| [Fix 6](#fix-6--seed-đầy-đủ-audit_logs-reviews-dag) | `audit_logs` và `pull_request_reviews` trống sau seed; DAG chỉ là chuỗi tuyến tính | `scripts/seed_data.py` |
| [Fix 7](#fix-7--migration-script--readme) | Không có script chạy migration tự động, không có hướng dẫn thứ tự | `scripts/run_migrations.sh` *(mới)*, `sql/README.md` *(mới)* |
| [Fix 8](#fix-8--benchmark-queries-tự-chứa) | Query benchmark dùng placeholder thủ công, thiếu BUFFERS/FORMAT TEXT | `06_benchmark_queries.sql` |

---

## Fix 1 — RLS Policy bảo mật thực sự

### Vấn đề gốc
Ba policy `commit_access_policy`, `issue_access_policy`, `pull_request_access_policy`
chỉ kiểm tra `EXISTS(repo)` — tức là bất kỳ ai biết `repo_id` đều đọc được commits,
issues, PRs của **repo private**. Đây là lỗ hổng bảo mật logic.

```sql
-- TRƯỚC (sai): chỉ kiểm tra repo tồn tại, không kiểm tra quyền truy cập
CREATE POLICY commit_access_policy ON commits FOR SELECT
USING (EXISTS (SELECT 1 FROM repositories r WHERE r.id = commits.repo_id));
```

### Giải pháp
Thay logic `USING` bằng điều kiện đầy đủ: admin **OR** (repo public **OR** owner **OR** member).
Thêm `FORCE ROW LEVEL SECURITY` cho commits, issues, pull_requests.

```sql
-- SAU (đúng): kiểm tra is_private + owner + member
CREATE POLICY commit_access_policy ON commits FOR SELECT
USING (
    current_setting('app.current_username', true) = 'admin'
    OR EXISTS (
        SELECT 1 FROM repositories r WHERE r.id = commits.repo_id
        AND (
            r.is_private = FALSE
            OR r.owner_id::text = current_setting('app.current_user_id', true)
            OR EXISTS (SELECT 1 FROM repo_members rm
                       WHERE rm.repo_id = r.id
                         AND rm.user_id::text = current_setting('app.current_user_id', true))
        )
    )
);
ALTER TABLE commits FORCE ROW LEVEL SECURITY;
```

**File:** `sql/05_security_rls.sql` — dòng 54–127

**Kiểm tra:**
```sql
SET app.current_user_id = '<id-nguoi-khong-phai-member>';
SET app.current_username = 'stranger';
SELECT * FROM commits WHERE repo_id = '<private-repo-id>';
-- Kết quả mong đợi: 0 hàng
```

---

## Fix 2 — Generated Column `search_vector`

### Vấn đề gốc
File schema không có `search_vector`, nhưng file index lại dùng expression GIN index
tính `to_tsvector()` trực tiếp. Không nhất quán — nếu giảng viên hỏi tại sao dùng
expression thay vì generated column thì không trả lời được.

### Giải pháp
Thêm generated column `search_vector tsvector GENERATED ALWAYS AS (...) STORED`
vào bảng `issues`. Đổi GIN index sang index trên column này.

```sql
-- 01_schema.sql: thêm sau định nghĩa bảng issues
ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || COALESCE(body, ''))
    ) STORED;

-- 02_indexes.sql: đổi index
DROP INDEX IF EXISTS idx_issues_search;
CREATE INDEX IF NOT EXISTS idx_issues_search ON issues USING GIN (search_vector);
```

**Lý do STORED tốt hơn expression index:**
- Expression index tính lại `to_tsvector()` mỗi lần query chạy
- STORED column tính một lần khi INSERT/UPDATE, lưu vật lý → query chỉ đọc không tính

**Files:** `sql/01_schema.sql` dòng 92–98, `sql/02_indexes.sql` dòng 39–41

**Kiểm tra:**
```sql
SELECT id, title, search_vector FROM issues LIMIT 1;
-- Kết quả mong đợi: search_vector có giá trị tsvector không null

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title FROM issues
WHERE search_vector @@ to_tsquery('english', 'login');
-- Kết quả mong đợi: Bitmap Index Scan trên idx_issues_search
```

---

## Fix 3 — Ngăn tự approve PR của chính mình

### Vấn đề gốc
Không có constraint hay trigger nào ngăn author của một PR tự tạo review
`status='approved'` cho chính PR đó. Vi phạm business rule cơ bản của mọi
hệ thống code review.

### Giải pháp
Thêm trigger `BEFORE INSERT` vào `pull_request_reviews` kiểm tra reviewer ≠ author.

```sql
CREATE OR REPLACE FUNCTION fn_check_self_review()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reviewer_id = (
        SELECT author_id FROM pull_requests WHERE id = NEW.pull_request_id
    ) THEN
        RAISE EXCEPTION 'Reviewer không thể là tác giả của Pull Request';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_self_review ON pull_request_reviews;
CREATE TRIGGER trg_prevent_self_review
BEFORE INSERT ON pull_request_reviews
FOR EACH ROW EXECUTE FUNCTION fn_check_self_review();
```

**File:** `sql/03_triggers.sql` — dòng 138–154

**Kiểm tra:**
```sql
-- Lấy id của một PR và author của nó
SELECT id, author_id FROM pull_requests LIMIT 1;

-- Thử insert review với reviewer = author (phải bị chặn)
INSERT INTO pull_request_reviews (pull_request_id, reviewer_id, status)
VALUES ('<pr_id>', '<author_id_cua_pr_do>', 'approved');
-- Kết quả mong đợi: ERROR: Reviewer không thể là tác giả của Pull Request
```

---

## Fix 4 — Mở rộng CHECK Constraint

### Vấn đề gốc
- `pull_request_reviews.status` chỉ cho phép `'approved'` — không thể lưu trạng thái
  review thực tế như `changes_requested` hay `commented`
- `backup_jobs.job_type` thiếu `'incremental'` — không nhất quán với tài liệu mô tả
  chiến lược PITR và WAL archiving

### Giải pháp
Thêm vào cuối `01_schema.sql` các lệnh `ALTER TABLE DROP/ADD CONSTRAINT`:

```sql
-- Mở rộng trạng thái review
ALTER TABLE pull_request_reviews
    DROP CONSTRAINT IF EXISTS pull_request_reviews_status_check;
ALTER TABLE pull_request_reviews
    ADD CONSTRAINT pull_request_reviews_status_check
    CHECK (status IN ('approved', 'changes_requested', 'commented'));

-- Mở rộng loại backup
ALTER TABLE backup_jobs
    DROP CONSTRAINT IF EXISTS backup_jobs_job_type_check;
ALTER TABLE backup_jobs
    ADD CONSTRAINT backup_jobs_job_type_check
    CHECK (job_type IN ('full', 'incremental', 'restore_test'));
```

**File:** `sql/01_schema.sql` — dòng 154–167

**Kiểm tra:**
```sql
INSERT INTO pull_request_reviews (pull_request_id, reviewer_id, status)
VALUES ('<pr_id>', '<reviewer_id>', 'changes_requested');
-- Kết quả mong đợi: INSERT thành công

INSERT INTO backup_jobs (job_type, status)
VALUES ('incremental', 'success');
-- Kết quả mong đợi: INSERT thành công
```

---

## Fix 5 — Viết lại `08_phase4_pr_governance.sql`

### Vấn đề gốc
File cũ chỉ chứa lại đúng định nghĩa bảng `pull_request_reviews` và 2 index
đã có trong `01_schema.sql` và `02_indexes.sql` — **trùng lặp 100%**, không
có giá trị thực cho báo cáo.

### Giải pháp
Viết lại hoàn toàn với nội dung thực sự có ý nghĩa về PR governance:

| Thành phần | Mô tả |
|---|---|
| `required_approvals INT DEFAULT 1` | Cột mới trong `pull_requests` — số approval tối thiểu |
| `fn_check_pr_approvals(pr_id)` | Hàm trả về TRUE/FALSE: đếm approved reviews ≥ required |
| `fn_enforce_pr_approvals()` | Trigger function: RAISE EXCEPTION nếu chưa đủ approval |
| `trg_enforce_pr_approvals` | BEFORE UPDATE ON pull_requests WHEN status → 'merged' |

**Luồng hoạt động:**
```
User SET pull_requests.status = 'merged'
    → trg_enforce_pr_approvals kích hoạt
    → fn_enforce_pr_approvals() gọi fn_check_pr_approvals()
    → Đếm approved reviews, so sánh với required_approvals
    → Nếu chưa đủ → RAISE EXCEPTION → UPDATE bị hủy
    → Nếu đủ → UPDATE thành công
```

**File:** `sql/08_phase4_pr_governance.sql` — toàn bộ file

**Kiểm tra:**
```sql
-- Tạo PR chưa có review nào
INSERT INTO pull_requests (repo_id, author_id, title, source_branch, target_branch)
VALUES ('<repo>', '<user>', 'Test PR', 'feature', 'main')
RETURNING id;

-- Thử merge khi chưa có approval (phải bị chặn)
UPDATE pull_requests SET status = 'merged' WHERE id = '<pr_id>';
-- Kết quả mong đợi: ERROR: PR chưa đủ số lượng approval yêu cầu (cần 1 approval)
```

---

## Fix 6 — Seed đầy đủ: audit_logs, reviews, DAG

### Vấn đề gốc
Sau khi chạy `seed_data.py`:
- Bảng `audit_logs` hoàn toàn trống → không demo được tính năng audit
- Bảng `pull_request_reviews` hoàn toàn trống → không demo được approval workflow
- `commit_parents` chỉ là chuỗi thẳng (ordinal=0 tất cả) → không có merge commit nào để demo cấu trúc DAG

### Giải pháp
Thêm 3 hàm mới vào `scripts/seed_data.py`:

**`seed_audit_logs(cur, user_ids, repo_ids, batch_size)`**
Tạo 4 loại log bằng cách query DB:
- `create_repo` — 1 log mỗi repo
- `push_commit` — 1 log mỗi 5 commit
- `close_issue` — 1 log mỗi issue có `status='closed'`
- `merge_pr` — 1 log mỗi PR có `status='merged'`

**`seed_pr_reviews(cur, user_ids, batch_size)`**
- Mỗi PR `status='merged'` → 1 review `approved` (reviewer ≠ author)
- 20% PR `status='open'` → 1 review `changes_requested` hoặc `commented` (random)

**`seed_merge_commits(cur, commits_by_repo, batch_size)`**
- Với mỗi repo ≥ 10 commits: tạo 1–2 bản ghi `commit_parents` với `ordinal=1`
- Đây là merge parent — thể hiện cấu trúc DAG thực tế

**File:** `scripts/seed_data.py` — hàm mới dòng 614–747, lời gọi dòng 783–790

**Kết quả sau seed demo:**
```
audit_logs:       ~260 bản ghi  (20 create_repo + ~200 push_commit + ~75 close_issue + ~20 merge_pr)
pull_request_reviews: ~20 bản ghi  (merged PRs + 20% open PRs)
commit_parents (ordinal=1): ~40 bản ghi  (2 merge per repo × 20 repos)
```

---

## Fix 7 — Migration Script & README

### Vấn đề gốc
Không có file nào hướng dẫn thứ tự chạy migration. Người mới vào dự án (hoặc
giảng viên kiểm tra) phải tự đoán thứ tự từ tên file — dễ chạy sai thứ tự.

### Giải pháp

**`scripts/run_migrations.sh`** — script bash tự động:
```bash
set -euo pipefail          # dừng ngay nếu bất kỳ bước nào lỗi
source .env                # đọc DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
# Chạy 7 bước theo thứ tự: 01 → 02 → 03 → 04 → 05 → 08 → 09
# In thông báo bắt đầu/kết thúc từng bước
```

**`sql/README.md`** — hướng dẫn đầy đủ:
- Bảng thứ tự migration với giải thích từng file
- Lệnh rollback (DOWN)
- Lệnh seed demo và benchmark
- Lệnh Docker đầy đủ cho từng bước
- Cách set biến session RLS

---

## Fix 8 — Benchmark Queries tự chứa

### Vấn đề gốc
File `06_benchmark_queries.sql` có 8 query nhưng dùng placeholder
`'<repo_id_can_test>'` — phải thay thủ công mới chạy được. Không có
`BUFFERS` và `FORMAT TEXT` nên output kém chi tiết.

### Giải pháp
Thêm **Section B** vào cuối file: 4 query tự chứa dùng subquery thay
placeholder, format đầy đủ cho báo cáo.

| Query | Index kiểm chứng | Kết quả mong đợi |
|---|---|---|
| Composite Index — Commit History | `idx_commits_repo_time` | Index Scan, không Seq Scan |
| GIN — Full-text Search | `idx_issues_search` (GIN trên `search_vector`) | Bitmap Index Scan |
| Recursive CTE — DAG traversal | `idx_parents_commit` | CTE Scan với WorkTable Scan |
| Dashboard — repo_stats | PK lookup trên `repo_stats` | Index Scan cost ~0.15..8 |

```sql
-- Ví dụ format đầy đủ:
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title FROM issues
WHERE search_vector @@ to_tsquery('english', 'login | error')
LIMIT 10;
```

**File:** `sql/06_benchmark_queries.sql` — dòng 116–170

---

## Cách chạy lại toàn bộ để kiểm tra

### Reset + Migration

```bash
# 1. Reset sạch
docker compose exec postgres psql -U gitmini -d gitmini_db -f /sql/00_down.sql

# 2. Chạy migration tự động
bash scripts/run_migrations.sh
```

### Seed dữ liệu

```bash
python scripts/seed_data.py --profile demo
```

Output mong đợi:
```
--- Bắt đầu seed GitMini profile=demo ---
Đang tạo users...
Đang tạo repositories...
Đang tạo commits...
...
Đang tạo audit logs...
Đã tạo 260 audit_logs bản ghi.
Đang tạo pull request reviews...
Đã tạo 20 pull_request_reviews bản ghi.
Đang tạo merge commits (DAG ordinal=1)...
Đã tạo 40 merge commit relationships (ordinal=1).
--- Hoàn tất seed profile=demo trong X.XX giây ---
```

### Kiểm tra nhanh sau seed

```sql
-- Đếm bản ghi từng bảng
SELECT 'users'                AS tbl, COUNT(*) FROM users
UNION ALL SELECT 'repositories',       COUNT(*) FROM repositories
UNION ALL SELECT 'commits',            COUNT(*) FROM commits
UNION ALL SELECT 'issues',             COUNT(*) FROM issues
UNION ALL SELECT 'pull_requests',      COUNT(*) FROM pull_requests
UNION ALL SELECT 'audit_logs',         COUNT(*) FROM audit_logs
UNION ALL SELECT 'pull_request_reviews', COUNT(*) FROM pull_request_reviews
UNION ALL SELECT 'commit_parents (merge)', COUNT(*) FROM commit_parents WHERE ordinal = 1;
```

### Chạy benchmark queries

```bash
docker compose exec postgres psql -U gitmini -d gitmini_db -f /sql/06_benchmark_queries.sql
```

Kết quả 4 query trong **Section B** là phần minh chứng đưa vào báo cáo
`docs/05_minh_chung_toi_uu_explain.md`.

---

## Tổng quan file thay đổi

```
sql/
├── 01_schema.sql          ← Thêm search_vector generated column + 2 ALTER TABLE constraint
├── 02_indexes.sql         ← Đổi GIN index issues sang search_vector column
├── 03_triggers.sql        ← Thêm fn_check_self_review + trg_prevent_self_review
├── 05_security_rls.sql    ← Sửa 3 RLS policy + thêm FORCE RLS cho 3 bảng
├── 06_benchmark_queries.sql ← Thêm Section B: 4 query tự chứa
├── 08_phase4_pr_governance.sql ← Viết lại hoàn toàn (required_approvals, triggers)
└── README.md              ← MỚI: hướng dẫn migration

scripts/
├── seed_data.py           ← Thêm 3 hàm: seed_audit_logs, seed_pr_reviews, seed_merge_commits
└── run_migrations.sh      ← MỚI: script bash chạy migration tự động
```

---

*Tài liệu này mô tả trạng thái dự án sau khi áp dụng 8 fix — ngày 2026-05-05.*
