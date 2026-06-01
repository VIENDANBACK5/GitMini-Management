# GitMini — Tiến độ và phân công công việc nhóm

Tài liệu này dùng để chứng minh nhóm quản lý công việc có kế hoạch, có phân công rõ ràng, có kiểm thử và có minh chứng bàn giao. Vì đây là môn Quản trị Cơ sở dữ liệu, cả 4 thành viên đều tham gia phần CSDL; mỗi người phụ trách một nhánh quản trị CSDL khác nhau, còn backend/frontend chỉ là lớp minh chứng để kiểm tra và trình bày kết quả.

---

## 1. Nguyên tắc quản lý công việc

Nhóm không làm theo kiểu mỗi người sửa tự do, mà quản lý theo quy trình:

```text
Yêu cầu bài tập lớn
→ Phân rã thành phase/task
→ Gán người phụ trách
→ Thực hiện trên đúng phạm vi
→ Kiểm thử theo checklist
→ Review chéo
→ Cập nhật tài liệu/minh chứng
→ Chuẩn bị demo/bảo vệ
```

Mỗi task cần có tối thiểu:

1. Mục tiêu cần đạt.
2. Người phụ trách chính.
3. Người review chéo.
4. File hoặc khu vực bị ảnh hưởng.
5. Kết quả kiểm thử hoặc minh chứng.
6. Trạng thái hiện tại.

---

## 2. Phân công vai trò 4 thành viên theo trọng tâm CSDL

| Thành viên | Vai trò CSDL chính | Phạm vi CSDL phụ trách | Phần app/tài liệu dùng để minh chứng |
|---|---|---|---|
| Thành viên 1 | Phân tích nghiệp vụ CSDL và tài liệu hóa | Mô tả chức năng, phân tích thực thể, quan hệ, chuẩn hóa, data dictionary, mapping yêu cầu bài tập lớn | README, báo cáo, slide/nội dung bảo vệ, checklist nộp bài |
| Thành viên 2 | Thiết kế vật lý và vận hành PostgreSQL | Schema, khóa chính/khóa ngoại, index, trigger, migration, seed data, Docker DB, backup/restore | Script SQL, seed demo/benchmark, migration smoke test, backup/restore test |
| Thành viên 3 | Bảo mật, phân quyền và kiểm soát dữ liệu | RBAC, RLS, membership permission, audit log, kiểm thử quyền truy cập dữ liệu qua API | FastAPI endpoint, auth/session, audit API, backend regression tests |
| Thành viên 4 | Khai thác dữ liệu, truy vấn và minh chứng giao diện | Query phục vụ issue/PR/history, analytics, dashboard, screenshot chứng minh dữ liệu CSDL hiển thị đúng | React UI, analytics tab, luồng demo, ảnh minh họa báo cáo |

---

## 3. Cơ chế review chéo

Để tránh một người tự làm tự kiểm, nhóm review chéo như sau:

| Mảng công việc CSDL | Người làm chính | Người review chéo | Nội dung review |
|---|---|---|---|
| Phân tích yêu cầu, thực thể, chuẩn hóa | Thành viên 1 | Thành viên 2 | Mô hình logic có chuyển được thành schema PostgreSQL không |
| Schema vật lý, index, trigger, migration | Thành viên 2 | Thành viên 3 | Ràng buộc, quyền và trigger có an toàn khi API ghi dữ liệu không |
| RBAC/RLS, audit, kiểm thử quyền dữ liệu | Thành viên 3 | Thành viên 4 | Dữ liệu trả ra UI có đúng quyền, không lộ private repo không |
| Query khai thác, analytics, minh chứng dữ liệu | Thành viên 4 | Thành viên 1 | Kết quả truy vấn có giải thích được trong báo cáo/bảo vệ không |
| Backup/restore, Docker DB, checklist cuối | Thành viên 2 + Thành viên 1 | Thành viên 3 + Thành viên 4 | DB dựng lại được, migration/seed/test chạy lại được trên môi trường sạch |

---

## 4. Bảng tiến độ tổng hợp theo phase

