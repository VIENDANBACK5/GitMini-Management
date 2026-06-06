# GitMini diagrams

Thư mục này chứa các sơ đồ `.drawio` có thể mở trực tiếp bằng diagrams.net/draw.io.

## Danh sách sơ đồ

| File | Nội dung |
|---|---|
| `gitmini_erd.drawio` | ERD tổng quan tất cả bảng dữ liệu PostgreSQL của GitMini |
| `gitmini_physical_schema_detailed.drawio` | Lược đồ quan hệ vật lý chi tiết: cột, kiểu dữ liệu, PK/FK/UNIQUE/CHECK, index và chiến lược phân vùng |
| `gitmini_csdl_architecture.drawio` | Kiến trúc quản trị CSDL: frontend/backend chỉ là minh chứng, trọng tâm là PostgreSQL |
| `gitmini_team_db_responsibility.drawio` | Phân công 4 thành viên theo 4 nhánh quản trị CSDL |
| `gitmini_db_lifecycle.drawio` | Vòng đời quản trị dữ liệu: phân tích, migration, seed, query, benchmark, backup/restore |

## Cách mở

1. Mở https://app.diagrams.net hoặc ứng dụng draw.io desktop.
2. Chọn `File` → `Open From` → `Device`.
3. Chọn file `.drawio` trong thư mục này.
4. Có thể chỉnh sửa, export PNG/SVG/PDF để đưa vào báo cáo hoặc slide.
