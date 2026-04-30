# GitMini — Checklist minh chứng nộp bài và bảo vệ

Tài liệu này gom các minh chứng cần chuẩn bị để chứng minh GitMini đáp ứng yêu cầu bài tập lớn môn Quản trị Cơ sở dữ liệu. Khi nộp bài, ưu tiên đưa các minh chứng này vào báo cáo/slide theo đúng thứ tự.

---

## 1. Nhóm minh chứng bắt buộc

| Nhóm minh chứng | Cần có gì | File/tài liệu hiện có | Trạng thái |
|---|---|---|---|
| Mô tả chức năng | Use case, actor, chức năng chính | `docs/01_mo_ta_chuc_nang.md` | Đã có |
| Phân tích dữ liệu | Thực thể, thuộc tính, quan hệ | `docs/02a_phan_tich_thuc_the.md` | Đã có |
| Lược đồ quan hệ | 20 quan hệ, PK/FK, chuẩn hóa 3NF | `docs/02b_luoc_do_quan_he_va_chuan_hoa.md` | Đã có |
| Lược đồ vật lý | Cột, kiểu dữ liệu, ràng buộc, index | `docs/02c_data_dictionary.md`, `docs/diagrams/gitmini_physical_schema_detailed.drawio` | Đã có |
| Migration/seed | Thứ tự chạy SQL, seed demo/benchmark | `docs/03_khoi_tao_csdl_migration_seed.md`, `sql/`, `scripts/seed_data.py` | Đã có |
| Tối ưu truy vấn | Index, EXPLAIN ANALYZE, so sánh trước/sau | `docs/04_toi_uu_csdl_index.md`, `docs/05_minh_chung_toi_uu_explain.md` | Đã có |
| Backup/restore | Chiến lược backup, restore test, replication dự phòng | `docs/06_sao_luu_phuc_hoi.md`, `scripts/test_backup_restore.sh` | Đã có |
| Bảo mật | RBAC, RLS, permission, audit log | `docs/07_bao_mat_rbac_rls.md`, `sql/04_security_roles.sql`, `sql/05_security_rls.sql` | Đã có |
| Kỹ thuật nâng cao | Recursive CTE, DAG, GIN, trigger, denormalization | `docs/08_ky_thuat_nang_cao.md` | Đã có |
| Ứng dụng minh họa | UI chạy thật, API nối DB thật, ảnh màn hình | `docs/09_ung_dung_va_anh_minh_hoa.md` | Cần chụp ảnh |
| Quy trình nhóm | Phân công 4 thành viên, review chéo, checklist | `docs/12_quy_trinh_van_hanh_san_pham.md`, `docs/14_tien_do_va_phan_cong_nhom.md` | Đã có |
| Câu hỏi bảo vệ | Lý thuyết CSDL và câu hỏi theo thành viên | `docs/15_ly_thuyet_csdl_va_cau_hoi_bao_ve.md` | Đã có |

---

## 2. Minh chứng ảnh cần chụp

Tạo thư mục `screenshots/` ở gốc dự án và chụp các ảnh sau:

| STT | File ảnh đề xuất | Nội dung cần chụp | Vì sao thầy cần thấy |
|---:|---|---|---|
| 1 | `screenshots/01_login.png` | Màn hình đăng nhập GitMini Console | Chứng minh app có auth/session |
| 2 | `screenshots/02_dashboard_repositories.png` | Dashboard repository có commit/branch/issue stats | Chứng minh dữ liệu đọc từ `repositories`, `repo_stats` |
| 3 | `screenshots/03_create_repository.png` | Modal tạo repository | Chứng minh app ghi dữ liệu vào DB |
| 4 | `screenshots/04_commit_history.png` | Commit history của một repository | Chứng minh Recursive CTE/commit graph |
| 5 | `screenshots/05_repository_members.png` | Danh sách member và role trong repository | Chứng minh phân quyền theo membership |
| 6 | `screenshots/06_global_issues.png` | Bảng issue toàn hệ thống | Chứng minh query join nghiệp vụ |
| 7 | `screenshots/07_pull_requests.png` | Pull request có protected/approval/merge | Chứng minh PR governance |
| 8 | `screenshots/08_analytics.png` | Tab analytics | Chứng minh khai thác dữ liệu quản trị |
| 9 | `screenshots/09_audit_logs.png` | Audit logs khi đăng nhập admin | Chứng minh accountability |
| 10 | `screenshots/10_search_results.png` | Search issue/commit | Chứng minh full-text search GIN |
| 11 | `screenshots/11_health_check.png` | `/health` trả `database: ok` | Chứng minh backend nối PostgreSQL thật |
| 12 | `screenshots/12_schema_20_tables.png` | DBeaver/pgAdmin/psql hiển thị đủ 20 bảng | Chứng minh schema vật lý |
| 13 | `screenshots/13_explain_analyze.png` | Kết quả EXPLAIN ANALYZE dùng index | Chứng minh tối ưu truy vấn |
| 14 | `screenshots/14_backup_restore_pass.png` | Terminal chạy backup/restore pass | Chứng minh availability |
| 15 | `screenshots/15_tests_pass.png` | Terminal chạy migration/backend/frontend test pass | Chứng minh kiểm thử hồi quy |

