# GitMini — Quy trình vận hành sản phẩm và làm việc nhóm

## 1. Mục tiêu

Tài liệu này mô tả cách nhóm vận hành GitMini như một sản phẩm phần mềm nhỏ, không chỉ là một bộ script hoặc bài demo. Mục tiêu là đảm bảo mọi thay đổi đều có người phụ trách, có quy trình kiểm thử, có tài liệu cập nhật và có thể bàn giao cho thành viên khác.

GitMini được vận hành theo mô hình tối giản:

> Yêu cầu → Issue → Branch → Code/Docs → Test → Review → Merge → Demo/Release.

## 2. Vai trò trong nhóm

Nhóm có 4 thành viên nên chia theo 4 nhánh quản trị CSDL. Mỗi người đều có đầu việc liên quan trực tiếp đến database; backend/frontend chỉ là phần minh chứng để kiểm tra và trình bày kết quả.

| Thành viên | Vai trò CSDL chính | Đầu việc phụ trách | Minh chứng cần bàn giao |
|---|---|---|---|
| Thành viên 1 | Phân tích nghiệp vụ CSDL và tài liệu hóa | Mô tả chức năng, phân tích thực thể, chuẩn hóa, data dictionary, mapping yêu cầu | Docs đầy đủ, README cập nhật, checklist nộp bài rõ ràng |
| Thành viên 2 | Thiết kế vật lý và vận hành PostgreSQL | Schema, khóa, index, trigger, migration, seed, Docker DB, backup/restore | SQL chạy lại được, seed demo/benchmark, backup-restore test, DB healthy |
| Thành viên 3 | Bảo mật và kiểm soát truy cập dữ liệu | RBAC/RLS, membership permission, audit log, kiểm thử quyền dữ liệu qua API | Phân quyền đúng, audit ghi nhận hành động nhạy cảm, backend tests pass |
| Thành viên 4 | Khai thác dữ liệu và minh chứng truy vấn | Query history/issue/PR, analytics, dashboard, screenshot dữ liệu | UI hiển thị đúng dữ liệu CSDL, analytics có số liệu, screenshot khớp demo |

| Mảng việc CSDL | Người làm chính | Người review chéo |
|---|---|---|
| Phân tích yêu cầu, thực thể, chuẩn hóa | Thành viên 1 | Thành viên 2 |
| Schema vật lý, index, trigger, migration | Thành viên 2 | Thành viên 3 |
| RBAC/RLS, audit, kiểm thử quyền dữ liệu | Thành viên 3 | Thành viên 4 |
| Query khai thác, analytics, minh chứng dữ liệu | Thành viên 4 | Thành viên 1 |
| Docker DB, backup/restore, kiểm thử cuối | Thành viên 2 + Thành viên 1 | Thành viên 3 + Thành viên 4 |

## 3. Môi trường vận hành

### 3.1. Local development

Dùng khi thành viên phát triển tính năng hoặc sửa tài liệu.

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

### 3.2. Demo environment

Dùng khi chụp ảnh, quay video hoặc trình bày với thầy.

Yêu cầu:

- Database có dữ liệu demo sạch.
- Web chạy được qua Docker.
- Các màn hình chính có dữ liệu: Repositories, History, Issues, Pull Requests, Analytics.
- Không để lỗi console/API khi demo.

### 3.3. Benchmark environment

Dùng để chạy `EXPLAIN ANALYZE` và đo hiệu năng.

Yêu cầu:

- Dữ liệu được seed bằng profile `benchmark`.
- Kết quả đo ghi vào `docs/05_minh_chung_toi_uu_explain.md`.
- Nếu chạy benchmark tạm, nên dùng database/container riêng để không làm bẩn dữ liệu demo.

## 4. Quy trình từ yêu cầu đến merge

### Bước 1 — Tạo issue/task

Mỗi task cần có:

- mục tiêu;
- phạm vi;
- acceptance criteria;
- khu vực ảnh hưởng;
- tài liệu cần cập nhật;
- owner và reviewer.

### Bước 2 — Tạo branch

Quy ước:

```text
feature/<ten-ngan>
fix/<ten-loi>
docs/<ten-tai-lieu>
chore/<cong-viec>
```

### Bước 3 — Thực hiện thay đổi

Nguyên tắc:

- Chỉ sửa đúng phạm vi task.
- Không refactor ngoài yêu cầu.
- Nếu đổi schema/query/API, cập nhật tài liệu liên quan.
- Nếu sửa UI, kiểm tra bằng browser và chuẩn bị screenshot nếu cần báo cáo.

### Bước 4 — Kiểm thử

Chọn checklist phù hợp:

| Loại thay đổi | Kiểm thử tối thiểu |
|---|---|
| SQL/schema/index | chạy migration trên DB sạch, seed demo, kiểm tra query liên quan |
| Backend API | health check, gọi endpoint chính, kiểm tra lỗi auth/data |
| Frontend UI | build app, mở web, kiểm tra luồng chính |
| Benchmark | chạy `EXPLAIN ANALYZE`, ghi số liệu vào docs |
| Documentation | kiểm tra link, bảng, lệnh chạy có đúng không |
| Docker/ops | `docker compose build app`, `docker compose up -d db app` |

### Bước 5 — Tạo PR và review

PR phải nêu rõ:

- thay đổi gì;
- vì sao cần thay đổi;
- đã kiểm thử bằng cách nào;
- có ảnh hưởng database/tài liệu không;
- ảnh minh họa nếu sửa UI.