| Phase | Nội dung | Người phụ trách chính | Người review | Trạng thái | Minh chứng |
|---|---|---|---|---|---|
| 1 | Thiết kế chức năng, thực thể, quan hệ, chuẩn hóa | Thành viên 1 | Thành viên 2 | Hoàn thành | `docs/01`, `docs/02a`, `docs/02b`, `docs/02c` |
| 2 | SQL core: schema, index, trigger, seed data | Thành viên 2 | Thành viên 3 | Hoàn thành | `sql/01_schema.sql`, `sql/02_indexes.sql`, `sql/03_triggers.sql`, `scripts/seed_data.py` |
| 3 | Bảo mật CSDL: RBAC, RLS, backup/restore | Thành viên 2 | Thành viên 3 | Hoàn thành | `sql/04_security_roles.sql`, `sql/05_security_rls.sql`, `docs/06`, `docs/07` |
| 4 | Web app Docker: backend + frontend demo | Thành viên 3 + Thành viên 4 | Thành viên 1 | Hoàn thành | `backend/`, `frontend/`, `docker-compose.yml` |
| 5 | Benchmark và minh chứng tối ưu | Thành viên 2 | Thành viên 1 | Hoàn thành | `sql/06_benchmark_queries.sql`, `docs/05_minh_chung_toi_uu_explain.md` |
| 6 | Analytics và giải trình tính mới/hữu ích | Thành viên 3 + Thành viên 4 | Thành viên 1 | Hoàn thành | `sql/07_analytics_queries.sql`, `docs/11_giai_trinh_tinh_moi_va_huu_ich.md` |
| 7 | Chuẩn hóa quy trình nhóm, issue/PR/review | Thành viên 1 | Thành viên 2 | Hoàn thành | `CONTRIBUTING.md`, `.github/`, `docs/12_quy_trinh_van_hanh_san_pham.md` |
| 8 | Multi-user, membership và permission workflow | Thành viên 3 | Thành viên 4 | Hoàn thành | `docs/13_phan_quyen_nguoi_dung_va_luong_lam_viec_nhom.md`, API auth/permission |
| 9 | Test suite, migration smoke test, regression check | Thành viên 3 | Thành viên 2 | Hoàn thành | `scripts/test_migrations.sh`, `scripts/test_backend.sh`, backend tests |
| 10 | Deployment, backup verification, observability | Thành viên 2 | Thành viên 1 | Hoàn thành | `docker-compose.yml`, `scripts/test_backup_restore.sh`, `/health` |
| 11 | UX polish, screenshot, final handoff | Thành viên 4 + Thành viên 1 | Thành viên 2 | Đang hoàn thiện | `docs/09_ung_dung_va_anh_minh_hoa.md`, `PROJECT_HANDOFF.md` |

---

## 5. Bảng công việc chi tiết hiện tại

