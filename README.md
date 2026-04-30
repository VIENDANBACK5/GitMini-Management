# GitMini — Hệ thống quản lý và lưu trữ mã nguồn tập trung

GitMini là bài tập lớn môn Quản trị Cơ sở dữ liệu nâng cao, mô phỏng hệ thống quản lý mã nguồn trên nền PostgreSQL. Dự án tập trung vào thiết kế CSDL SQL 20 bảng, commit graph dạng DAG, tối ưu truy vấn, bảo mật, sao lưu/phục hồi và ứng dụng minh họa.

## 1. Cấu trúc tài liệu nộp bài

Toàn bộ tài liệu báo cáo nằm trong thư mục `docs/`, được đánh số theo đúng trình tự yêu cầu bài tập lớn.

| STT | Tài liệu | Nội dung chính | Trạng thái |
|---:|---|---|---|
| 01 | [Mô tả chức năng](docs/01_mo_ta_chuc_nang.md) | Tổng quan hệ thống, đối tượng người dùng, use case | Đã có |
| 02a | [Phân tích thực thể](docs/02a_phan_tich_thuc_the.md) | Thực thể, thuộc tính, ràng buộc, quan hệ | Đã có |
| 02b | [Lược đồ quan hệ và chuẩn hóa](docs/02b_luoc_do_quan_he_va_chuan_hoa.md) | Lược đồ logic, quan hệ, chứng minh 3NF | Đã có |
| 02c | [Data Dictionary](docs/02c_data_dictionary.md) | Lược đồ vật lý, bảng/cột/kiểu dữ liệu/ràng buộc | Đã có |
| 03 | [Khởi tạo CSDL, Migration và Seed](docs/03_khoi_tao_csdl_migration_seed.md) | Script migration, seed, thứ tự chạy | Đã có |
| 04 | [Tối ưu CSDL — Index](docs/04_toi_uu_csdl_index.md) | Danh sách index và mục đích sử dụng | Đã có |
| 05 | [Minh chứng tối ưu — EXPLAIN](docs/05_minh_chung_toi_uu_explain.md) | Benchmark sạch, query EXPLAIN ANALYZE, số liệu thực tế | Đã có |
| 06 | [Sao lưu và phục hồi](docs/06_sao_luu_phuc_hoi.md) | Backup, WAL, PITR, restore, replication dự phòng | Đã có |
| 07 | [Bảo mật RBAC/RLS](docs/07_bao_mat_rbac_rls.md) | CIA, RBAC, RLS, SSL/TLS, audit | Đã có |
| 08 | [Kỹ thuật nâng cao](docs/08_ky_thuat_nang_cao.md) | DAG, Recursive CTE, GIN, Trigger, Replication, Sharding | Đã có |
| 09 | [Ứng dụng và ảnh minh họa](docs/09_ung_dung_va_anh_minh_hoa.md) | Frontend, API cần có, danh sách screenshot | Cần chụp ảnh sau khi app chạy |
| 10 | [Lộ trình triển khai](docs/10_lo_trinh_trien_khai.md) | Các giai đoạn triển khai dự án | Cần cập nhật trạng thái sau Phase 4 |
| 11 | [Giải trình tính mới và hữu ích](docs/11_giai_trinh_tinh_moi_va_huu_ich.md) | Cách trả lời khi so sánh với GitHub/GitLab, giá trị học thuật và analytics | Đã có |
| 12 | [Quy trình vận hành sản phẩm](docs/12_quy_trinh_van_hanh_san_pham.md) | Quy trình team, issue, branch, PR, review, release/demo checklist | Đã có |
| 13 | [Phân quyền người dùng và luồng làm việc nhóm](docs/13_phan_quyen_nguoi_dung_va_luong_lam_viec_nhom.md) | Multi-user demo, repo membership, role matrix và permission workflow | Đã có |
| 14 | [Tiến độ và phân công nhóm](docs/14_tien_do_va_phan_cong_nhom.md) | Phân công 4 thành viên, bảng tiến độ, review chéo, minh chứng kiểm thử | Đã có |
| 15 | [Lý thuyết CSDL và câu hỏi bảo vệ](docs/15_ly_thuyet_csdl_va_cau_hoi_bao_ve.md) | Kiến thức CSDL nền tảng, câu hỏi thầy có thể hỏi theo từng thành viên | Đã có |
| Diagrams | [Sơ đồ draw.io](docs/diagrams/README.md) | ERD, lược đồ vật lý chi tiết, kiến trúc quản trị CSDL, phân công nhóm, lifecycle dữ liệu | Đã có |
| 99 | [Ghi chú dự án gốc](docs/99_ghi_chu_du_an_goc.md) | Note/raw idea từ Google Docs | Tài liệu tham khảo, không phải bản nộp chính |

## 2. Cấu trúc mã nguồn

```text
sql/
  01_schema.sql
  02_indexes.sql
  03_triggers.sql
  04_security_roles.sql
  05_security_rls.sql
  08_phase4_pr_governance.sql
  09_extend_to_20_tables.sql

scripts/
  seed_data.py
  backup.sh
  restore_test.sql

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
  ...
```

## 3. Mapping yêu cầu bài tập lớn với tài liệu

