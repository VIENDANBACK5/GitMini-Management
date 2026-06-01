# GitMini — Tài liệu tối ưu CSDL (Chỉ mục Index)

## 1. Mục đích tài liệu

Trong project GitMini, khi số lượng dữ liệu (commit, issue) lên tới hàng trăm nghìn bản ghi, việc truy vấn theo cách thông thường sẽ trở nên rất chậm. Tài liệu này mô tả chiến lược thiết kế các chỉ mục (Index) nhằm tăng tốc độ truy xuất dữ liệu, giúp các thao tác trên Dashboard và tìm kiếm diễn ra gần như tức thì.

## 2. Nguyên tắc thiết kế Index

Chúng mình phân chia hệ thống chỉ mục thành 4 nhóm chính dựa trên nghiệp vụ của hệ thống quản lý mã nguồn:

1.  **Index cho khóa ngoại (Foreign Key)**: Tăng tốc các phép `JOIN` bảng (vd: lấy danh sách commit của một repo).
2.  **Chỉ mục phức hợp (Composite Index)**: Tối ưu các truy vấn có nhiều điều kiện lọc và sắp xếp (vd: lấy 20 commit mới nhất).
3.  **Chỉ mục tìm kiếm (GIN Full-text Index)**: Hỗ trợ tìm kiếm từ khóa trong tiêu đề issue hoặc nội dung commit message.
4.  **Index cho các tính năng mở rộng**: Tối ưu các bảng quản trị mới thêm vào trong schema 20 bảng.

---

## 3. Các nhóm chỉ mục quan trọng

### 3.1. Nhóm tối ưu luồng chính (Core Flow)

*   **`idx_commits_repo_time` (Composite Index)**:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_commits_repo_time ON commits(repo_id, created_at DESC);
    ```
    Đây là index quan trọng nhất để hiển thị lịch sử mã nguồn. Nó giúp PostgreSQL đọc trực tiếp dữ liệu theo thứ tự thời gian của từng Repo mà không cần quét toàn bộ bảng hay thực hiện sắp xếp (Sort) lại.

*   **`idx_issues_search` (GIN Index)**:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_issues_search ON issues USING GIN (to_tsvector('english', title || ' ' || body));
    ```
    Cho phép tìm kiếm issue cực nhanh bằng từ khóa, thay vì dùng `LIKE %keyword%` gây tốn tài nguyên.

### 3.2. Nhóm tối ưu quan hệ thành viên và quyền hạn

Trong môi trường nhiều người dùng, việc kiểm tra quyền thành viên diễn ra liên tục, do đó cần các index sau:
```sql
CREATE INDEX IF NOT EXISTS idx_repo_members_user ON repo_members(user_id);
CREATE INDEX IF NOT EXISTS idx_repo_members_repo ON repo_members(repo_id);
```
Mục đích: Tăng tốc việc kiểm tra một user có quyền truy cập vào repository private hay không (phục vụ cho RLS).

### 3.3. Nhóm tối ưu cho Schema mở rộng (20 bảng)

Để đảm bảo các tính năng mới như quản lý file, bình luận và CI/CD không làm chậm hệ thống, chúng mình bổ sung các index:

*   **Quản lý file vật lý:**
    ```sql
    CREATE INDEX IF NOT EXISTS idx_commit_files_blob ON commit_files(blob_id);
    ```
    Giúp tra cứu nhanh nội dung file tương ứng với từng thay đổi trong commit.

*   **Tương tác nhóm (Comments):**
    ```sql
    CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON issue_comments(issue_id);
    CREATE INDEX IF NOT EXISTS idx_pr_comments_pr ON pull_request_comments(pull_request_id);
    ```
    Tối ưu việc tải luồng thảo luận trong Issue và Pull Request.

*   **Kiểm thử tự động (CI/CD):**
    ```sql
    CREATE INDEX IF NOT EXISTS idx_ci_runs_repo_status ON ci_runs(repo_id, status);
    ```
    Giúp dashboard CI hiển thị nhanh các bản build đang chạy hoặc đã thất bại của từng dự án.

---

## 4. Minh chứng triển khai thực tế

Dưới đây là hình ảnh chụp màn hình truy vấn liệt kê danh sách các Index đã được tạo thành công trong cơ sở dữ liệu `gitmini_db`, minh chứng cho việc hệ thống đã áp dụng đầy đủ các thiết kế tối ưu trên:

*(Chèn ảnh kết quả câu lệnh SELECT từ pg_indexes vào đây)*
![Danh sách Index trong CSDL](../screenshots/04_index_list.png)

---

## 5. Kết luận

Việc đánh Index không nên thực hiện bừa bãi vì sẽ làm chậm thao tác ghi dữ liệu (INSERT/UPDATE). Trong project này, chúng mình đã cân nhắc kỹ để chỉ đánh index trên các "điểm nóng" truy vấn (hot-path). Các minh chứng hiệu năng thực tế thông qua việc đo đạc `Execution Time` sẽ được trình bày chi tiết trong tài liệu EXPLAIN ANALYZE.
