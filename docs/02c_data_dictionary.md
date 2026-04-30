# GitMini — Data Dictionary

## 1. Mục đích tài liệu

Tài liệu này mô tả chi tiết lược đồ vật lý và từ điển dữ liệu của hệ thống GitMini. Nội dung được xây dựng dựa trên script `sql/01_schema.sql`, sử dụng hệ quản trị PostgreSQL.

GitMini có các bảng chính:

1. `users`
2. `repositories`
3. `repo_members`
4. `commits`
5. `commit_parents`
6. `branches`
7. `issues`
8. `pull_requests`
9. `pull_request_reviews`
10. `audit_logs`
11. `repo_stats`

---

## 2. Lược đồ vật lý tổng quan

| Thành phần | Giá trị sử dụng |
|---|---|
| Hệ quản trị CSDL | PostgreSQL |
| Kiểu khóa chính chính | `UUID` |
| Khóa commit | `CHAR(40)` — mã SHA-1 |
| Kiểu thời gian | `TIMESTAMPTZ` |
| Kiểu văn bản | `VARCHAR`, `TEXT` |
| Kiểu mảng | `TEXT[]` cho nhãn issue |
| Extension | `uuid-ossp` để sinh UUID |

Script khởi tạo extension:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

# 3. Data Dictionary

## 3.1. Bảng `users`

### Mục đích

Lưu thông tin tài khoản người dùng, bao gồm thông tin đăng nhập, hồ sơ cá nhân và trạng thái hoạt động.

### Cấu trúc cột

| Cột | Kiểu dữ liệu | Mục đích | Ràng buộc |
|---|---|---|---|
| `id` | `UUID` | Định danh duy nhất của người dùng | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` |
| `username` | `VARCHAR(50)` | Tên đăng nhập | `NOT NULL`, `UNIQUE` |
| `email` | `VARCHAR(255)` | Email người dùng | `NOT NULL`, `UNIQUE` |
| `password_hash` | `VARCHAR(255)` | Mật khẩu đã băm | `NOT NULL` |
| `full_name` | `VARCHAR(100)` | Họ tên hiển thị | Cho phép `NULL` |
| `bio` | `TEXT` | Mô tả ngắn về người dùng | `DEFAULT ''` |
| `avatar_url` | `VARCHAR(500)` | Đường dẫn ảnh đại diện | Cho phép `NULL` |
| `is_active` | `BOOLEAN` | Trạng thái tài khoản | `DEFAULT TRUE` |
| `created_at` | `TIMESTAMPTZ` | Thời điểm tạo tài khoản | `DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Thời điểm cập nhật gần nhất | `DEFAULT NOW()` |

### Quan hệ

- Một `users` có thể sở hữu nhiều `repositories`.
- Một `users` có thể tạo nhiều `commits`.
- Một `users` có thể tạo hoặc được gán nhiều `issues`.
- Một `users` có thể tạo nhiều `pull_requests`.

---

## 3.2. Bảng `repositories`

### Mục đích

Lưu thông tin kho mã nguồn. Đây là thực thể trung tâm, liên kết với commit, branch, issue, pull request và thống kê.

### Cấu trúc cột

| Cột | Kiểu dữ liệu | Mục đích | Ràng buộc |
|---|---|---|---|
| `id` | `UUID` | Định danh duy nhất của repository | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` |
| `name` | `VARCHAR(100)` | Tên repository | `NOT NULL` |
| `description` | `TEXT` | Mô tả repository | `DEFAULT ''` |
| `owner_id` | `UUID` | Chủ sở hữu repository | `NOT NULL`, `FK -> users(id)`, `ON DELETE CASCADE` |
| `is_private` | `BOOLEAN` | Repo riêng tư hay công khai | `DEFAULT FALSE` |
| `default_branch` | `VARCHAR(100)` | Nhánh mặc định | `DEFAULT 'main'` |
| `stars_count` | `INT` | Số lượt đánh dấu yêu thích | `DEFAULT 0` |
| `forks_count` | `INT` | Số lượt fork | `DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ` | Thời điểm tạo repo | `DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Thời điểm cập nhật gần nhất | `DEFAULT NOW()` |

### Ràng buộc đặc biệt

```sql
UNIQUE(owner_id, name)
```

Ràng buộc này đảm bảo một người dùng không thể tạo hai repository trùng tên.

