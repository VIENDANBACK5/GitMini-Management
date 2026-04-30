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

## 3. Migration Up (Xây dựng cấu trúc 20 bảng CSDL)

Hệ thống được thiết kế theo kiến trúc module, chia làm 2 giai đoạn khởi tạo chính để đảm bảo tính logic và toàn vẹn dữ liệu:

### 3.1. Giai đoạn 1: Khởi tạo 11 bảng thực thể lõi (`sql/01_schema.sql`)
Đây là những thực thể quan trọng nhất, tạo nên khung xương của một hệ thống quản lý mã nguồn:

1.  **`users`**: Quản lý định danh. Lưu trữ thông tin tài khoản, mật khẩu (đã băm) và hồ sơ cá nhân. Đây là thực thể gốc để xác định quyền sở hữu và tác giả của mọi hành động trong hệ thống.
2.  **`repositories`**: Thực thể trung tâm. Quản lý các dự án mã nguồn, thiết lập chế độ riêng tư (private/public) và định danh chủ sở hữu (owner).
3.  **`repo_members`**: Quản lý phân quyền chi tiết. Cho phép mời nhiều người dùng vào một dự án với các vai trò khác nhau (Developer, Reviewer, Viewer), phục vụ luồng làm việc nhóm.
4.  **`commits`**: Lưu trữ lịch sử mã nguồn. Mỗi bản ghi đại diện cho một "snapshot" trạng thái code tại một thời điểm, sử dụng mã băm SHA-1 (40 ký tự) làm khóa chính để đảm bảo tính duy nhất toàn cầu.
5.  **`commit_parents`**: Mô hình hóa đồ thị DAG. Lưu quan hệ cha-con giữa các commit. Việc tách bảng này cho phép một commit có thể có nhiều cha (Merge Commit), giúp PostgreSQL truy vấn được toàn bộ lịch sử đệ quy bằng `WITH RECURSIVE`.
6.  **`branches`**: Quản lý các nhánh phát triển. Bản chất là các con trỏ (pointer) trỏ đến commit mới nhất của từng nhánh, giúp người dùng làm việc song song trên nhiều tính năng mà không ảnh hưởng lẫn nhau.
7.  **`issues`**: Theo dõi lỗi và yêu cầu. Hỗ trợ quy trình quản lý công việc, cho phép gắn nhãn (label) và giao việc cho các thành viên cụ thể.
8.  **`pull_requests`**: Quản lý luồng hợp nhất code. Đây là nơi đề xuất thay đổi từ nhánh này sang nhánh khác, liên kết chặt chẽ với quy trình xét duyệt code.
9.  **`pull_request_reviews`**: Kiểm soát chất lượng mã nguồn. Lưu trữ các phê duyệt (Approval) của Reviewer, là điều kiện bắt buộc trước khi một PR được phép merge vào các nhánh quan trọng.
10. **`audit_logs`**: Nhật ký bảo mật. Ghi lại mọi hành động nhạy cảm như xóa repo, đổi quyền... phục vụ mục đích kiểm toán và truy vết sự cố.
11. **`repo_stats`**: Tối ưu hóa hiệu năng Dashboard. Bảng này lưu trữ các số liệu tính toán sẵn (commit count, issue count) thông qua Trigger để Dashboard có thể hiển thị kết quả ngay lập tức mà không cần quét lại hàng triệu bản ghi.

### 3.2. Giai đoạn 2: Mở rộng 9 bảng quản trị và vận hành (`sql/09_extend_to_20_tables.sql`)
Nhóm bảng này hoàn thiện các tính năng chuyên sâu của một nền tảng Git hiện đại:

12. **`file_blobs`**: Quản lý nội dung vật lý. Lưu trữ metadata và kích thước của các file mã nguồn. Sử dụng cơ chế hash nội dung để tránh lưu trùng lặp cùng một file nhiều lần.
13. **`commit_files`**: Theo dõi thay đổi file. Ghi nhận chi tiết file nào được thêm mới, sửa đổi hoặc xóa bỏ trong từng commit cụ thể.
14. **`repository_languages`**: Phân tích kỹ thuật. Thống kê tỷ lệ các ngôn ngữ lập trình trong dự án (ví dụ: 80% Python, 20% SQL), giúp người quản trị nắm bắt nhanh cấu trúc công nghệ.
15. **`tags`**: Đánh dấu phiên bản. Lưu trữ các cột mốc quan trọng (ví dụ: v1.0, v2.0-release). Khác với branch, tag là các con trỏ cố định không thay đổi theo thời gian.
16. **`releases`**: Quản lý phát hành sản phẩm. Gắn liền với Tag để cung cấp thông tin ghi chú phiên bản (release notes) và các file cài đặt cho người dùng cuối.
17. **`issue_comments`**: Tương tác cộng tác. Cho phép các thành viên thảo luận, trao đổi ý kiến trực tiếp trên từng Issue.
18. **`pull_request_comments`**: Đánh giá mã nguồn chi tiết. Hỗ trợ việc bình luận trực tiếp trên từng dòng code thay đổi trong Pull Request.
19. **`ci_runs`**: Quản trị quy trình kiểm thử tự động. Ghi lại kết quả (Success/Failed) của các bản build CI/CD, giúp đảm bảo mã nguồn luôn ổn định trước khi merge.
20. **`backup_jobs`**: Quản trị vận hành CSDL. Nhật ký ghi lại các phiên sao lưu và phục hồi dữ liệu thành công, đảm bảo hệ thống có khả năng phục hồi khi gặp sự cố.

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
