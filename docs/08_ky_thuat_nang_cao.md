# GitMini — Tài liệu kỹ thuật nâng cao

## 1. Mục đích tài liệu

Tài liệu này trình bày các kỹ thuật cơ sở dữ liệu nâng cao được áp dụng hoặc đề xuất cho GitMini. Một số kỹ thuật đã có script triển khai trong project, một số kỹ thuật được trình bày ở mức thiết kế/mở rộng.

Các kỹ thuật chính:

1. Commit graph dạng DAG.
2. Recursive CTE.
3. Full-text Search với GIN index.
4. Denormalization có kiểm soát.
5. Trigger tự động cập nhật thống kê.
6. RBAC.
7. Row-Level Security.
8. Backup, WAL và Point-in-Time Recovery.
9. Replication.
10. Sharding theo `repo_id`.

---

## 2. Commit graph dạng DAG

## 2.1. Lý thuyết

Trong Git, lịch sử commit không phải là danh sách tuyến tính đơn giản. Nó là một đồ thị có hướng không chu trình, gọi là DAG.

Đặc điểm:

- Mỗi commit là một node.
- Cạnh từ commit con trỏ về commit cha.
- Commit thường có một parent.
- Merge commit có thể có hai hoặc nhiều parent.
- Không có chu trình vì commit mới không thể là tổ tiên của chính nó.

## 2.2. Cài đặt trong GitMini

GitMini dùng hai bảng:

```text
commits
commit_parents
```

Bảng `commits` lưu thông tin commit:

```sql
CREATE TABLE IF NOT EXISTS commits (
    commit_hash CHAR(40) PRIMARY KEY,
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Bảng `commit_parents` lưu quan hệ cha-con:

```sql
CREATE TABLE IF NOT EXISTS commit_parents (
    commit_hash CHAR(40) REFERENCES commits(commit_hash) ON DELETE CASCADE,
    parent_hash CHAR(40) REFERENCES commits(commit_hash) ON DELETE CASCADE,
    ordinal INT DEFAULT 0,
    PRIMARY KEY (commit_hash, parent_hash)
);
```

## 2.3. Minh chứng thiết kế

Thiết kế này hỗ trợ merge commit vì một `commit_hash` có thể xuất hiện nhiều lần với các `parent_hash` khác nhau.

Ví dụ:

| commit_hash | parent_hash | ordinal |
|---|---|---:|
| merge_commit | main_head | 0 |
| merge_commit | feature_head | 1 |

---

## 3. Recursive CTE

## 3.1. Lý thuyết

Recursive CTE cho phép truy vấn dữ liệu có cấu trúc phân cấp hoặc đồ thị ngay trong SQL.

Trong GitMini, Recursive CTE dùng để lấy lịch sử commit từ HEAD về root commit.

## 3.2. Query mẫu

```sql
WITH RECURSIVE commit_history AS (
    SELECT c.commit_hash, c.message, c.created_at, 0 AS depth
    FROM commits c
    WHERE c.commit_hash = '<head_commit_hash>'

    UNION ALL

    SELECT parent.commit_hash,
           parent.message,
           parent.created_at,
           ch.depth + 1
    FROM commit_history ch
    JOIN commit_parents cp ON cp.commit_hash = ch.commit_hash
    JOIN commits parent ON parent.commit_hash = cp.parent_hash
)
SELECT *
FROM commit_history
ORDER BY depth;
```

## 3.3. Ý nghĩa

Nếu xử lý ở tầng ứng dụng, mỗi bước duyệt parent có thể cần một query riêng, gây N+1 query. Recursive CTE đẩy toàn bộ việc duyệt lịch sử xuống PostgreSQL.

---

## 4. Full-text Search với GIN index

## 4.1. Lý thuyết

Tìm kiếm bằng `LIKE '%keyword%'` thường không tận dụng được B-tree index và chậm khi bảng lớn. PostgreSQL cung cấp Full-text Search thông qua `to_tsvector`, `plainto_tsquery` và GIN index.

## 4.2. Cài đặt trong GitMini

Tìm kiếm issue:

```sql
CREATE INDEX IF NOT EXISTS idx_issues_search
ON issues USING GIN (to_tsvector('english', title || ' ' || body));
```

Tìm kiếm commit message:

```sql
CREATE INDEX IF NOT EXISTS idx_commits_message_search
ON commits USING GIN (to_tsvector('english', message));
```

## 4.3. Query mẫu

```sql
SELECT id, title, status
FROM issues
WHERE to_tsvector('english', title || ' ' || body)
      @@ plainto_tsquery('english', 'login bug');
