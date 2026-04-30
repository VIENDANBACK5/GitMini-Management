# GitMini — Lộ trình triển khai

Tài liệu này mô tả lộ trình triển khai GitMini theo các giai đoạn. Mục tiêu là thể hiện dự án được phát triển có kế hoạch: từ thiết kế CSDL, triển khai SQL core, bảo mật, ứng dụng minh họa, benchmark tối ưu, đến chuẩn hóa quy trình vận hành nhóm.

---

## Phase 1 — Thiết kế và đặc tả

**Trạng thái:** Hoàn thành

Nội dung đã thực hiện:

1. Mô tả chức năng hệ thống.
2. Phân tích thực thể và quan hệ.
3. Xây dựng lược đồ quan hệ.
4. Chuẩn hóa đến 3NF.
5. Viết data dictionary.

Tài liệu liên quan:

- `docs/01_mo_ta_chuc_nang.md`
- `docs/02a_phan_tich_thuc_the.md`
- `docs/02b_luoc_do_quan_he_va_chuan_hoa.md`
- `docs/02c_data_dictionary.md`

---

## Phase 2 — SQL core và dữ liệu nền

**Trạng thái:** Hoàn thành

Nội dung đã thực hiện:

1. Tạo schema PostgreSQL 20 bảng cho users, repositories, membership, commit graph, file changes, issues, pull requests, releases, CI, audit, backup và repo_stats.
2. Tạo khóa chính, khóa ngoại, ràng buộc dữ liệu.
3. Tạo index B-tree và GIN.
4. Tạo trigger cập nhật `repo_stats`.
5. Tạo seed script hỗ trợ profile `demo` và `benchmark`.

Tài liệu/script liên quan:

- `sql/01_schema.sql`
- `sql/02_indexes.sql`
- `sql/03_triggers.sql`
- `scripts/seed_data.py`
- `docs/03_khoi_tao_csdl_migration_seed.md`
- `docs/04_toi_uu_csdl_index.md`

---

## Phase 3 — Bảo mật và vận hành CSDL

**Trạng thái:** Hoàn thành mức phục vụ bài tập lớn

Nội dung đã thực hiện:

1. Thiết kế RBAC với các role quản trị/phát triển/reviewer.
2. Thiết kế Row Level Security cho repository private.
3. Viết tài liệu bảo mật theo CIA.
4. Viết tài liệu backup/restore, WAL/PITR và replication dự phòng.
5. Có script backup và restore test checklist.

Tài liệu/script liên quan:

- `sql/04_security_roles.sql`
- `sql/05_security_rls.sql`
- `docs/06_sao_luu_phuc_hoi.md`
- `docs/07_bao_mat_rbac_rls.md`
- `scripts/backup.sh`
- `scripts/restore_test.sql`

---

## Phase 4 — Ứng dụng minh họa Web + Docker

**Trạng thái:** Hoàn thành

Nội dung đã thực hiện:

1. Backend FastAPI đọc/ghi dữ liệu từ PostgreSQL.
2. Frontend React/Vite cho các màn hình demo chính.
3. Docker đóng gói backend + React production build.
4. Các luồng demo chính:
   - xem repositories;
   - xem commit history;
   - tìm kiếm issue/commit;
   - tạo/đóng issue;
   - tạo/đóng/merge pull request;
   - xem analytics.
5. Giao diện đã được nâng cấp theo hướng dashboard sản phẩm.

Tài liệu/code liên quan:

- `backend/`
- `frontend/`
- `docker-compose.yml`
- `backend/Dockerfile`
- `docs/09_ung_dung_va_anh_minh_hoa.md`

Việc còn lại của phase này:

- Chụp screenshot thực tế và cập nhật đầy đủ vào `docs/09_ung_dung_va_anh_minh_hoa.md`.

---

## Phase 5 — Benchmark và minh chứng tối ưu

**Trạng thái:** Hoàn thành

Nội dung đã thực hiện:

1. Tạo database benchmark sạch riêng để đo.
2. Seed profile `benchmark`:
   - 1,000 users;
   - 1,000 repositories;
   - 100,000 commits;
   - 10,000 issues;
   - 2,000 pull requests.
