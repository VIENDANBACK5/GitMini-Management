# GitMini — Hệ thống quản trị và lưu trữ mã nguồn tập trung

GitMini là bài tập lớn môn Quản trị Cơ sở dữ liệu nâng cao, mô phỏng hệ thống quản lý mã nguồn trên nền tảng PostgreSQL. Dự án tập trung vào thiết kế CSDL SQL 20 bảng, commit graph dạng DAG, tối ưu truy vấn, bảo mật, sao lưu/phục hồi và ứng dụng minh họa.

## 1. Cấu trúc tài liệu nộp bài (Theo yêu cầu giảng viên)

Tài liệu được tổ chức bám sát khung nội dung hướng dẫn của Bài tập lớn:

### PHẦN 1: TÀI LIỆU PHÂN TÍCH

| Mục lục | Tài liệu chi tiết | Nội dung chính |
|:--- |:--- |:--- |
| **1.1. Mô tả chức năng** | [docs/01_mo_ta_chuc_nang.md](docs/01_mo_ta_chuc_nang.md) | Tổng quan hệ thống, đối tượng người dùng, bảng tổng hợp use case. |
| **1.2. Tài liệu thiết kế CSDL** | | |
| &nbsp;&nbsp;&nbsp;&nbsp;a, Phân tích thực thể | [docs/02a_phan_tich_thuc_the.md](docs/02a_phan_tich_thuc_the.md) | Thực thể, thuộc tính, ràng buộc, quan hệ (ERD). |
| &nbsp;&nbsp;&nbsp;&nbsp;b, Lược đồ & Chuẩn hóa | [docs/02b_luoc_do_quan_he_va_chuan_hoa.md](docs/02b_luoc_do_quan_he_va_chuan_hoa.md) | Lược đồ Logic, Lược đồ Vật lý, Chứng minh chuẩn hóa 3NF. |
| &nbsp;&nbsp;&nbsp;&nbsp;c, Data Dictionary | [docs/02c_data_dictionary.md](docs/02c_data_dictionary.md) | Chi tiết Bảng (Tên, mục đích), Cột (Kiểu dữ liệu, ràng buộc). |
| **1.3. Tài liệu khởi tạo CSDL** | [docs/03_khoi_tao_csdl_migration_seed.md](docs/03_khoi_tao_csdl_migration_seed.md) | Script migration (up/down), script seed dữ liệu mẫu. |
| **1.4. Tài liệu tối ưu CSDL** | [docs/04_toi_uu_csdl_index.md](docs/04_toi_uu_csdl_index.md) | Danh sách chỉ mục (index) và mục đích sử dụng chi tiết. |
| **1.5. Sao lưu & Phục hồi** | [docs/06_sao_luu_phuc_hoi.md](docs/06_sao_luu_phuc_hoi.md) | Chiến lược backup/restore, hướng dẫn PITR. |
| **1.6. Minh chứng tối ưu** | [docs/05_minh_chung_toi_uu_explain.md](docs/05_minh_chung_toi_uu_explain.md) | Kết quả chạy thực tế EXPLAIN ANALYZE trên database thật. |
| **1.7. Kỹ thuật nâng cao** | [docs/08_ky_thuat_nang_cao.md](docs/08_ky_thuat_nang_cao.md) | Replication (Master-Slave), Recursive CTE, GIN Index. |

### PHẦN 2: ỨNG DỤNG

| Mục lục | Tài liệu chi tiết | Nội dung chính |
|:--- |:--- |:--- |
| **2.1. Ảnh minh họa** | [docs/09_ung_dung_va_anh_minh_hoa.md](docs/09_ung_dung_va_anh_minh_hoa.md) | Giao diện Dashboard, Commit Graph, Issue Tracking. |

---

## 2. Cấu trúc thư mục dự án

*   `backend/`: Source code FastAPI xử lý logic và truy vấn DB.
*   `frontend/`: Giao diện React/Vite minh họa dữ liệu.
*   `sql/`: Toàn bộ các file script SQL (Migration, Index, Security, Analytics).
*   `scripts/`: Các script vận hành (Seed dữ liệu, Backup/Restore test).
*   `docs/`: Tài liệu báo cáo chi tiết.
*   `docs/diagrams/`: File sơ đồ kiến trúc và ERD (định dạng `.drawio`).

## 3. Hướng dẫn chạy nhanh

### Yêu cầu hệ thống
*   Docker & Docker Compose
*   Python 3.10+ (để chạy seed dữ liệu)

### Các bước khởi tạo
1.  **Khởi động CSDL:**
    ```bash
    docker compose up -d db
    ```
2.  **Khởi động Backend & Frontend:**
    ```bash
    docker compose up -d
    ```
3.  **Khởi tạo dữ liệu mẫu (Seed):**
    ```bash
    python scripts/seed_data.py --profile demo
    ```
4.  **Truy cập ứng dụng:**
    *   Dashboard: `http://localhost:5173`
    *   API Docs: `http://localhost:8000/docs`

---
**Nhóm thực hiện:** [minhmoidz]
**Môn học:** Quản trị Cơ sở dữ liệu nâng cao
**Đề tài:** GitMini — Hệ thống quản trị mã nguồn tập trung PostgreSQL.
