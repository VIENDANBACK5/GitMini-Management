# GitMini — Tài liệu khởi tạo CSDL, Migration và Seed

## 1. Mục đích tài liệu

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường cơ sở dữ liệu cho dự án GitMini. Nội dung bao gồm quy trình chạy các script Migration (Up/Down) để tạo cấu trúc bảng, thiết lập các ràng buộc, chỉ mục (index), trigger, phân quyền bảo mật và sinh dữ liệu mẫu (seed) để phục vụ việc demo và kiểm thử hiệu năng.

## 2. Danh sách các script vận hành

Hệ thống sử dụng các script SQL thuần để quản trị CSDL, đảm bảo tính minh bạch và dễ dàng kiểm soát trong PostgreSQL:

*   `sql/00_down.sql`: Rollback toàn bộ cấu trúc CSDL.
*   `sql/01_schema.sql`: Khởi tạo các extension và 11 bảng lõi của hệ thống.
*   `sql/02_indexes.sql`: Thiết lập hệ thống chỉ mục tối ưu truy vấn.
*   `sql/03_triggers.sql`: Cấu hình các trigger tự động cập nhật bảng thống kê.
*   `sql/04_security_roles.sql`: Thiết lập vai trò người dùng (RBAC).
*   `sql/05_security_rls.sql`: Kích hoạt bảo mật mức dòng (RLS).
*   `sql/08_phase4_pr_governance.sql`: Bổ sung cơ chế quản trị Pull Request.
*   `sql/09_extend_to_20_tables.sql`: Mở rộng schema lên 20 bảng hoàn thiện.
*   `scripts/seed_data.py`: Script Python để sinh dữ liệu mẫu (Seeding).

---

## 3. Migration Up (Khởi tạo CSDL)

Quá trình khởi tạo được thực hiện theo trình tự từ lõi đến các thành phần mở rộng:

### 3.1. `sql/01_schema.sql` — Khởi tạo 11 bảng lõi
Script này kích hoạt extension `uuid-ossp` để hỗ trợ kiểu dữ liệu UUID và tạo các bảng nền tảng bao gồm:
1.  `users`: Thông tin tài khoản người dùng.
2.  `repositories`: Kho mã nguồn.
3.  `repo_members`: Thành viên và vai trò trong repo.
4.  `commits`: Snapshot lịch sử (dùng `CHAR(40)` cho SHA-1 hash).
5.  `commit_parents`: Quan hệ cha-con (cấu trúc DAG).
6.  `branches`: Các con trỏ nhánh phát triển.
7.  `issues`: Quản lý lỗi và yêu cầu.
8.  `pull_requests`: Yêu cầu hợp nhất mã nguồn.
9.  `pull_request_reviews`: Phê duyệt PR.
10. `audit_logs`: Nhật ký hành động nhạy cảm.
11. `repo_stats`: Bảng thống kê (phi chuẩn hóa).

### 3.2. `sql/02_indexes.sql` — Tối ưu hóa truy vấn
Thiết lập các chỉ mục B-tree cho khóa ngoại, Composite index cho các luồng truy vấn lịch sử và GIN index cho tìm kiếm toàn văn bản (Full-text search).

### 3.3. `sql/03_triggers.sql` — Tự động hóa thống kê
Thiết lập các Trigger để đảm bảo tính nhất quán dữ liệu giữa các bảng nghiệp vụ và bảng `repo_stats`. Mọi thay đổi về commit, issue hay PR đều được cập nhật vào bảng thống kê ngay trong cùng một Transaction.

### 3.4. `sql/04_security_roles.sql` — Phân quyền RBAC
Tạo các Role (`git_admin`, `git_developer`, `git_reviewer`) và phân quyền truy cập bảng tương ứng với từng vai trò.

### 3.5. `sql/05_security_rls.sql` — Bảo mật RLS
Kích hoạt chính sách bảo mật mức dòng để ngăn chặn việc người dùng xem dữ liệu từ các repository `is_private` mà họ không có quyền thành viên.

### 3.6. `sql/08_phase4_pr_governance.sql` & `sql/09_extend_to_20_tables.sql` — Mở rộng 20 bảng
Sau khi có các bảng lõi, hệ thống được mở rộng để phục vụ các tính năng quản trị nâng cao và vận hành hệ thống, bao gồm 9 bảng bổ sung:
12. `file_blobs`: Lưu trữ nội dung file dạng Blob/Hash.
13. `commit_files`: Quản lý các file thay đổi trong từng commit.
14. `repository_languages`: Thống kê ngôn ngữ lập trình của dự án.
15. `tags`: Đánh dấu các phiên bản quan trọng.
16. `releases`: Quản lý các bản phát hành sản phẩm.
17. `issue_comments`: Luồng thảo luận trong các Issue.
18. `pull_request_comments`: Bình luận và Review code trong PR.
19. `ci_runs`: Nhật ký kiểm thử tự động (CI/CD).
20. `backup_jobs`: Nhật ký vận hành sao lưu và phục hồi dữ liệu.

Việc mở rộng này giúp hệ thống đạt quy mô 20 bảng CSDL theo đúng yêu cầu đồ án, bao quát toàn bộ quy trình từ lưu trữ, bảo mật đến vận hành.

---

## 4. Migration Down (Rollback)

Khi cần reset môi trường hoặc sửa lại thiết kế, script `sql/00_down.sql` sẽ được thực hiện thủ công. Script này sẽ thực hiện lệnh `DROP` theo thứ tự ngược lại để xóa sạch các policy, trigger, function, bảng và role, đưa Database về trạng thái rỗng hoàn toàn.

---

## 5. Seed dữ liệu mẫu (Seeding)

Dự án cung cấp script `scripts/seed_data.py` để sinh dữ liệu tự động thay vì nhập tay. Script hỗ trợ hai chế độ chính:
*   **Chế độ `demo`**: Sinh khoảng 1,000 commit và 300 issue. Phù hợp để chạy nhanh và trình diễn giao diện Web.
*   **Chế độ `benchmark`**: Sinh 100,000 commit và 10,000 issue. Dùng để đo đạc hiệu năng thực tế bằng `EXPLAIN ANALYZE`.

---

## 6. Hướng dẫn khởi tạo CSDL chi tiết

Để dự án chạy đúng, bạn thực hiện theo các bước sau trong Terminal:

1.  **Khởi động Docker:**
    ```bash
    docker compose up -d db
    ```
    *Lưu ý: PostgreSQL chạy bên trong container ở cổng `5432`. Tuy nhiên, để tránh trùng với PostgreSQL cài sẵn trên máy (nếu có), project đã map cổng này ra cổng `5435` ở máy host.*

2.  **Cài đặt thư viện Python:**
    ```bash
    pip install psycopg2-binary python-dotenv
    ```

3.  **Chạy script Seeding:**
    ```bash
    python scripts/seed_data.py --profile demo
    ```

---

## 7. Kết luận

Với hệ thống script đầy đủ từ khởi tạo đến seed dữ liệu lớn, project GitMini đảm bảo khả năng tái lập môi trường cực kỳ nhanh chóng. Việc sử dụng UUID làm khóa chính và Trigger để cập nhật thống kê giúp hệ thống vừa hiện đại, vừa đảm bảo tính nhất quán dữ liệu trong môi trường đa người dùng.