3. Chạy `EXPLAIN ANALYZE` cho các nhóm truy vấn:
   - commit history theo repository;
   - full-text search issue bằng GIN;
   - full-text search commit message bằng GIN;
   - dashboard dùng `repo_stats` so với `COUNT(*)` trực tiếp;
   - Recursive CTE duyệt commit graph.
4. Ghi số liệu thực tế vào tài liệu benchmark.

Tài liệu/script liên quan:

- `sql/06_benchmark_queries.sql`
- `docs/05_minh_chung_toi_uu_explain.md`

---

## Phase 6 — Tính mới, analytics và giải trình bảo vệ

**Trạng thái:** Hoàn thành

Nội dung đã thực hiện:

1. Bổ sung SQL analytics để chứng minh dữ liệu GitMini có thể khai thác quản trị.
2. Thêm endpoint `/analytics` ở backend.
3. Thêm tab Analytics ở React UI.
4. Viết tài liệu giải trình tính mới và hữu ích so với GitHub/GitLab.

Tài liệu/code liên quan:

- `sql/07_analytics_queries.sql`
- `docs/11_giai_trinh_tinh_moi_va_huu_ich.md`
- `backend/app/queries.py`
- `backend/app/main.py`
- `frontend/src/App.jsx`

---

## Phase 7 — Chuẩn hóa quy trình vận hành nhóm

**Trạng thái:** Hoàn thành bước chuẩn hóa tài liệu/quy trình

Nội dung đã thực hiện:

1. Thêm `.gitignore` để tránh commit dữ liệu local/generated.
2. Thêm `CONTRIBUTING.md` hướng dẫn thành viên setup, branch, commit, PR và review.
3. Thêm template issue/PR trong `.github/`.
4. Thêm tài liệu quy trình vận hành sản phẩm.
5. README đã liên kết tới tài liệu quy trình nhóm.

Tài liệu liên quan:

- `.gitignore`
- `CONTRIBUTING.md`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/task.md`
- `docs/12_quy_trinh_van_hanh_san_pham.md`

---

## Phase 8 — Multi-user, membership và permission workflow

**Trạng thái:** Hoàn thành bước triển khai demo

Nội dung đã thực hiện:

1. Thêm bảng `repo_members` để lưu vai trò theo từng repository.
2. Seed các tài khoản demo `admin`, `alice`, `bob`, `carol`, `david` với password chung `gitmini_password`.
3. Seed membership mẫu để có owner, maintainer, developer, reviewer và viewer.
4. Backend hỗ trợ nhiều Basic Auth user, endpoint `/auth/me`, lọc repository theo quyền và enforce quyền ghi.
5. Frontend có user switcher, role badge và disable action theo capability backend trả về.
6. Thêm tài liệu giải thích role matrix và cách demo workflow nhóm.

Tài liệu/code liên quan:

- `sql/01_schema.sql`
- `sql/05_security_rls.sql`
- `scripts/seed_data.py`
- `backend/app/auth.py`
- `backend/app/main.py`
- `backend/app/queries.py`
- `frontend/src/App.jsx`
- `frontend/src/api.js`
- `docs/13_phan_quyen_nguoi_dung_va_luong_lam_viec_nhom.md`

---

## Việc còn lại trước khi nộp

1. Chạy web app và chụp screenshot cho `docs/09_ung_dung_va_anh_minh_hoa.md`.
2. Kiểm tra lại toàn bộ tài liệu từ `docs/01` đến `docs/13`.
3. Kiểm tra git status để không commit dữ liệu sinh ra như `postgres_data/`, `frontend/dist/`, `node_modules/`, `.env`.
4. Nếu cần, cập nhật `PROJECT_HANDOFF.md` trước khi chuyển cho thành viên khác.

---

## Nguyên tắc thực hiện tiếp

- Mỗi task nên có issue hoặc checklist rõ ràng.
- Mỗi thay đổi nên đi qua branch, commit, PR và review.
- Thay đổi database phải cập nhật tài liệu tương ứng.
- Thay đổi UI phải kiểm tra bằng browser và chụp ảnh nếu phục vụ báo cáo.
- Không commit dữ liệu local/generated hoặc thông tin nhạy cảm.
