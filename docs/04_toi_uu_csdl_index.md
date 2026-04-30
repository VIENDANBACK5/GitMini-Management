# GitMini — Tài liệu tối ưu CSDL

## 1. Mục đích tài liệu

Tài liệu này mô tả chiến lược tối ưu truy vấn của GitMini thông qua hệ thống chỉ mục. Nội dung dựa trên script `sql/02_indexes.sql`.

Các mục tiêu tối ưu chính:

- Tăng tốc truy vấn `JOIN` qua khóa ngoại.
- Tăng tốc truy vấn commit history theo repository.
- Tăng tốc lọc issue và pull request theo trạng thái.
- Hỗ trợ tìm kiếm toàn văn bản bằng GIN index.
- Tối ưu truy vấn dashboard qua bảng `repo_stats`.

---

## 2. Nguyên tắc thiết kế index

GitMini sử dụng 3 nhóm index chính:

| Nhóm index | Mục đích |
|---|---|
| Index khóa ngoại | Tăng tốc `JOIN` giữa các bảng |
| Composite index | Tối ưu truy vấn có nhiều điều kiện lọc/sắp xếp |
| GIN full-text index | Tối ưu tìm kiếm văn bản trên issue và commit message |

PostgreSQL tự tạo index cho `PRIMARY KEY` và `UNIQUE`, nhưng không tự tạo index cho mọi `FOREIGN KEY`. Vì vậy, các khóa ngoại quan trọng được tạo index thủ công.

---

## 3. Danh sách index và mục đích sử dụng

## 3.1. Index cho khóa ngoại

### `idx_repos_owner`

```sql
CREATE INDEX IF NOT EXISTS idx_repos_owner ON repositories(owner_id);
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `repositories` |
| Cột | `owner_id` |
| Loại | B-tree |
| Mục đích | Tăng tốc truy vấn lấy danh sách repository theo người sở hữu |

Truy vấn sử dụng:

```sql
SELECT *
FROM repositories
WHERE owner_id = :user_id;
```

---

### `idx_commits_repo`

```sql
CREATE INDEX IF NOT EXISTS idx_commits_repo ON commits(repo_id);
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `commits` |
| Cột | `repo_id` |
| Loại | B-tree |
| Mục đích | Tăng tốc truy vấn commit thuộc một repository |

Truy vấn sử dụng:

```sql
SELECT *
FROM commits
WHERE repo_id = :repo_id;
```

---

### `idx_commits_author`

```sql
CREATE INDEX IF NOT EXISTS idx_commits_author ON commits(author_id);
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `commits` |
| Cột | `author_id` |
| Loại | B-tree |
| Mục đích | Tăng tốc truy vấn commit theo tác giả |

Truy vấn sử dụng:

```sql
SELECT *
FROM commits
WHERE author_id = :author_id;
```

---

### `idx_parents_commit`

```sql
CREATE INDEX IF NOT EXISTS idx_parents_commit ON commit_parents(commit_hash);
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `commit_parents` |
| Cột | `commit_hash` |
| Loại | B-tree |
| Mục đích | Tăng tốc tìm parent của một commit |

Truy vấn sử dụng trong recursive CTE:

```sql
SELECT parent_hash
FROM commit_parents
WHERE commit_hash = :commit_hash;
```

---

### `idx_parents_parent`

```sql
CREATE INDEX IF NOT EXISTS idx_parents_parent ON commit_parents(parent_hash);
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `commit_parents` |
| Cột | `parent_hash` |
| Loại | B-tree |
| Mục đích | Tăng tốc tìm các commit con của một parent |

Truy vấn sử dụng:

```sql
SELECT commit_hash
FROM commit_parents
WHERE parent_hash = :parent_hash;
```

---

### Các index khóa ngoại khác

| Index | Bảng | Cột | Mục đích |
|---|---|---|---|
| `idx_branches_repo` | `branches` | `repo_id` | Liệt kê branch của repo |
| `idx_issues_repo` | `issues` | `repo_id` | Liệt kê issue của repo |
| `idx_pr_repo` | `pull_requests` | `repo_id` | Liệt kê pull request của repo |

---

## 3.2. Composite index cho luồng truy vấn chính

### `idx_commits_repo_time`

```sql
CREATE INDEX IF NOT EXISTS idx_commits_repo_time
ON commits(repo_id, created_at DESC);
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `commits` |
| Cột | `repo_id`, `created_at DESC` |
| Loại | Composite B-tree |
| Mục đích | Lấy commit mới nhất của repo theo thứ tự thời gian |

Truy vấn sử dụng:

```sql
SELECT commit_hash, message, created_at
FROM commits
WHERE repo_id = :repo_id
ORDER BY created_at DESC
LIMIT 20;
```

Nếu không có index này, PostgreSQL có thể phải scan nhiều bản ghi rồi sort. Với index, database có thể lọc theo `repo_id` và đọc theo thứ tự `created_at DESC` hiệu quả hơn.

---