### Quan hệ

- Nhiều `repositories` thuộc về một `users`.
- Một `repositories` có nhiều `commits`.
- Một `repositories` có nhiều `branches`.
- Một `repositories` có nhiều `issues`.
- Một `repositories` có nhiều `pull_requests`.
- Một `repositories` có một bản ghi `repo_stats`.

---

## 3.3. Bảng `commits`

### Mục đích

Lưu thông tin commit, đại diện cho một snapshot lịch sử mã nguồn. Commit là thực thể lõi của GitMini.

### Cấu trúc cột

| Cột | Kiểu dữ liệu | Mục đích | Ràng buộc |
|---|---|---|---|
| `commit_hash` | `CHAR(40)` | Mã SHA-1 định danh commit | `PRIMARY KEY` |
| `repo_id` | `UUID` | Repository chứa commit | `NOT NULL`, `FK -> repositories(id)`, `ON DELETE CASCADE` |
| `author_id` | `UUID` | Người tạo commit | `FK -> users(id)`, `ON DELETE SET NULL` |
| `message` | `TEXT` | Nội dung thông điệp commit | `NOT NULL` |
| `created_at` | `TIMESTAMPTZ` | Thời điểm tạo commit | `DEFAULT NOW()` |

### Quan hệ

- Nhiều `commits` thuộc về một `repositories`.
- Nhiều `commits` có thể do một `users` tạo.
- Quan hệ cha-con giữa commit được lưu trong bảng `commit_parents`.
- Một commit có thể được nhiều branch trỏ tới qua `branches.head_commit_hash`.

### Ghi chú thiết kế

`commit_hash` dùng `CHAR(40)` vì mã SHA-1 có độ dài cố định 40 ký tự. Đây là thiết kế gần với Git thật hơn so với việc dùng khóa tăng tự động.

---

## 3.4. Bảng `commit_parents`

### Mục đích

Lưu quan hệ cha-con giữa các commit, từ đó biểu diễn commit graph dạng DAG. Bảng này cho phép một commit có nhiều parent, phục vụ merge commit.

### Cấu trúc cột

| Cột | Kiểu dữ liệu | Mục đích | Ràng buộc |
|---|---|---|---|
| `commit_hash` | `CHAR(40)` | Commit con | `FK -> commits(commit_hash)`, `ON DELETE CASCADE` |
| `parent_hash` | `CHAR(40)` | Commit cha | `FK -> commits(commit_hash)`, `ON DELETE CASCADE` |
| `ordinal` | `INT` | Thứ tự parent | `DEFAULT 0` |

### Khóa chính

```sql
PRIMARY KEY (commit_hash, parent_hash)
```

### Quan hệ

- `commit_hash` và `parent_hash` đều tham chiếu tới bảng `commits`.
- Đây là quan hệ tự tham chiếu nhiều-nhiều của bảng `commits`.

### Ghi chú thiết kế

Không đặt `parent_hash` trực tiếp trong bảng `commits` vì merge commit cần nhiều parent. Bảng trung gian `commit_parents` giúp mô hình hóa đúng commit graph dạng DAG.

---

## 3.5. Bảng `branches`

### Mục đích

Lưu các nhánh phát triển của repository. Trong GitMini, branch là một con trỏ tới commit mới nhất của nhánh đó.

### Cấu trúc cột

| Cột | Kiểu dữ liệu | Mục đích | Ràng buộc |
|---|---|---|---|
| `id` | `UUID` | Định danh branch | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` |
| `repo_id` | `UUID` | Repository chứa branch | `NOT NULL`, `FK -> repositories(id)`, `ON DELETE CASCADE` |
| `name` | `VARCHAR(255)` | Tên branch | `NOT NULL` |
| `head_commit_hash` | `CHAR(40)` | Commit mới nhất của branch | `FK -> commits(commit_hash)`, `ON DELETE SET NULL` |
| `is_protected` | `BOOLEAN` | Đánh dấu branch được bảo vệ | `DEFAULT FALSE` |
| `created_at` | `TIMESTAMPTZ` | Thời điểm tạo branch | `DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Thời điểm cập nhật branch | `DEFAULT NOW()` |

### Ràng buộc đặc biệt

```sql
UNIQUE(repo_id, name)
```

Mỗi repository không được có hai branch trùng tên.

