# GitMini — Ứng dụng web và ảnh minh họa

## 1. Mục đích tài liệu

Tài liệu này mô tả ứng dụng web minh họa của GitMini và danh sách ảnh cần bổ sung vào báo cáo. Theo yêu cầu bài tập lớn, phần ứng dụng cần chứng minh hệ thống có giao diện thao tác và kết nối tới cơ sở dữ liệu SQL thật.

GitMini hiện triển khai theo hướng **web app** vì phù hợp nhất với bài tập CSDL:

- Dễ chạy bằng Docker Compose.
- Dễ mở trên trình duyệt để thuyết trình.
- Dễ chụp ảnh giao diện đưa vào báo cáo.
- Backend gọi trực tiếp PostgreSQL để minh chứng dữ liệu thật.

---

## 2. Kiến trúc ứng dụng

```text
Browser
  -> FastAPI backend: http://localhost:8099
      -> PostgreSQL 15: gitmini_db
```

Các thành phần chính:

```text
frontend/
  package.json
  package-lock.json
  index.html
  src/
    main.jsx
    App.jsx
    api.js
    styles.css

backend/
  Dockerfile
  requirements.txt
  app/
    main.py
    db.py
    auth.py
    queries.py
    schemas.py

docker-compose.yml
```

Trong Docker Compose:

- Service `db` chạy PostgreSQL 15.
- Service `app` chạy FastAPI bằng Uvicorn.
- React/Vite frontend được build trong Docker bằng Node stage.
- Production build được copy vào `/app/frontend` trong backend image.
- FastAPI phục vụ React tại `/` và static assets tại `/assets`.
- Ứng dụng chạy ở:

```text
http://localhost:8099/
```

---

## 3. Chức năng web app hiện có

Ứng dụng GitMini Dashboard minh họa các chức năng chính của hệ thống:

1. Xem danh sách repository.
2. Tạo repository mới.
3. Xem lịch sử commit của repository.
4. Xem danh sách issue toàn hệ thống.
5. Tạo issue mới.
6. Đóng/mở lại issue.
7. Xem danh sách pull request.
8. Tạo pull request.
9. Đóng hoặc merge pull request.
10. Tìm kiếm issue/commit bằng full-text search.

Ứng dụng không thay thế Git thật, mà tập trung chứng minh cách các chức năng nghiệp vụ đọc/ghi dữ liệu qua PostgreSQL.

---

## 4. API backend

Backend FastAPI cung cấp các endpoint chính sau:

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/health` | Kiểm tra backend và database |
| `GET` | `/repos` | Lấy danh sách repository kèm thống kê |
| `POST` | `/repos` | Tạo repository mới |
| `GET` | `/repos/{repo_name}` | Xem chi tiết repository |
| `GET` | `/repos/{repo_name}/stats` | Xem thống kê từ `repo_stats` |
| `GET` | `/repos/{repo_name}/history` | Xem lịch sử commit bằng Recursive CTE/fallback |
| `GET` | `/issues` | Lấy danh sách issue |
| `POST` | `/repos/{repo_name}/issues` | Tạo issue mới |
| `PATCH` | `/issues/{issue_id}` | Cập nhật trạng thái issue |
| `GET` | `/pulls` | Lấy danh sách pull request |
| `GET` | `/repos/{repo_name}/pulls` | Lấy pull request theo repository |
| `POST` | `/repos/{repo_name}/pulls` | Tạo pull request mới |
| `PATCH` | `/pulls/{pull_id}` | Đóng hoặc merge pull request |
| `GET` | `/search` | Tìm kiếm toàn hệ thống |
| `GET` | `/repos/{repo_name}/search` | Tìm kiếm trong một repository |

Các API nghiệp vụ dùng HTTP Basic Auth phục vụ demo:

```text
username: gitmini_user
password: gitmini_password
```

---

## 5. Liên hệ giữa giao diện và cơ sở dữ liệu

| Màn hình | API gọi | Bảng dữ liệu liên quan | Kỹ thuật minh chứng |
|---|---|---|---|
| Repository dashboard | `GET /repos` | `repositories`, `repo_stats`, `users` | Denormalized stats bằng trigger |
| Tạo repository | `POST /repos` | `repositories`, `repo_stats` | Trigger tạo thống kê ban đầu |
| Commit history | `GET /repos/{name}/history` | `commits`, `commit_parents`, `branches` | Recursive CTE duyệt DAG |
| Global issues | `GET /issues` | `issues`, `repositories`, `users` | Query nghiệp vụ có join |
| Tạo issue | `POST /repos/{name}/issues` | `issues`, `repo_stats` | Trigger cập nhật issue count |
| Pull requests | `GET /pulls` | `pull_requests`, `repositories`, `users` | Workflow PR cơ bản |
| Tạo/merge PR | `POST/PATCH /pulls` | `pull_requests`, `repo_stats` | Trigger cập nhật PR count |
| Search | `GET /search` hoặc `/repos/{name}/search` | `issues`, `commits` | GIN full-text search |

---

## 6. Cách chạy ứng dụng

Khởi động database và web app:

```bash
docker compose build
docker compose up -d
```

Kiểm tra backend:

```text
http://localhost:8099/health
```

Kết quả mong đợi:

```json
{"status":"ok","database":"ok"}
```

Mở giao diện:

```text
http://localhost:8099/
```

Nếu database chưa có dữ liệu, chạy seed demo trước khi chụp ảnh:

```bash
MSYS_NO_PATHCONV=1 docker run --rm \
  --network gitmini-management_default \
  -v "C:/Users/IECSACT5070/Desktop/BTL_CSDL/GitMini-Management/scripts:/app/scripts" \
  -w /app \
  -e DATABASE_URL="postgresql://gitmini_user:gitmini_password@gitmini_db_container:5432/gitmini_db" \
  python:3.11-slim \
  sh -c "pip install --quiet psycopg2-binary python-dotenv && python scripts/seed_data.py --profile demo"