```

## 4.4. Minh chứng

Minh chứng hiệu năng sẽ được đo bằng `EXPLAIN ANALYZE` trong tài liệu `05_minh_chung_toi_uu_explain.md`.

---

## 5. Denormalization có kiểm soát

## 5.1. Lý thuyết

Chuẩn hóa giúp giảm dư thừa dữ liệu, nhưng với các màn hình đọc nhiều như dashboard, việc tính toán `COUNT(*)` liên tục trên bảng lớn có thể chậm.

Denormalization có kiểm soát là việc lưu sẵn một số dữ liệu tổng hợp để tăng tốc đọc, nhưng vẫn duy trì tính nhất quán bằng trigger hoặc transaction.

## 5.2. Cài đặt trong GitMini

GitMini dùng bảng:

```text
repo_stats
```

Bảng này lưu:

- `commit_count`
- `issue_open_count`
- `issue_closed_count`
- `pr_open_count`
- `pr_merged_count`
- `latest_commit_hash`
- `latest_commit_time`
- `latest_commit_msg`

## 5.3. Đánh đổi

| Chuẩn hóa nghiêm ngặt | Denormalization bằng `repo_stats` |
|---|---|
| Không dư thừa dữ liệu | Có dữ liệu tổng hợp lưu sẵn |
| Ghi đơn giản hơn | Ghi phải cập nhật thêm thống kê |
| Đọc dashboard chậm hơn khi dữ liệu lớn | Đọc dashboard nhanh hơn |
| Phải `COUNT(*)` nhiều bảng | Chỉ đọc một dòng theo `repo_id` |

---

## 6. Trigger tự động cập nhật thống kê

## 6.1. Lý thuyết

Trigger là thủ tục tự động chạy khi có sự kiện `INSERT`, `UPDATE`, `DELETE` trên bảng.

GitMini dùng trigger để cập nhật `repo_stats` trong cùng transaction với thao tác ghi chính.

## 6.2. Cài đặt hiện tại

Script:

```text
sql/03_triggers.sql
```

Các trigger:

| Trigger | Bảng | Mục đích |
|---|---|---|
| `trg_init_stats_on_repo_create` | `repositories` | Tạo bản ghi thống kê khi tạo repo |
| `trg_commit_changes` | `commits` | Cập nhật số commit và latest commit |
| `trg_issue_changes` | `issues` | Cập nhật số issue mở/đóng |
| `trg_pr_changes` | `pull_requests` | Cập nhật số PR mở/đã merge |
| `trg_branch_changes` | `branches` | Cập nhật số branch |

## 6.3. Ghi chú

Các trigger thống kê hiện đã bao phủ commit, issue, pull request và branch. Khi benchmark thực tế, cần kiểm tra lại dữ liệu `repo_stats` sau seed để bảo đảm số liệu khớp với bảng gốc.

---

## 7. RBAC — Role-Based Access Control

## 7.1. Lý thuyết

RBAC là mô hình phân quyền theo vai trò. Thay vì cấp quyền trực tiếp cho từng người dùng, hệ thống tạo role và gán quyền cho role.

## 7.2. Cài đặt trong GitMini

Script:

```text
sql/04_security_roles.sql
```

Các role:

| Role | Quyền chính |
|---|---|
| `git_admin` | Toàn quyền trên bảng và sequence |
| `git_developer` | Xem dữ liệu, thêm/sửa commit, issue, branch |
| `git_reviewer` | Kế thừa developer, có quyền cập nhật pull request |

## 7.3. Ý nghĩa

RBAC giúp áp dụng nguyên tắc đặc quyền tối thiểu. Ứng dụng không cần dùng tài khoản superuser để thao tác dữ liệu.

## 7.4. Ghi chú cải thiện

Theo chức năng UC18, developer cần tạo pull request. Vì vậy phase chỉnh SQL nên bổ sung quyền `INSERT` trên bảng `pull_requests` cho `git_developer`.

---

## 8. Row-Level Security

## 8.1. Lý thuyết

Row-Level Security cho phép PostgreSQL kiểm soát quyền truy cập ở mức từng dòng dữ liệu. Đây là kỹ thuật phù hợp với hệ thống multi-tenant.

## 8.2. Cài đặt trong GitMini

Script:

```text
sql/05_security_rls.sql
```

Các bảng bật RLS:

- `repositories`
- `commits`
- `issues`
- `pull_requests`

Policy repository:

```sql
CREATE POLICY repo_access_policy ON repositories
    FOR SELECT
    USING (
        is_private = FALSE
        OR owner_id::text = current_setting('app.current_user_id', true)
    );