Reviewer kiểm tra scope, chất lượng, test plan và nguy cơ commit file sinh ra.

### Bước 6 — Merge và bàn giao

Sau khi merge hoặc hoàn thành một mốc lớn:

- cập nhật `PROJECT_HANDOFF.md` nếu có thay đổi trạng thái quan trọng;
- cập nhật README/docs nếu luồng chạy hoặc phạm vi dự án thay đổi;
- ghi lại việc còn lại để thành viên khác tiếp tục.

## 5. Quy trình thay đổi database

Khi thay đổi database, làm theo thứ tự:

1. Xác định thay đổi thuộc schema, index, trigger, role/RLS hay seed.
2. Sửa script SQL tương ứng trong `sql/`.
3. Nếu cần rollback/reset, dùng `sql/00_down.sql` trên môi trường dev/test.
4. Chạy database sạch để kiểm tra migration.
5. Seed dữ liệu demo hoặc benchmark.
6. Chạy query/API liên quan.
7. Cập nhật tài liệu:
   - `docs/02c_data_dictionary.md` nếu đổi bảng/cột/ràng buộc;
   - `docs/03_khoi_tao_csdl_migration_seed.md` nếu đổi thứ tự migration/seed;
   - `docs/04_toi_uu_csdl_index.md` nếu đổi index;
   - `docs/05_minh_chung_toi_uu_explain.md` nếu đổi benchmark.

## 6. Quy trình kiểm thử trước demo/release

Checklist tối thiểu:

| Hạng mục | Người phụ trách | Kiểm tra cần đạt |
|---|---|---|
| Build Docker app | Thành viên 1 | `docker compose build app` thành công |
| Chạy hệ thống | Thành viên 2 | `docker compose up -d db app` chạy thành công |
| Health check | Thành viên 2 | `http://localhost:8099/health` trả `database: ok` |
| Migration sạch | Thành viên 2 | `bash scripts/test_migrations.sh` pass |
| Đồng bộ DB demo | Thành viên 2 | `bash scripts/sync_docker_db.sh` pass khi dùng DB Docker hiện hữu |
| Backend regression | Thành viên 3 | `bash scripts/test_backend.sh` pass |
| Backup/restore | Thành viên 2 | `bash scripts/test_backup_restore.sh` pass |
| Mở web demo | Thành viên 4 | Web mở được tại `http://localhost:8099/` |
| Repositories/History | Thành viên 4 | Repositories hiển thị dữ liệu, click repo mở được History |
| Issues/Pull Requests | Thành viên 3 + Thành viên 4 | Tạo/đóng issue và tạo/merge pull request demo được nếu cần |
| Analytics | Thành viên 4 | Analytics hiển thị số liệu |
| Benchmark EXPLAIN | Thành viên 2 | Tài liệu benchmark có số liệu thật |
| Báo cáo/screenshot | Thành viên 1 + Thành viên 4 | Screenshot trong báo cáo khớp với giao diện hiện tại |
| Git hygiene | Thành viên 1 | Không commit `postgres_data/`, `frontend/dist/`, `node_modules/`, `.env` |

## 7. Quy trình backup/restore

Mục tiêu backup/restore trong GitMini là minh chứng năng lực quản trị CSDL.

Nguyên tắc:

- Backup không thay thế source code trong git.
- File dump không commit vào repository.
- Khi demo, cần nói rõ backup dùng để khôi phục dữ liệu PostgreSQL, không phải khôi phục mã nguồn.

Tài liệu liên quan:

- `docs/06_sao_luu_phuc_hoi.md`
- `scripts/backup.sh`
- `scripts/restore_test.sql`

## 8. Quy định dữ liệu và bảo mật

Không commit:

- `postgres_data/`
- `data/repos/`
- `frontend/node_modules/`
- `frontend/dist/`
- `.env`
- backup dump/log sinh ra khi chạy thử

Không hardcode thêm mật khẩu mới trong code. Nếu cần cấu hình, dùng biến môi trường hoặc tài liệu rõ trong Docker/dev setup.

## 9. Release/demo checklist

Trước khi nộp hoặc demo:

- [ ] README phản ánh đúng trạng thái mới nhất.
- [ ] `docs/10_lo_trinh_trien_khai.md` cập nhật đúng phase.
- [ ] `docs/05_minh_chung_toi_uu_explain.md` có số liệu benchmark thật.
- [ ] `docs/09_ung_dung_va_anh_minh_hoa.md` có screenshot mới.
- [ ] `docs/11_giai_trinh_tinh_moi_va_huu_ich.md` trả lời được câu hỏi về tính mới/hữu ích.
- [ ] Web chạy được bằng Docker.
- [ ] Không có dữ liệu local/generated trong commit.
- [ ] `PROJECT_HANDOFF.md` ghi rõ việc còn lại nếu chưa nộp ngay.

## 10. Cách giải thích với thầy

Có thể trình bày ngắn:

> Dạ nhóm em không chỉ viết code và SQL, mà tổ chức dự án theo quy trình sản phẩm nhỏ. Mỗi thay đổi đi qua issue, branch, commit, PR, checklist kiểm thử và cập nhật tài liệu. Database có quy trình migration, seed, benchmark, backup/restore. Web app chạy bằng Docker để mọi thành viên có môi trường giống nhau. Vì vậy dự án có thể bàn giao, vận hành và kiểm chứng lại chứ không chỉ chạy được trên máy một người.