### `idx_issues_repo_status`

```sql
CREATE INDEX IF NOT EXISTS idx_issues_repo_status
ON issues(repo_id, status);
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `issues` |
| Cột | `repo_id`, `status` |
| Loại | Composite B-tree |
| Mục đích | Lọc issue theo repository và trạng thái |

Truy vấn sử dụng:

```sql
SELECT *
FROM issues
WHERE repo_id = :repo_id
  AND status = 'open';
```

---

### `idx_pr_repo_status`

```sql
CREATE INDEX IF NOT EXISTS idx_pr_repo_status
ON pull_requests(repo_id, status);
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `pull_requests` |
| Cột | `repo_id`, `status` |
| Loại | Composite B-tree |
| Mục đích | Lọc pull request theo repository và trạng thái |

Truy vấn sử dụng:

```sql
SELECT *
FROM pull_requests
WHERE repo_id = :repo_id
  AND status = 'open';
```

---

## 3.3. GIN index cho Full-text Search

### `idx_issues_search`

```sql
CREATE INDEX IF NOT EXISTS idx_issues_search
ON issues USING GIN (to_tsvector('english', title || ' ' || body));
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `issues` |
| Biểu thức | `to_tsvector('english', title || ' ' || body)` |
| Loại | GIN |
| Mục đích | Tìm kiếm issue theo tiêu đề và nội dung |

Truy vấn sử dụng:

```sql
SELECT id, title, status
FROM issues
WHERE to_tsvector('english', title || ' ' || body)
      @@ plainto_tsquery('english', :keyword);
```

Lý do dùng GIN index: truy vấn `LIKE '%keyword%'` thường không tận dụng được B-tree index và dễ gây sequential scan. GIN index phù hợp cho tìm kiếm full-text.

---

### `idx_commits_message_search`

```sql
CREATE INDEX IF NOT EXISTS idx_commits_message_search
ON commits USING GIN (to_tsvector('english', message));
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `commits` |
| Biểu thức | `to_tsvector('english', message)` |
| Loại | GIN |
| Mục đích | Tìm kiếm commit theo message |

Truy vấn sử dụng:

```sql
SELECT commit_hash, message, created_at
FROM commits
WHERE to_tsvector('english', message)
      @@ plainto_tsquery('english', :keyword);
```

---

## 3.4. Index cho dashboard

### `idx_repo_stats_updated`

```sql
CREATE INDEX IF NOT EXISTS idx_repo_stats_updated
ON repo_stats(updated_at DESC);
```

| Thuộc tính | Giá trị |
|---|---|
| Bảng | `repo_stats` |
| Cột | `updated_at DESC` |
| Loại | B-tree |
| Mục đích | Hỗ trợ truy vấn danh sách repo thống kê mới cập nhật |

Truy vấn sử dụng:

```sql
SELECT *
FROM repo_stats
ORDER BY updated_at DESC
LIMIT 20;
```

---

## 4. Các index có sẵn từ ràng buộc

PostgreSQL tự tạo index cho các ràng buộc sau:

| Bảng | Ràng buộc | Index tự động |
|---|---|---|
| `users` | `PRIMARY KEY(id)` | Có |
| `users` | `UNIQUE(username)` | Có |
| `users` | `UNIQUE(email)` | Có |
| `repositories` | `PRIMARY KEY(id)` | Có |
| `repositories` | `UNIQUE(owner_id, name)` | Có |
| `commits` | `PRIMARY KEY(commit_hash)` | Có |
| `branches` | `UNIQUE(repo_id, name)` | Có |
| `commit_parents` | `PRIMARY KEY(commit_hash, parent_hash)` | Có |

Vì `commit_hash` đã là primary key nên không cần tạo thêm index riêng cho tra cứu chính xác theo hash.

---

## 5. Các truy vấn hot path cần tối ưu

| Truy vấn | Index hỗ trợ |
|---|---|
| Lấy repo theo owner | `idx_repos_owner` |
| Lấy commit mới nhất của repo | `idx_commits_repo_time` |
| Duyệt parent commit | `idx_parents_commit` |
| Tìm commit con | `idx_parents_parent` |
| Lọc issue theo status | `idx_issues_repo_status` |
| Lọc PR theo status | `idx_pr_repo_status` |
| Tìm issue theo keyword | `idx_issues_search` |
| Tìm commit theo message | `idx_commits_message_search` |
| Lấy thống kê repo mới cập nhật | `idx_repo_stats_updated` |

---

## 6. Kết luận

Chiến lược index của GitMini tập trung vào các luồng truy vấn quan trọng nhất: commit history, issue tracking, pull request, dashboard và full-text search. B-tree index được dùng cho quan hệ, lọc và sắp xếp; GIN index được dùng cho tìm kiếm văn bản. Các minh chứng hiệu năng cụ thể sẽ được trình bày trong tài liệu `05_minh_chung_toi_uu_explain.md` sau khi chạy `EXPLAIN ANALYZE` trên dữ liệu seed.
