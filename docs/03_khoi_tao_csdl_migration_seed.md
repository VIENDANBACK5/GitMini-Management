# GitMini — Tài liệu khởi tạo CSDL, Migration và Seed

## 1. Mục đích tài liệu

Tài liệu này mô tả các script dùng để khởi tạo cơ sở dữ liệu GitMini, bao gồm migration tạo bảng, tạo index, trigger, phân quyền, Row-Level Security và seed dữ liệu mẫu.

Các script hiện có:

```text
sql/00_down.sql
sql/01_schema.sql
sql/02_indexes.sql
sql/03_triggers.sql
sql/04_security_roles.sql
sql/05_security_rls.sql
sql/06_benchmark_queries.sql
scripts/seed_data.py
```

---

## 2. Thứ tự chạy script khởi tạo

Khi dựng database mới, cần chạy theo thứ tự sau:

| Thứ tự | Script | Mục đích |
|---:|---|---|
| 1 | `sql/01_schema.sql` | Tạo extension và 8 bảng chính |
| 2 | `sql/02_indexes.sql` | Tạo index phục vụ truy vấn và tìm kiếm |
| 3 | `sql/03_triggers.sql` | Tạo function và trigger cập nhật `repo_stats` |
| 4 | `sql/04_security_roles.sql` | Tạo role và phân quyền RBAC |
| 5 | `sql/05_security_rls.sql` | Bật Row-Level Security và tạo policy |
| 6 | `scripts/seed_data.py` | Sinh dữ liệu mẫu phục vụ demo/benchmark |
| Thủ công | `sql/00_down.sql` | Rollback schema khi cần reset môi trường |
| Thủ công | `sql/06_benchmark_queries.sql` | Chạy `EXPLAIN ANALYZE` sau khi có dữ liệu seed |

---

## 3. Migration Up

Migration up là quá trình tạo hoặc cập nhật cấu trúc CSDL từ trạng thái rỗng lên trạng thái có thể sử dụng.

### 3.1. `sql/01_schema.sql` — Tạo schema chính

Script này thực hiện:

- Bật extension `uuid-ossp`.
- Tạo bảng `users`.
- Tạo bảng `repositories`.
- Tạo bảng `commits`.
- Tạo bảng `commit_parents`.
- Tạo bảng `branches`.
- Tạo bảng `issues`.
- Tạo bảng `pull_requests`.
- Tạo bảng `repo_stats`.

Các loại ràng buộc được dùng:

- `PRIMARY KEY`
- `FOREIGN KEY`
- `UNIQUE`
- `CHECK`
- `DEFAULT`
- `ON DELETE CASCADE`
- `ON DELETE SET NULL`

### 3.2. `sql/02_indexes.sql` — Tạo chỉ mục

Script này tạo các nhóm index:

- Index cho khóa ngoại để tăng tốc `JOIN`.
- Composite index cho các truy vấn phổ biến.
- GIN index cho full-text search.
- Index phụ trợ cho dashboard.

Ví dụ:

```sql
CREATE INDEX IF NOT EXISTS idx_commits_repo_time
ON commits(repo_id, created_at DESC);
```

Index này phục vụ truy vấn lấy lịch sử commit mới nhất của một repository.

### 3.3. `sql/03_triggers.sql` — Tạo trigger và function

Script này tạo các function và trigger tự động cập nhật bảng `repo_stats`.

Các trigger chính:

| Trigger | Bảng | Mục đích |
|---|---|---|
| `trg_init_stats_on_repo_create` | `repositories` | Tạo bản ghi `repo_stats` khi tạo repo |
| `trg_commit_changes` | `commits` | Cập nhật số commit và commit mới nhất |
| `trg_issue_changes` | `issues` | Cập nhật số issue mở/đóng |
| `trg_pr_changes` | `pull_requests` | Cập nhật số PR mở/đã merge |
| `trg_branch_changes` | `branches` | Cập nhật số branch |

### 3.4. `sql/04_security_roles.sql` — Tạo RBAC

Script này tạo các role:

- `git_admin`
- `git_developer`
- `git_reviewer`

Ý nghĩa:

| Role | Mục đích |
|---|---|
| `git_admin` | Quản trị toàn bộ hệ thống |
| `git_developer` | Tạo commit, issue, branch và xem dữ liệu |
| `git_reviewer` | Kế thừa developer và có quyền cập nhật pull request |

### 3.5. `sql/05_security_rls.sql` — Tạo Row-Level Security

Script này bật RLS trên các bảng quan trọng:

- `repositories`
- `commits`
- `issues`
- `pull_requests`

Mục tiêu là hạn chế truy cập dữ liệu theo từng dòng. Ví dụ repository private chỉ chủ sở hữu được xem.

---

## 4. Migration Down

Migration down là quá trình rollback, đưa CSDL về trạng thái trước khi chạy migration.

Project đã bổ sung file migration down:

```text
sql/00_down.sql
```

Script này dùng để reset môi trường development/test bằng cách gỡ policy, trigger, function, bảng, role và extension liên quan tới GitMini.

Lưu ý: `00_down.sql` không được tự động chạy khi khởi tạo Docker. File này chỉ chạy thủ công khi cần rollback/reset database.

---

## 5. Seed dữ liệu

### 5.1. Script seed hiện tại

Script seed hiện có:

```text
scripts/seed_data.py
```

Script sử dụng:

- `psycopg2` để kết nối PostgreSQL.
- `execute_values` để insert theo lô.
- `uuid` để tạo UUID.
- `random` để sinh dữ liệu mẫu.
- `dotenv` để đọc biến môi trường `DATABASE_URL`.

### 5.2. Chế độ seed hiện tại

Script hiện hỗ trợ hai profile:

| Profile | Users | Repositories | Commits | Issues | Pull requests | Mục đích |
|---|---:|---:|---:|---:|---:|---|
| `demo` | 100 | 20 | 1,000 | 300 | 80 | Chạy nhanh để minh họa giao diện |
| `benchmark` | 1,000 | 1,000 | 100,000 | 10,000 | 2,000 | Tạo dữ liệu lớn để đo `EXPLAIN ANALYZE` |

### 5.3. Dữ liệu được sinh

Script hiện tạo dữ liệu cho:

- `users`
- `repositories`
- `commits`
- `commit_parents`
- `branches`
- `issues`
- `pull_requests`

Dữ liệu branch gồm các nhánh mẫu:

- `main`
- `develop`
- `feature/login`
- `feature/search`
- `bugfix/dashboard`

Dữ liệu issue và commit message có các keyword như `login bug`, `full text search`, `dashboard slow`, `fix login flow` để phục vụ benchmark full-text search.

---

## 6. Hướng dẫn khởi tạo CSDL

### 6.1. Chuẩn bị biến môi trường

Tạo file `.env` từ `.env.example`:

```text
DATABASE_URL=postgresql://gitmini_user:gitmini_password@localhost:5435/gitmini_db
DB_HOST=localhost
DB_PORT=5435
DB_NAME=gitmini_db
DB_USER=gitmini_user
DB_PASS=gitmini_password
```

### 6.2. Khởi động PostgreSQL bằng Docker

```bash
docker compose up -d db
```

Database trong `docker-compose.yml` đang expose cổng:

```text
localhost:5435 -> container:5432
```

### 6.3. Chạy seed

Chạy seed demo:

```bash
python scripts/seed_data.py --profile demo
```

Chạy seed benchmark:

```bash
python scripts/seed_data.py --profile benchmark
```

Yêu cầu cài thư viện Python:

```bash
pip install psycopg2-binary python-dotenv
```

---

## 7. Kết luận

Project đã có migration up/down, benchmark query và seed script hỗ trợ cả demo mode lẫn benchmark mode. Sau khi chạy `--profile benchmark`, có thể dùng `sql/06_benchmark_queries.sql` để lấy số liệu `EXPLAIN ANALYZE` điền vào tài liệu minh chứng tối ưu.