| Mã task | Công việc | Người phụ trách | Người review | Trạng thái | Cách kiểm chứng |
|---|---|---|---|---|---|
| CSDL-PT-01 | Phân tích chức năng thành yêu cầu dữ liệu | Thành viên 1 | Thành viên 2 | Hoàn thành | `docs/01_mo_ta_chuc_nang.md` mô tả actor, use case và dữ liệu cần lưu |
| CSDL-PT-02 | Phân tích thực thể, thuộc tính và quan hệ | Thành viên 1 | Thành viên 2 | Hoàn thành | `docs/02a_phan_tich_thuc_the.md` có users, repositories, commits, issues, PR |
| CSDL-PT-03 | Chuẩn hóa và viết data dictionary | Thành viên 1 | Thành viên 2 | Hoàn thành | `docs/02b`, `docs/02c` chứng minh 3NF và mô tả bảng/cột/ràng buộc |
| CSDL-VL-01 | Thiết kế schema PostgreSQL vật lý | Thành viên 2 | Thành viên 3 | Hoàn thành | `sql/01_schema.sql` chạy được trên DB sạch |
| CSDL-VL-02 | Thiết kế index B-tree/GIN cho truy vấn chính | Thành viên 2 | Thành viên 3 | Hoàn thành | `sql/02_indexes.sql`, `docs/04_toi_uu_csdl_index.md` |
| CSDL-VL-03 | Thiết kế trigger duy trì bảng thống kê `repo_stats` | Thành viên 2 | Thành viên 3 | Hoàn thành | `sql/03_triggers.sql`, analytics/dashboard có số liệu |
| CSDL-VL-04 | Seed dữ liệu demo và benchmark | Thành viên 2 | Thành viên 1 | Hoàn thành | `python scripts/seed_data.py --profile demo` hoặc `benchmark` |
| CSDL-VL-05 | Mở rộng schema lên 20 bảng CSDL | Thành viên 2 | Thành viên 1 + Thành viên 3 | Hoàn thành | `sql/09_extend_to_20_tables.sql`, `docs/02c_data_dictionary.md` |
| CSDL-VH-01 | Kiểm tra migration chạy lại an toàn | Thành viên 2 | Thành viên 3 | Hoàn thành | `bash scripts/test_migrations.sh` pass và kiểm tra đủ 20 bảng |
| CSDL-VH-02 | Đồng bộ DB Docker hiện hữu khi lệch schema | Thành viên 2 | Thành viên 1 | Hoàn thành | `bash scripts/sync_docker_db.sh` pass |
| CSDL-VH-03 | Backup/restore trên PostgreSQL tạm | Thành viên 2 | Thành viên 1 | Hoàn thành | `bash scripts/test_backup_restore.sh` pass |
| CSDL-BM-01 | Thiết kế RBAC/RLS | Thành viên 3 | Thành viên 2 | Hoàn thành | `sql/04_security_roles.sql`, `sql/05_security_rls.sql`, `docs/07` |
| CSDL-BM-02 | Kiểm soát quyền theo repository membership | Thành viên 3 | Thành viên 4 | Hoàn thành | Viewer bị chặn thao tác ghi, owner/maintainer có quyền phù hợp |
| CSDL-BM-03 | Audit log cho hành động nhạy cảm | Thành viên 3 | Thành viên 2 | Hoàn thành | `/admin/audit-logs` trả dữ liệu cho admin |
| CSDL-BM-04 | Regression test cho quyền truy cập dữ liệu | Thành viên 3 | Thành viên 2 | Hoàn thành | `bash scripts/test_backend.sh` pass |
| CSDL-KT-01 | Truy vấn repository/history/issue/PR phục vụ khai thác dữ liệu | Thành viên 4 | Thành viên 3 | Hoàn thành | UI hiển thị dữ liệu từ `/repos`, `/issues`, `/pulls` |
| CSDL-KT-02 | Analytics dashboard từ dữ liệu PostgreSQL | Thành viên 4 | Thành viên 1 | Hoàn thành | Tab Analytics hiển thị số liệu quản trị |
| CSDL-KT-03 | Minh chứng giao diện cho dữ liệu CSDL | Thành viên 4 | Thành viên 1 | Đang hoàn thiện | Cập nhật screenshot vào `docs/09_ung_dung_va_anh_minh_hoa.md` |
| CSDL-KT-04 | Benchmark EXPLAIN và giải thích tối ưu | Thành viên 4 + Thành viên 2 | Thành viên 1 | Hoàn thành | `docs/05_minh_chung_toi_uu_explain.md`, `sql/06_benchmark_queries.sql` |
| REL-01 | Smoke test cuối trước demo CSDL | Thành viên 1 + Thành viên 2 | Thành viên 3 + Thành viên 4 | Hoàn thành | `/health`, `/repos`, `/issues`, `/pulls`, `/admin/audit-logs` trả 200 |
| REL-02 | Kiểm tra không commit dữ liệu sinh ra | Thành viên 1 | Thành viên 2 | Đang duy trì | `git status --short`, `.gitignore`, `.dockerignore` |

---

## 6. Checklist kiểm thử và người chịu trách nhiệm

