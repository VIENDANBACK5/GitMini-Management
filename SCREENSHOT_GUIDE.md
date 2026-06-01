# Hướng dẫn chụp ảnh minh chứng — GitMini BTL

> **Cách dùng:** Chạy từng lệnh trong Terminal/PowerShell, chờ kết quả hiển thị
> đầy đủ, chụp màn hình, rồi chạy lệnh tiếp theo.
>
> **Môi trường:** Docker, container `gitmini_db_container`, DB `gitmini_db`, user `gitmini_user`

---

## BƯỚC 0 — Kiểm tra container đang chạy

```bash
docker ps --filter name=gitmini_db_container
```

Nếu container chưa chạy:

```bash
cd C:\Users\IECSACT5070\Desktop\BTL_CSDL\GitMini-Management
docker compose up -d
```

---

## NHÓM A — Cấu trúc Database

### Ảnh A1 — Danh sách 20 bảng và kích thước

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
"
```

**Kết quả mong đợi:** đúng 20 dòng, mỗi dòng là 1 tên bảng và kích thước.

---

### Ảnh A2 — Danh sách trigger

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SELECT trigger_name, event_object_table, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
"
```

**Kết quả mong đợi:** 6 trigger (trg_branch_changes, trg_commit_changes,
trg_enforce_pr_approvals, trg_init_stats_on_repo_create, trg_issue_changes,
trg_pr_changes, trg_prevent_self_review).

---

### Ảnh A3 — Danh sách index

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"
```

**Kết quả mong đợi:** 30+ index, trong đó có 2 index GIN
(`idx_issues_search`, `idx_commits_message_search`).

---

### Ảnh A4 — Danh sách RLS policy

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
"
```

**Kết quả mong đợi:** 6 policy trên 5 bảng
(commits, issues, pull\_requests, repo\_members, repositories).

---

### Ảnh A5 — RBAC: quyền theo role

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('git_admin','git_developer','git_reviewer')
ORDER BY grantee, table_name, privilege_type;
"
```

**Kết quả mong đợi:** git\_admin có ALL, git\_developer có SELECT + INSERT/UPDATE
trên các bảng cụ thể, git\_reviewer kế thừa git\_developer.

---

## NHÓM B — Dữ liệu sau Seed

> Nếu chưa seed, chạy trước:
> ```bash
> cd C:\Users\IECSACT5070\Desktop\BTL_CSDL\GitMini-Management
> python scripts/seed_data.py --profile demo
> ```

### Ảnh B1 — Số bản ghi từng bảng

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SELECT 'users'                   AS tbl, COUNT(*) AS rows FROM users
UNION ALL SELECT 'repositories',          COUNT(*) FROM repositories
UNION ALL SELECT 'repo_members',          COUNT(*) FROM repo_members
UNION ALL SELECT 'commits',               COUNT(*) FROM commits
UNION ALL SELECT 'commit_parents',        COUNT(*) FROM commit_parents
UNION ALL SELECT 'branches',             COUNT(*) FROM branches
UNION ALL SELECT 'issues',               COUNT(*) FROM issues
UNION ALL SELECT 'pull_requests',        COUNT(*) FROM pull_requests
UNION ALL SELECT 'pull_request_reviews', COUNT(*) FROM pull_request_reviews
UNION ALL SELECT 'audit_logs',           COUNT(*) FROM audit_logs
UNION ALL SELECT 'repo_stats',           COUNT(*) FROM repo_stats
UNION ALL SELECT 'file_blobs',           COUNT(*) FROM file_blobs
UNION ALL SELECT 'commit_files',         COUNT(*) FROM commit_files
UNION ALL SELECT 'repository_languages', COUNT(*) FROM repository_languages
UNION ALL SELECT 'tags',                 COUNT(*) FROM tags
UNION ALL SELECT 'releases',             COUNT(*) FROM releases
UNION ALL SELECT 'issue_comments',       COUNT(*) FROM issue_comments
UNION ALL SELECT 'pull_request_comments',COUNT(*) FROM pull_request_comments
UNION ALL SELECT 'ci_runs',              COUNT(*) FROM ci_runs
UNION ALL SELECT 'backup_jobs',          COUNT(*) FROM backup_jobs
ORDER BY tbl;
"
```

**Kết quả mong đợi (profile demo):**

| Bảng | Khoảng |
|------|--------|
| users | 100 |
| repositories | 20 |
| commits | 1.000 |
| issues | 300 |
| pull\_requests | 80 |
| pull\_request\_reviews | > 0 |
| audit\_logs | > 0 |
| commit\_parents (ordinal=1) | > 0 |

