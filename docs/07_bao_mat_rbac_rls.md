# GitMini — Tài liệu bảo mật CSDL (RBAC & RLS)

## 1. Mô hình bảo mật 3 lớp

Để bảo vệ mã nguồn của người dùng, GitMini áp dụng chiến lược bảo mật đa tầng dựa trên mô hình chuẩn CIA (Confidentiality, Integrity, Availability):
1.  **Quản trị truy cập (RBAC)**: Phân quyền dựa trên vai trò của nhân sự.
2.  **Bảo mật mức dòng (RLS)**: Ngăn chặn truy cập trái phép vào dữ liệu private ngay tại tầng Database.
3.  **Giám sát và Nhật ký (Audit Logs)**: Ghi lại mọi hành động nhạy cảm để truy vết.

---

## 2. Quản trị vai trò (Role-Based Access Control - RBAC)

Chúng mình không dùng một tài khoản duy nhất cho tất cả mọi người. Thay vào đó, hệ thống phân chia thành 3 nhóm quyền chính:

*   **`git_admin`**: Có toàn quyền trên tất cả các bảng. Dùng cho các tác vụ quản trị hệ thống.
*   **`git_developer`**: Quyền làm việc với mã nguồn.
    ```sql
    -- Ví dụ phân quyền cho Developer
    GRANT SELECT, INSERT ON TABLE commits TO git_developer;
    GRANT SELECT, INSERT ON TABLE commit_parents TO git_developer;
    GRANT SELECT, INSERT, UPDATE ON TABLE issues TO git_developer;
    ```
*   **`git_reviewer`**: Kế thừa quyền của Developer nhưng có thêm quyền phê duyệt Pull Request.

*Lưu ý kỹ thuật: Do hệ thống sử dụng UUID làm khóa chính, chúng mình không cần quản lý các Sequence (chuỗi tự tăng) như các hệ thống dùng SERIAL thông thường.*

---

## 3. Bảo mật mức dòng (Row-Level Security - RLS)

Đây là tính năng cực kỳ mạnh mẽ của PostgreSQL giúp thực thi chính sách bảo mật một cách tự động.

### 3.1. Cơ chế xác thực trong phiên làm việc
Trước khi thực hiện bất kỳ truy vấn nào, ứng dụng (Backend) sẽ thiết lập thông tin người dùng hiện tại vào phiên làm việc của PostgreSQL:
```sql
SET app.current_user_id = '550e8400-e29b-41d4-a716-446655440000';
SET app.current_username = 'minhmoidz';
```

### 3.2. Chính sách bảo mật (Policy)
Dựa vào biến `app.current_user_id` đã thiết lập, Database sẽ tự động lọc dữ liệu. Ví dụ, chính sách cho bảng `repositories`:
```sql
CREATE POLICY repo_access_policy ON repositories
FOR SELECT
USING (
    is_private = FALSE 
    OR owner_id = (current_setting('app.current_user_id')::UUID)
    OR EXISTS (SELECT 1 FROM repo_members WHERE repo_id = repositories.id AND user_id = (current_setting('app.current_user_id')::UUID))
);
```
**Ý nghĩa**: Một người dùng chỉ được xem repository nếu: (1) Nó là công khai, (2) Họ là chủ sở hữu, hoặc (3) Họ là thành viên của dự án đó.

---

## 4. Nhật ký hành động (Audit Logging)

Mọi thao tác quan trọng như xóa repository, thay đổi quyền thành viên đều được ghi vào bảng `audit_logs`.
*   **Thông tin lưu trữ**: Ai làm, làm lúc nào, trên repository nào và dữ liệu cũ/mới là gì (lưu dạng JSONB).
*   **Mục đích**: Phục vụ việc điều tra khi có sự cố mất mát mã nguồn hoặc thay đổi trái phép.

---

## 5. Bảo mật hạ tầng

*   **Mã hóa đường truyền**: Sử dụng SSL/TLS để mã hóa dữ liệu giữa Backend và Database.
*   **Cô lập cổng kết nối**: Trong môi trường Docker, PostgreSQL chạy nội bộ ở cổng `5432`. Cổng này chỉ được map ra cổng `5435` của máy chủ để các quản trị viên truy cập từ xa thông qua Firewall bảo mật.
*   **Mã hóa dữ liệu (Encryption at Rest)**: Khuyến nghị sử dụng các giải pháp mã hóa ổ đĩa cho thư mục chứa dữ liệu của Docker.

---

## 6. Kết luận

Bằng việc kết hợp chặt chẽ giữa RBAC và RLS, GitMini tạo ra một "pháo đài" bảo mật dữ liệu vững chắc. Ngay cả khi code ứng dụng có lỗ hổng, tầng Database vẫn sẽ ngăn chặn việc rò rỉ dữ liệu của các repository private nhờ vào các chính sách RLS đã được thiết lập chặt chẽ.