```

---

## 7. Luồng màn hình cần minh họa

## 7.1. Dashboard repository

Màn hình hiển thị danh sách repository, số commit, branch, issue đang mở và trạng thái public/private.

Dữ liệu liên quan:

```sql
SELECT r.id, r.name, r.description, s.commit_count, s.branch_count
FROM repositories r
LEFT JOIN repo_stats s ON s.repo_id = r.id
ORDER BY r.created_at DESC;
```

Ảnh cần chụp:

```text
screenshots/01_dashboard_repositories.png
```

---

## 7.2. Tạo repository mới

Màn hình modal tạo repository mới.

Dữ liệu liên quan:

```sql
INSERT INTO repositories (name, description, owner_id, is_private)
VALUES (...);
```

Sau khi tạo repository, trigger tự tạo bản ghi trong `repo_stats`.

Ảnh cần chụp:

```text
screenshots/02_create_repository.png
```

---

## 7.3. Commit history

Màn hình hiển thị lịch sử commit của repository.

Dữ liệu liên quan:

```sql
WITH RECURSIVE commit_history AS (...)
SELECT * FROM commit_history;
```

Index hỗ trợ:

```text
idx_commits_repo_time
idx_parents_commit
```

Ảnh cần chụp:

```text
screenshots/03_commit_history.png
```

---

## 7.4. Global Issues

Màn hình hiển thị danh sách issue, trạng thái open/closed, repository và tác giả.

Dữ liệu liên quan:

```sql
SELECT i.id, r.name AS repo, i.title, i.status, i.created_at
FROM issues i
JOIN repositories r ON r.id = i.repo_id
ORDER BY i.created_at DESC;
```

Ảnh cần chụp:

```text
screenshots/04_global_issues.png
```

---

## 7.5. Pull Requests

Màn hình hiển thị pull request, source branch, target branch, trạng thái open/closed/merged và thao tác merge/close.

Dữ liệu liên quan:

```sql
SELECT pr.id, r.name AS repo, pr.title, pr.status, pr.source_branch, pr.target_branch
FROM pull_requests pr
JOIN repositories r ON r.id = pr.repo_id
ORDER BY pr.created_at DESC;
```

Ảnh cần chụp:

```text
screenshots/05_pull_requests.png
```

---

## 7.6. Search issue/commit

Màn hình tìm kiếm issue hoặc commit theo keyword bằng PostgreSQL full-text search.

Dữ liệu liên quan:

```sql
SELECT id, title, status
FROM issues
WHERE to_tsvector('english', title || ' ' || body)
      @@ plainto_tsquery('english', :keyword);
```

Index hỗ trợ:

```text
idx_issues_search
idx_commits_message_search
```

Ảnh cần chụp:

```text
screenshots/06_search_results.png
```

---

## 8. Ảnh minh chứng database nên bổ sung

Ngoài ảnh giao diện, nên bổ sung ảnh hoặc log minh chứng database:

| Ảnh | Nội dung | Mục đích |
|---|---|---|
| `07_health_check.png` | Kết quả `/health` | Chứng minh backend kết nối DB |
| `08_schema_tables.png` | Danh sách bảng trong DBeaver/pgAdmin | Chứng minh schema đã tạo |
| `09_explain_commit_history.png` | `EXPLAIN ANALYZE` commit history | Chứng minh index |
| `10_explain_fulltext.png` | `EXPLAIN ANALYZE` full-text search | Chứng minh GIN index |
| `11_repo_stats.png` | Dữ liệu bảng `repo_stats` | Chứng minh trigger/denormalization |
| `12_backup_restore.png` | Kết quả backup/restore test | Chứng minh availability |

---

## 9. Danh sách ảnh cần có trong bản nộp

Tạo thư mục:

```text
screenshots/
```

Danh sách ảnh đề xuất:

```text
screenshots/01_dashboard_repositories.png
screenshots/02_create_repository.png
screenshots/03_commit_history.png
screenshots/04_global_issues.png
screenshots/05_pull_requests.png
screenshots/06_search_results.png
screenshots/07_health_check.png
screenshots/08_schema_tables.png
screenshots/09_explain_commit_history.png
screenshots/10_explain_fulltext.png
screenshots/11_repo_stats.png
screenshots/12_backup_restore.png
```

---

## 10. Checklist hoàn thiện phần ứng dụng

| Hạng mục | Trạng thái hiện tại |
|---|---|
| Giao diện dashboard | Đã có web frontend |
| API backend | Đã có FastAPI backend |
| Kết nối PostgreSQL | Đã kết nối qua `DATABASE_URL` |
| Danh sách repository | Đã gọi API `/repos` |
| Tạo repository | Đã gọi API `POST /repos` |
| Commit history | Đã gọi API `/repos/{name}/history` |
| Issue list | Đã gọi API `/issues` |
| Tạo issue | Đã gọi API `POST /repos/{name}/issues` |
| Pull request list | Đã gọi API `/pulls` |
| Tạo/đóng/merge PR | Đã gọi API `POST/PATCH` pull request |
| Search | Đã gọi API full-text search |
| Ảnh minh họa | Cần chụp sau khi chạy app |

---

## 11. Kết luận

Phase 4 được triển khai theo hướng web app để tận dụng backend FastAPI, frontend tĩnh và PostgreSQL đã có. Web dashboard hiện minh họa được các nghiệp vụ quan trọng của GitMini: repository, commit history, issue, pull request và full-text search. Phần còn lại của báo cáo là chạy app với dữ liệu demo/benchmark, chụp ảnh minh họa và đưa ảnh vào bản nộp.