---

### Ảnh B2 — repo_stats tự động cập nhật qua trigger

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SELECT r.name,
       rs.commit_count,
       rs.branch_count,
       rs.issue_open_count,
       rs.issue_closed_count,
       rs.pr_open_count,
       rs.pr_merged_count,
       rs.latest_commit_time
FROM repo_stats rs
JOIN repositories r ON r.id = rs.repo_id
ORDER BY rs.commit_count DESC
LIMIT 10;
"
```

**Kết quả mong đợi:** commit\_count > 0, các cột thống kê khác đều có giá trị
(chứng minh trigger hoạt động).

---

### Ảnh B3 — DAG: merge commit thực tế (ordinal = 1)

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SELECT cp.commit_hash,
       cp.parent_hash,
       cp.ordinal,
       c.message,
       c.created_at
FROM commit_parents cp
JOIN commits c ON c.commit_hash = cp.commit_hash
WHERE cp.ordinal = 1
LIMIT 10;
"
```

**Kết quả mong đợi:** có bản ghi với `ordinal = 1` — đây là merge parent,
chứng minh cấu trúc DAG không chỉ là chuỗi tuyến tính.

---

## NHÓM C — EXPLAIN ANALYZE (Minh chứng tối ưu)

> Các lệnh này PHẢI chạy sau khi đã seed dữ liệu.
> Chú ý trong output tìm các dòng:
> - `Index Scan` / `Bitmap Index Scan` → index đang được dùng
> - `Execution Time:` → thời gian thực tế
> - `Buffers:` → số block đọc từ cache