```

## 8.3. Ý nghĩa

Policy này cho phép:

- Repo public được xem công khai.
- Repo private chỉ chủ sở hữu được xem.

---

## 9. Backup, WAL và Point-in-Time Recovery

## 9.1. Full backup

GitMini sử dụng `pg_dump` để sao lưu toàn bộ database:

```bash
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -F c "$DB_NAME" > "$BACKUP_DIR/gitmini_$DATE.dump"
```

Script liên quan:

```text
scripts/backup.sh
```

## 9.2. WAL và PITR

Write-Ahead Logging cho phép PostgreSQL ghi log trước khi ghi dữ liệu thật. Khi kết hợp base backup và WAL archive, hệ thống có thể phục hồi về một thời điểm cụ thể.

Ví dụ tình huống:

- Admin xóa nhầm bảng `commits` lúc 10:15.
- Hệ thống phục hồi về 10:14:59 bằng PITR.

---

## 10. Replication

## 10.1. Lý thuyết

Replication tạo bản sao database để tăng tính sẵn sàng và chia tải đọc.

Mô hình đề xuất:

```text
Primary DB  -> nhận INSERT/UPDATE/DELETE
Replica DB  -> phục vụ SELECT
Replica DB  -> dự phòng khi replica khác lỗi
```

## 10.2. Cài đặt đề xuất

Cấu hình phía primary:

```conf
wal_level = replica
max_wal_senders = 10
archive_mode = on
```

Cấu hình phía replica sử dụng `primary_conninfo` để kết nối về primary.

## 10.3. Minh chứng đề xuất

Nếu triển khai thực tế, có thể minh chứng bằng:

```sql
SELECT pg_is_in_recovery();
```

- Trên primary: `false`
- Trên replica: `true`

Hiện tại project mới trình bày replication ở mức thiết kế, chưa có docker-compose replication hoàn chỉnh.

---

## 11. Sharding theo `repo_id`

## 11.1. Lý thuyết

Sharding là phân mảnh dữ liệu theo chiều ngang sang nhiều database/server khác nhau.

Với GitMini, phần lớn truy vấn xoay quanh repository:

- Lấy commit của repo.
- Lấy branch của repo.
- Lấy issue của repo.
- Lấy pull request của repo.

Vì vậy `repo_id` là shard key phù hợp hơn `user_id`.

## 11.2. Chiến lược đề xuất

Dùng hash-based sharding:

```text
shard_number = hash(repo_id) % number_of_shards
```

Ví dụ với 3 shard:

| Điều kiện | Shard |
|---|---|
| `hash(repo_id) % 3 = 0` | Shard 0 |
| `hash(repo_id) % 3 = 1` | Shard 1 |
| `hash(repo_id) % 3 = 2` | Shard 2 |

## 11.3. Ưu điểm

- Phân tán repository đều hơn.
- Giảm tải cho một database duy nhất.
- Hạn chế cross-shard join vì commit, branch, issue đều gắn với `repo_id`.

## 11.4. Trạng thái triển khai

Sharding hiện được trình bày ở mức thiết kế, chưa triển khai vật lý trong project. Đây là phần kỹ thuật nâng cao không bắt buộc nhưng có thể dùng để giải thích khả năng mở rộng hệ thống.

---

## 12. Kết luận

GitMini đã triển khai một số kỹ thuật nâng cao ở mức SQL thật như DAG commit graph, index, GIN full-text search, trigger, RBAC và RLS. Các kỹ thuật như replication và sharding được trình bày ở mức thiết kế mở rộng. Đây là hướng phù hợp với yêu cầu bài tập lớn vì thể hiện được cả thiết kế CSDL, tối ưu hiệu năng, bảo mật và khả năng mở rộng.