---

## 3. Lệnh tạo minh chứng terminal

Chạy từ thư mục gốc dự án `GitMini-Management`.

### 3.1. Kiểm tra migration và schema 20 bảng

```bash
bash scripts/test_migrations.sh
```

Kết quả kỳ vọng:

```text
Migration smoke test passed using temporary PostgreSQL container.
```

### 3.2. Kiểm tra backend, permission và audit regression

```bash
bash scripts/test_backend.sh
```

Kết quả kỳ vọng:

```text
22 passed
```

### 3.3. Kiểm tra frontend build

```bash
cd frontend
npm ci
npm run build
```

Kết quả kỳ vọng:

```text
✓ built
```

### 3.4. Kiểm tra backup/restore trên DB tạm

```bash
bash scripts/test_backup_restore.sh
```

Kết quả kỳ vọng:

```text
Backup/restore test passed using temporary PostgreSQL containers.
```

### 3.5. Chạy app demo

```bash
docker compose build app
docker compose up -d db app
docker compose ps
```

Kết quả kỳ vọng:

```text
gitmini_db_container    healthy
gitmini_app_container   healthy
```

Mở:

```text
http://localhost:8099/health
http://localhost:8099/
```

Tài khoản demo:

| User | Password | Vai trò demo |
|---|---|---|
| `admin` | `gitmini_password` | Xem audit logs/toàn hệ thống |
| `alice` | `gitmini_password` | Owner repository |
| `bob` | `gitmini_password` | Maintainer |
| `carol` | `gitmini_password` | Developer |
| `david` | `gitmini_password` | Viewer |

---

## 4. Minh chứng SQL nên chuẩn bị khi bảo vệ

### 4.1. Đếm đủ 20 bảng

```sql
SELECT COUNT(*)
FROM pg_tables
WHERE schemaname = 'public';
```

### 4.2. Xem khóa ngoại

```sql
SELECT conname, conrelid::regclass AS table_name, confrelid::regclass AS references_table
FROM pg_constraint
WHERE contype = 'f'
ORDER BY table_name::text, conname;
```

### 4.3. Xem index chính

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 4.4. Xem policy RLS

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 4.5. Xem trigger thống kê

```sql
SELECT tgname, tgrelid::regclass AS table_name
FROM pg_trigger
WHERE NOT tgisinternal
ORDER BY table_name::text, tgname;
```

### 4.6. Xem audit log

```sql
SELECT action, actor_id, target_type, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 5. Thứ tự demo đề xuất với thầy

1. Mở sơ đồ vật lý chi tiết `docs/diagrams/gitmini_physical_schema_detailed.drawio` để giới thiệu 20 bảng, PK/FK/index.
2. Mở app `http://localhost:8099/`, login `admin/gitmini_password`.
3. Vào Repositories để chỉ dashboard lấy dữ liệu từ PostgreSQL.
4. Mở một repository, chỉ commit history và repository members.
5. Vào Issues, đóng/mở issue để tạo audit event.
6. Vào Pull Requests, giải thích protected branch, approval, merge.
7. Vào Analytics, giải thích `repo_stats` và query tổng hợp.
8. Vào Audit Logs, chứng minh hành động nhạy cảm được ghi lại.
9. Mở terminal, chạy hoặc cho xem log `test_migrations`, `test_backend`, `test_backup_restore`.
10. Mở tài liệu EXPLAIN để giải thích index và full-text search.

---

## 6. Việc còn phải làm ngay

| Việc | Ưu tiên | Ghi chú |
|---|---|---|
| Chạy lại toàn bộ lệnh ở mục 3 | Cao | Lưu/chụp màn hình terminal pass |
| Chụp 15 ảnh trong mục 2 | Cao | Đây là phần còn thiếu rõ nhất |
| Cập nhật `docs/09_ung_dung_va_anh_minh_hoa.md` sau khi có ảnh | Cao | Gắn đúng tên ảnh vào báo cáo |
| Export sơ đồ `.drawio` sang PNG/PDF | Trung bình | Đưa vào slide/báo cáo dễ hơn |
| Kiểm tra `git status --short` trước commit | Cao | Không commit `node_modules`, `dist`, `.env`, dữ liệu sinh ra |