### Ảnh C1 — Composite Index: Commit History

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT commit_hash, message, created_at
FROM commits
WHERE repo_id = (SELECT id FROM repositories ORDER BY RANDOM() LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;
"
```

**Tìm trong output:**
```
Index Scan using idx_commits_repo_time on commits
Execution Time: X.XXX ms
```

---

### Ảnh C2 — GIN Index: Full-text Search trên issues

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title
FROM issues
WHERE search_vector @@ to_tsquery('english', 'login | error')
LIMIT 10;
"
```

**Tìm trong output:**
```
Bitmap Index Scan on idx_issues_search
Execution Time: X.XXX ms
```

---

### Ảnh C3 — Recursive CTE: Duyệt đồ thị DAG

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
WITH RECURSIVE commit_history AS (
    SELECT commit_hash, parent_hash, 1 AS depth
    FROM commit_parents
    WHERE commit_hash = (
        SELECT head_commit_hash FROM branches
        WHERE name = 'main' AND head_commit_hash IS NOT NULL
        LIMIT 1
    )
  UNION ALL
    SELECT cp.commit_hash, cp.parent_hash, ch.depth + 1
    FROM commit_parents cp
    JOIN commit_history ch ON cp.commit_hash = ch.parent_hash
    WHERE ch.depth < 100
)
SELECT * FROM commit_history LIMIT 50;
"
```

**Tìm trong output:**
```
Recursive Union
Index Scan using idx_parents_commit on commit_parents
Execution Time: X.XXX ms
```

---

### Ảnh C4 — Primary Key Lookup: Dashboard repo_stats

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT commit_count, issue_open_count, pr_open_count,
       latest_commit_hash, latest_commit_time
FROM repo_stats
WHERE repo_id = (SELECT id FROM repositories LIMIT 1);
"
```

**Tìm trong output:**
```
Index Scan using repo_stats_pkey on repo_stats
Execution Time: 0.0XX ms    ← phải dưới 1ms
```

---

## NHÓM D — Bảo mật RLS & RBAC

### Ảnh D1 — RLS chặn repo private với user lạ

**Lệnh 1** — user lạ (không phải member):

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SET app.current_user_id = '00000000-0000-0000-0000-000000000000';
SET app.current_username = 'stranger';
SELECT name, is_private FROM repositories ORDER BY is_private DESC LIMIT 10;
"
```

**Lệnh 2** — user alice (owner):

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SET app.current_user_id = (SELECT id::text FROM users WHERE username = 'alice');
SET app.current_username = 'alice';
SELECT name, is_private FROM repositories ORDER BY is_private DESC LIMIT 10;
"
```

**So sánh:**
- Lệnh 1: chỉ thấy repo có `is_private = false`
- Lệnh 2: thấy thêm repo private của alice

> Chụp cả 2 kết quả trong cùng 1 ảnh (kéo terminal lên để thấy cả 2).

---

### Ảnh D2 — RBAC: git_developer bị chặn DELETE

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SET ROLE git_developer;
DELETE FROM commits WHERE 1=1;
"
```

**Kết quả mong đợi:**
```
ERROR:  permission denied for table commits
```

---

### Ảnh D3 — Trigger chặn tự approve PR của chính mình

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
DO \$\$
DECLARE
  v_pr_id    UUID;
  v_author_id UUID;
BEGIN
  SELECT id, author_id INTO v_pr_id, v_author_id
  FROM pull_requests
  WHERE author_id IS NOT NULL
  LIMIT 1;

  INSERT INTO pull_request_reviews (id, pull_request_id, reviewer_id, status)
  VALUES (gen_random_uuid(), v_pr_id, v_author_id, 'approved');
END \$\$;
"
```

**Kết quả mong đợi:**
```
ERROR:  Reviewer không thể là tác giả của Pull Request
```

---

## NHÓM E — Backup & Restore

### Ảnh E1 — Logical Backup bằng pg_dump

```bash
docker exec gitmini_db_container pg_dump -U gitmini_user -d gitmini_db -F c -f /tmp/gitmini_backup_demo.bak
docker exec gitmini_db_container ls -lh /tmp/gitmini_backup_demo.bak
```

**Kết quả mong đợi:** file `.bak` có kích thước vài trăm KB.

---

### Ảnh E2 — Kiểm tra nội dung file backup

```bash
docker exec gitmini_db_container pg_restore --list /tmp/gitmini_backup_demo.bak | head -50
```

**Kết quả mong đợi:** danh sách các bảng, sequence, index, trigger bên trong file backup.

---

### Ảnh E3 — Restore thử vào database tạm

```bash
docker exec gitmini_db_container psql -U gitmini_user -d postgres -c "CREATE DATABASE gitmini_restore_test;"
docker exec gitmini_db_container pg_restore -U gitmini_user -d gitmini_restore_test /tmp/gitmini_backup_demo.bak
docker exec gitmini_db_container psql -U gitmini_user -d gitmini_restore_test -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
"
```

**Kết quả mong đợi:** database mới `gitmini_restore_test` có đủ 20 bảng — chứng minh restore thành công.

---

### Ảnh E4 — Xem lịch sử backup_jobs trong DB

```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db -c "
SELECT id, job_type, status, backup_path, started_at, finished_at
FROM backup_jobs
ORDER BY started_at DESC;
"
```

**Kết quả mong đợi:** 2 bản ghi (full + restore\_test) được seed vào bảng `backup_jobs`.

---

## TỔNG KẾT — 17 ảnh cần chụp

| Nhóm | Ảnh | Nội dung | Dùng cho tài liệu |
|------|-----|----------|-------------------|
| A | A1 | 20 bảng + kích thước | Lược đồ vật lý |
| A | A2 | Danh sách trigger | Trigger automation |
| A | A3 | Danh sách index | Tối ưu index |
| A | A4 | RLS policy | Bảo mật RLS |
| A | A5 | RBAC quyền theo role | Bảo mật RBAC |
| B | B1 | Số bản ghi 20 bảng | Seed data |
| B | B2 | repo\_stats sau trigger | Trigger hoạt động |
| B | B3 | Merge commit ordinal=1 | Cấu trúc DAG |
| C | C1 | EXPLAIN composite index | Tối ưu query |
| C | C2 | EXPLAIN GIN full-text | Tối ưu query |
| C | C3 | EXPLAIN Recursive CTE | Kỹ thuật nâng cao |
| C | C4 | EXPLAIN PK lookup | Phi chuẩn hóa |
| D | D1 | RLS chặn repo private | Bảo mật RLS |
| D | D2 | RBAC chặn DELETE | Bảo mật RBAC |
| D | D3 | Trigger chặn self-approve | Trigger business rule |
| E | E1 | pg\_dump tạo file backup | Backup & Restore |
| E | E2 | pg\_restore kiểm tra | Backup & Restore |

---

## Lưu ý khi chụp màn hình

1. **Phóng to font** terminal trước khi chụp: `Ctrl + Scroll` hoặc chỉnh font size 14+
2. **Chụp toàn bộ output** — không cắt bớt dòng, đặc biệt các ảnh EXPLAIN ANALYZE
3. **Đặt tên file ảnh** theo mã: `A1_tables.png`, `C2_gin_index.png`...
4. **Ảnh D1** cần chụp **2 lệnh liên tiếp** trong cùng 1 ảnh để thấy sự khác biệt
5. Nếu output dài hơn màn hình, scroll lên rồi chụp nhiều ảnh, đặt tên `C3a`, `C3b`...
