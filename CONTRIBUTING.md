# GitMini — Quy trình đóng góp cho thành viên

Tài liệu này quy định cách thành viên trong nhóm nhận việc, chạy dự án, tạo branch, commit, kiểm thử và gửi pull request. Mục tiêu là làm việc giống một nhóm vận hành sản phẩm nhỏ, có kiểm soát thay đổi và có bằng chứng kiểm thử.

## 1. Chuẩn bị môi trường

Yêu cầu tối thiểu:

- Docker Desktop
- Git
- Node.js nếu muốn chạy frontend dev mode cục bộ
- Python nếu muốn chạy script seed ngoài Docker

Chạy toàn bộ hệ thống bằng Docker:

```bash
docker compose up -d db app
```

Truy cập:

```text
http://localhost:8099/
```

Health check:

```text
http://localhost:8099/health
```

Thông tin database khi dùng DBeaver/pgAdmin:

| Trường | Giá trị |
|---|---|
| Host | `localhost` |
| Port | `5435` |
| Database | `gitmini_db` |
| User | `gitmini_user` |
| Password | `gitmini_password` |

## 2. Quy trình nhận việc

Nhóm 4 thành viên chia việc theo 4 nhánh quản trị CSDL:

| Thành viên | Nhánh CSDL chính | Review chéo cho |
|---|---|---|
| Thành viên 1 | Phân tích nghiệp vụ CSDL, thực thể, chuẩn hóa, data dictionary | Query/analytics và minh chứng báo cáo |
| Thành viên 2 | Thiết kế vật lý PostgreSQL, schema, index, trigger, migration, backup/restore | Phân tích dữ liệu và tài liệu CSDL |
| Thành viên 3 | Bảo mật dữ liệu, RBAC/RLS, permission, audit log | Schema, migration và vận hành DB |
| Thành viên 4 | Khai thác dữ liệu, truy vấn history/issue/PR, analytics, screenshot | Bảo mật dữ liệu và API kiểm chứng |

Mỗi việc nên bắt đầu từ một issue/task rõ ràng:

1. Mục tiêu cần đạt.
2. Phạm vi trong/ngoài task.
3. Acceptance criteria.
4. Tài liệu cần cập nhật.
5. Người phụ trách và người review.

Dùng template trong `.github/ISSUE_TEMPLATE/task.md` nếu tạo issue trên GitHub.

## 3. Quy ước branch

Tạo branch theo loại công việc:

| Loại việc | Tên branch |
|---|---|
| Tính năng | `feature/<ten-ngan>` |
| Sửa lỗi | `fix/<ten-loi>` |
| Tài liệu | `docs/<ten-tai-lieu>` |
| Công việc vận hành | `chore/<cong-viec>` |

Ví dụ:

```bash
git checkout -b feature/analytics-dashboard
```

## 4. Quy ước commit

Commit message nên ngắn, rõ mục đích:

| Loại commit | Khi dùng |
|---|---|
| `feat:` | Thêm tính năng |
| `fix:` | Sửa lỗi |
| `docs:` | Cập nhật tài liệu |
| `chore:` | Cấu hình, Docker, script, cleanup |
| `test:` | Thêm hoặc cập nhật kiểm thử |

Ví dụ:

```text
feat: add repository analytics dashboard
fix: correct commit parent traversal
 docs: update benchmark evidence
chore: add gitignore for generated data
```

## 5. Quy trình phát triển

Luồng chuẩn:

1. Pull code mới nhất từ nhánh chính.
2. Tạo branch theo task.
3. Thực hiện thay đổi đúng phạm vi.
4. Chạy kiểm thử phù hợp.
5. Cập nhật tài liệu nếu thay đổi ảnh hưởng báo cáo/demo.
6. Tạo pull request.
7. Người khác review trước khi merge.

Không làm chung nhiều mục tiêu không liên quan trong một PR.

## 6. Checklist trước khi tạo PR

Tùy loại thay đổi, chạy các bước phù hợp:

### Build app

```bash
docker compose build app
```

### Chạy hệ thống

```bash
docker compose up -d db app
```

### Health check

Mở:

```text
http://localhost:8099/health
```

Kỳ vọng:

```json
{"status":"ok","database":"ok"}
```

### Backend regression tests

Không reset hoặc xóa `postgres_data/` để có database sạch. Dùng PostgreSQL container tạm, load migration rồi chạy pytest:

```bash
bash scripts/test_migrations.sh
```

```bash
bash scripts/test_backend.sh
```

### Frontend

Nếu sửa UI:

```bash
cd frontend
npm ci
npm run build
```

Sau đó mở `http://localhost:8099/`, kiểm tra Repositories, History, Issues, Pull Requests, Analytics và chụp ảnh nếu phục vụ Phase 6 hoặc báo cáo.

### SQL/Database

Nếu sửa schema/index/trigger/security:

- Chạy `bash scripts/test_migrations.sh` trên database tạm.
- Nếu DB Docker hiện hữu bị lệch schema, chạy `bash scripts/sync_docker_db.sh` để đồng bộ không xóa dữ liệu.
- Seed dữ liệu demo hoặc benchmark nếu cần kiểm tra dữ liệu mẫu.
- Cập nhật `docs/02c_data_dictionary.md`, `docs/03_khoi_tao_csdl_migration_seed.md`, hoặc tài liệu liên quan.

### Backup/restore

Nếu sửa vận hành hoặc backup:

```bash
bash scripts/test_backup_restore.sh
```

Script này dùng container PostgreSQL tạm và không reset/xóa `postgres_data/`.

### Benchmark

Nếu sửa index/query:

- Chạy `EXPLAIN ANALYZE`.
- Cập nhật `docs/05_minh_chung_toi_uu_explain.md` nếu kết quả thay đổi.

## 7. Quy định không commit dữ liệu sinh ra

Không commit các thư mục/file sau:

- `postgres_data/`
- `data/repos/`
- `frontend/node_modules/`
- `frontend/dist/`
- file `.env`
- backup dump/log sinh ra khi chạy thử

Trước khi PR, kiểm tra:

```bash
git status --short
```

Nếu thấy file lạ hoặc dữ liệu lớn, hỏi nhóm trước khi đưa vào commit.

## 8. Pull request

PR nên có:

1. Summary ngắn.
2. Khu vực thay đổi.
3. Test plan đã chạy.
4. Ảnh minh họa nếu sửa UI.
5. Ghi rõ ảnh hưởng database/tài liệu.

Dùng template `.github/pull_request_template.md`.

## 9. Review checklist

Reviewer kiểm tra:

- Thay đổi đúng scope issue.
- Không có dữ liệu sinh ra hoặc secret.
- App build/chạy được.
- Tài liệu liên quan đã cập nhật.
- UI/API/SQL chính không bị hỏng.
- Cách làm đủ đơn giản, không over-engineer.

## 10. Bàn giao công việc

Khi kết thúc một phiên làm việc lớn, cập nhật `PROJECT_HANDOFF.md` với:

- Đã làm gì.
- File quan trọng đã đổi.
- Cách kiểm thử.
- Việc còn lại.
- Cảnh báo nếu có.

Tài liệu này giúp thành viên khác tiếp tục mà không phải hỏi lại từ đầu.