### Quan hệ

- Nhiều `branches` thuộc về một `repositories`.
- Nhiều `branches` có thể trỏ tới một `commits`.

---

## 3.6. Bảng `issues`

### Mục đích

Lưu các vấn đề kỹ thuật, lỗi hoặc yêu cầu tính năng của repository.

### Cấu trúc cột

| Cột | Kiểu dữ liệu | Mục đích | Ràng buộc |
|---|---|---|---|
| `id` | `UUID` | Định danh issue | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` |
| `repo_id` | `UUID` | Repository chứa issue | `NOT NULL`, `FK -> repositories(id)`, `ON DELETE CASCADE` |
| `author_id` | `UUID` | Người tạo issue | `FK -> users(id)`, `ON DELETE SET NULL` |
| `assignee_id` | `UUID` | Người được giao xử lý | `FK -> users(id)`, `ON DELETE SET NULL` |
| `title` | `VARCHAR(500)` | Tiêu đề issue | `NOT NULL` |
| `body` | `TEXT` | Nội dung mô tả issue | `DEFAULT ''` |
| `status` | `VARCHAR(20)` | Trạng thái issue | `DEFAULT 'open'`, `CHECK(status IN ('open', 'closed'))` |
| `labels` | `TEXT[]` | Danh sách nhãn | `DEFAULT '{}'` |
| `created_at` | `TIMESTAMPTZ` | Thời điểm tạo issue | `DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Thời điểm cập nhật gần nhất | `DEFAULT NOW()` |
| `closed_at` | `TIMESTAMPTZ` | Thời điểm đóng issue | Cho phép `NULL` |

### Quan hệ

- Nhiều `issues` thuộc về một `repositories`.
- Nhiều `issues` có thể do một `users` tạo.
- Nhiều `issues` có thể được gán cho một `users`.

---

## 3.7. Bảng `pull_requests`

### Mục đích

Lưu yêu cầu hợp nhất mã nguồn từ một branch nguồn vào một branch đích.

### Cấu trúc cột

| Cột | Kiểu dữ liệu | Mục đích | Ràng buộc |
|---|---|---|---|
| `id` | `UUID` | Định danh pull request | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` |
| `repo_id` | `UUID` | Repository chứa PR | `NOT NULL`, `FK -> repositories(id)`, `ON DELETE CASCADE` |
| `author_id` | `UUID` | Người tạo PR | `FK -> users(id)`, `ON DELETE SET NULL` |
| `title` | `VARCHAR(500)` | Tiêu đề PR | `NOT NULL` |
| `body` | `TEXT` | Nội dung mô tả PR | `DEFAULT ''` |
| `status` | `VARCHAR(20)` | Trạng thái PR | `DEFAULT 'open'`, `CHECK(status IN ('open', 'closed', 'merged'))` |
| `source_branch` | `VARCHAR(255)` | Branch nguồn | `NOT NULL` |
| `target_branch` | `VARCHAR(255)` | Branch đích | `NOT NULL`, `DEFAULT 'main'` |
| `merge_commit_hash` | `CHAR(40)` | Commit merge sau khi hợp nhất | `FK -> commits(commit_hash)`, `ON DELETE SET NULL` |
| `created_at` | `TIMESTAMPTZ` | Thời điểm tạo PR | `DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Thời điểm cập nhật PR | `DEFAULT NOW()` |
| `merged_at` | `TIMESTAMPTZ` | Thời điểm merge | Cho phép `NULL` |
| `closed_at` | `TIMESTAMPTZ` | Thời điểm đóng không merge | Cho phép `NULL` |

### Quan hệ

- Nhiều `pull_requests` thuộc về một `repositories`.
- Nhiều `pull_requests` có thể do một `users` tạo.
- Một `pull_requests` sau khi merge có thể liên kết tới một `commits` qua `merge_commit_hash`.
- Một `pull_requests` có thể có nhiều `pull_request_reviews`.

---

## 3.8. Bảng `pull_request_reviews`

### Mục đích

Lưu approval của reviewer cho Pull Request, phục vụ chính sách merge vào protected branch.

### Cấu trúc cột