| Lệnh/kiểm tra | Mục đích | Người chạy chính | Kết quả kỳ vọng |
|---|---|---|---|
| `bash scripts/test_migrations.sh` | Kiểm tra migration chạy trên DB sạch và chạy lại an toàn | Thành viên 2 | Pass |
| `bash scripts/sync_docker_db.sh` | Đồng bộ DB Docker hiện hữu không xóa dữ liệu | Thành viên 2 | Pass |
| `bash scripts/test_backend.sh` | Chạy regression tests backend/API/permission | Thành viên 3 | Pass |
| `cd frontend && npm ci && npm run build` | Kiểm tra frontend build production | Thành viên 4 | Pass |
| `docker compose build app` | Kiểm tra build image app | Thành viên 1 | Pass |
| `docker compose up -d db app` | Chạy hệ thống demo | Thành viên 2 | DB và app healthy |
| `bash scripts/test_backup_restore.sh` | Kiểm chứng backup/restore trên DB tạm | Thành viên 2 | Pass |
| Mở `http://localhost:8099/` | Kiểm tra UI demo | Thành viên 4 | Web có dữ liệu demo |
| Mở `http://localhost:8099/health` | Kiểm tra health backend/database | Thành viên 2 | `{"status":"ok","database":"ok"}` |

---

## 7. Minh chứng trạng thái gần nhất

Tại thời điểm cập nhật tài liệu này, nhóm đã kiểm tra các điểm chính sau:

| Hạng mục | Trạng thái | Minh chứng |
|---|---|---|
| Migration idempotent | Đạt | `bash scripts/test_migrations.sh` pass trên PostgreSQL container tạm |
| Docker app + DB | Đạt | `docker compose ps` hiển thị `gitmini_app_container` và `gitmini_db_container` healthy |
| DB demo sạch | Đạt | Đã reset DB Docker, chạy migration và seed demo |
| API health | Đạt | `/health` trả 200 |
| Login demo | Đạt | `admin` login bằng `gitmini_password` thành công |
| API chính | Đạt | `/repos`, `/issues`, `/pulls`, `/admin/audit-logs` trả 200 |
| Backup/restore | Đạt | Có script `scripts/test_backup_restore.sh` kiểm chứng trên DB tạm |
| Schema 20 bảng | Đạt | `sql/09_extend_to_20_tables.sql`, migration smoke test kiểm tra đủ 20 bảng |
| Phân công nhóm | Đạt | README, CONTRIBUTING, `docs/12`, `docs/14` đã thống nhất nhóm 4 thành viên |

---

## 8. Việc còn lại trước khi nộp/bảo vệ

| Việc còn lại | Người phụ trách | Hạn/ưu tiên | Ghi chú |
|---|---|---|---|
| Chụp screenshot giao diện chứng minh dữ liệu CSDL | Thành viên 4 | Cao | Cần cập nhật vào `docs/09_ung_dung_va_anh_minh_hoa.md` |
| Kiểm tra toàn bộ tài liệu từ `docs/01` đến `docs/14` | Thành viên 1 | Cao | Đảm bảo thuật ngữ CSDL, lệnh chạy, trạng thái thống nhất |
| Chạy lại checklist demo CSDL cuối | Thành viên 1 + Thành viên 2 | Cao | Chạy migration, seed, health, backup/restore trước buổi bảo vệ/nộp bài |
| Chuẩn bị câu trả lời về backup, RLS, index, benchmark và schema 20 bảng | Thành viên 2 + Thành viên 3 | Trung bình | Dùng `docs/02c`, `docs/05`, `docs/06`, `docs/07`, `docs/15` |
| Chuẩn bị kịch bản demo khai thác dữ liệu | Thành viên 4 | Trung bình | Login, repositories, history, issues, PR, analytics |

---

## 9. Cách trình bày với thầy

Có thể trình bày ngắn gọn:

> Vì đây là môn Quản trị Cơ sở dữ liệu, nhóm em chia 4 thành viên theo 4 nhánh CSDL: phân tích và chuẩn hóa dữ liệu, thiết kế/vận hành PostgreSQL, bảo mật và kiểm soát truy cập dữ liệu, khai thác dữ liệu và minh chứng truy vấn. Backend và frontend chỉ là lớp minh họa để chứng minh database hoạt động đúng. Mỗi thành viên đều có đầu việc CSDL, có người review chéo và có lệnh hoặc tài liệu kiểm chứng rõ ràng.