| Yêu cầu của thầy | Tài liệu tương ứng |
|---|---|
| Mô tả chức năng | `docs/01_mo_ta_chuc_nang.md` |
| Phân tích thực thể | `docs/02a_phan_tich_thuc_the.md` |
| Lược đồ quan hệ + chuẩn hóa | `docs/02b_luoc_do_quan_he_va_chuan_hoa.md` |
| Lược đồ vật lý + Data Dictionary | `docs/02c_data_dictionary.md` |
| Migration + seed | `docs/03_khoi_tao_csdl_migration_seed.md` |
| Danh sách index + mục đích | `docs/04_toi_uu_csdl_index.md` |
| Minh chứng EXPLAIN query | `docs/05_minh_chung_toi_uu_explain.md` |
| Sao lưu, phục hồi | `docs/06_sao_luu_phuc_hoi.md` |
| Kỹ thuật nâng cao | `docs/08_ky_thuat_nang_cao.md` |
| Ứng dụng + ảnh minh họa | `docs/09_ung_dung_va_anh_minh_hoa.md` |
| Quy trình vận hành nhóm | `CONTRIBUTING.md`, `docs/12_quy_trinh_van_hanh_san_pham.md` |
| Tiến độ và phân công nhóm | `docs/14_tien_do_va_phan_cong_nhom.md` |
| Lý thuyết CSDL và câu hỏi bảo vệ | `docs/15_ly_thuyet_csdl_va_cau_hoi_bao_ve.md` |
| Multi-user và phân quyền repository | `docs/13_phan_quyen_nguoi_dung_va_luong_lam_viec_nhom.md`, `sql/05_security_rls.sql` |

## 4. Quy trình làm việc nhóm

Nhóm 4 thành viên chia theo 4 nhánh quản trị CSDL chính như sau:

| Thành viên | Nhánh CSDL phụ trách | Đầu ra cần có |
|---|---|---|
| Thành viên 1 | Phân tích nghiệp vụ CSDL, thực thể, chuẩn hóa, data dictionary | Báo cáo/docs đầy đủ, mô hình dữ liệu rõ, mapping yêu cầu bài tập lớn |
| Thành viên 2 | Thiết kế vật lý PostgreSQL, schema, index, trigger, migration, backup/restore | SQL chạy lại được, DB demo sạch, benchmark và backup/restore có minh chứng |
| Thành viên 3 | Bảo mật dữ liệu, RBAC/RLS, membership permission, audit log | Phân quyền đúng, không lộ dữ liệu private, audit log kiểm chứng được |
| Thành viên 4 | Khai thác dữ liệu, truy vấn history/issue/PR, analytics, minh chứng giao diện | Query/API trả đúng dữ liệu, dashboard có số liệu, screenshot khớp giao diện hiện tại |

Các thành viên nên làm việc theo quy trình sau:

1. Nhận task từ issue hoặc checklist có mục tiêu rõ ràng.
2. Tạo branch theo quy ước `feature/`, `fix/`, `docs/`, `chore/`.
3. Commit theo quy ước `feat:`, `fix:`, `docs:`, `chore:`, `test:`.
4. Chạy checklist kiểm thử phù hợp trước khi tạo PR.
5. Tạo PR theo template và để thành viên khác review chéo theo bảng trong `docs/12_quy_trinh_van_hanh_san_pham.md`.
6. Cập nhật tài liệu/handoff nếu thay đổi ảnh hưởng demo, database hoặc báo cáo.

Tài liệu quy trình:

- [CONTRIBUTING.md](CONTRIBUTING.md) — hướng dẫn setup, branch, commit, PR và review.
- [Quy trình vận hành sản phẩm](docs/12_quy_trinh_van_hanh_san_pham.md) — vai trò nhóm, môi trường, kiểm thử, release/demo checklist.
- [.github/pull_request_template.md](.github/pull_request_template.md) — checklist PR.
- [.github/ISSUE_TEMPLATE/task.md](.github/ISSUE_TEMPLATE/task.md) — template task.

## 5. Kiểm thử chuẩn

Không reset hoặc xóa `postgres_data/` để kiểm thử. Khi cần database sạch, dùng PostgreSQL container tạm.

```bash
bash scripts/test_migrations.sh
```

Nếu DB Docker hiện hữu bị lệch schema do chạy từ phiên bản cũ, đồng bộ lại không xóa dữ liệu bằng:

```bash
bash scripts/sync_docker_db.sh
```

```bash
bash scripts/test_backend.sh
```

```bash
cd frontend
npm ci
npm run build
```

```bash
docker compose build app
```

```bash
docker compose config
docker compose up -d db app
```

```bash
bash scripts/test_backup_restore.sh
```

## 6. Điểm cần hoàn thiện tiếp

Các phần còn lại trước khi nộp/bảo vệ:

1. Chạy ứng dụng, chụp screenshot và cập nhật `docs/09_ung_dung_va_anh_minh_hoa.md`.
2. Kiểm tra lần cuối các tài liệu từ `01` đến `13`.
3. Kiểm tra git trước khi commit để không đưa `postgres_data/`, `frontend/dist/`, `node_modules/` hoặc file `.env` vào repository.

## 7. Ghi chú

File `docs/99_ghi_chu_du_an_goc.md` là tài liệu ghi chú/raw idea ban đầu, giữ lại để tham khảo. Khi nộp bài, nên ưu tiên các file từ `01` đến `10`.