| Cột | Kiểu dữ liệu | Mục đích | Ràng buộc |
|---|---|---|---|
| `id` | `UUID` | Định danh review | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` |
| `pull_request_id` | `UUID` | PR được review | `NOT NULL`, `FK -> pull_requests(id)`, `ON DELETE CASCADE` |
| `reviewer_id` | `UUID` | Người approve | `FK -> users(id)`, `ON DELETE SET NULL` |
| `status` | `VARCHAR(20)` | Trạng thái review | `CHECK(status IN ('approved'))` |
| `created_at` | `TIMESTAMPTZ` | Thời điểm approve | `DEFAULT NOW()` |

### Ràng buộc đặc biệt

```sql
UNIQUE(pull_request_id, reviewer_id)
```

Mỗi reviewer chỉ có một approval hiện hành cho một PR.

---

## 3.9. Bảng `repo_stats`

### Mục đích

Lưu dữ liệu thống kê đã tính sẵn cho repository nhằm tối ưu dashboard. Đây là bảng phi chuẩn hóa có kiểm soát.

### Cấu trúc cột

| Cột | Kiểu dữ liệu | Mục đích | Ràng buộc |
|---|---|---|---|
| `repo_id` | `UUID` | Repository được thống kê | `PRIMARY KEY`, `FK -> repositories(id)`, `ON DELETE CASCADE` |
| `commit_count` | `INT` | Tổng số commit | `DEFAULT 0` |
| `branch_count` | `INT` | Tổng số branch | `DEFAULT 0` |
| `issue_open_count` | `INT` | Số issue đang mở | `DEFAULT 0` |
| `issue_closed_count` | `INT` | Số issue đã đóng | `DEFAULT 0` |
| `pr_open_count` | `INT` | Số PR đang mở | `DEFAULT 0` |
| `pr_merged_count` | `INT` | Số PR đã merge | `DEFAULT 0` |
| `latest_commit_hash` | `CHAR(40)` | Commit mới nhất | Cho phép `NULL` |
| `latest_commit_time` | `TIMESTAMPTZ` | Thời điểm commit mới nhất | Cho phép `NULL` |
| `latest_commit_msg` | `TEXT` | Message của commit mới nhất | Cho phép `NULL` |
| `updated_at` | `TIMESTAMPTZ` | Thời điểm cập nhật thống kê | `DEFAULT NOW()` |

### Quan hệ

- Một `repo_stats` thuộc về đúng một `repositories`.
- Quan hệ giữa `repositories` và `repo_stats` là 1:1.

### Ghi chú thiết kế

`repo_stats` vi phạm 3NF có chủ đích vì các giá trị như `commit_count`, `issue_open_count` có thể tính lại từ bảng gốc. Tuy nhiên, việc lưu sẵn giúp dashboard đọc nhanh hơn, đặc biệt khi dữ liệu commit và issue lớn.

---

## 4. Tổng kết ràng buộc chính

| Loại ràng buộc | Vị trí sử dụng | Mục đích |
|---|---|---|
| `PRIMARY KEY` | Tất cả bảng | Định danh duy nhất mỗi bản ghi |
| `FOREIGN KEY` | Các quan hệ giữa bảng | Đảm bảo toàn vẹn tham chiếu |
| `UNIQUE` | `users.username`, `users.email`, `repositories(owner_id, name)`, `branches(repo_id, name)` | Tránh trùng dữ liệu nghiệp vụ |
| `CHECK` | `issues.status`, `pull_requests.status` | Giới hạn giá trị trạng thái hợp lệ |
| `DEFAULT` | UUID, timestamp, boolean, counter | Tự động gán giá trị mặc định |
| `ON DELETE CASCADE` | Dữ liệu phụ thuộc repo/user | Xóa dữ liệu con khi dữ liệu cha bị xóa |
| `ON DELETE SET NULL` | Tác giả commit/issue/PR | Giữ lịch sử khi user bị xóa |

---

## 5. Kết luận

Lược đồ vật lý của GitMini sử dụng PostgreSQL để triển khai các bảng nghiệp vụ chính cho repository, membership, issue, pull request, review, audit và thống kê. Các bảng nghiệp vụ chính được thiết kế theo hướng chuẩn hóa, trong khi `repo_stats` được phi chuẩn hóa có kiểm soát để tối ưu truy vấn dashboard. Thiết kế `commits` kết hợp `commit_parents` là điểm cốt lõi giúp hệ thống biểu diễn lịch sử commit dạng DAG và hỗ trợ merge commit nhiều parent.
