Tài liệu này chi tiết hóa các giải pháp bảo mật nhằm bảo vệ dữ liệu mã nguồn, thông tin người dùng và lịch sử commit trong hệ thống GitMini. Các kỹ thuật này được thiết kế tối ưu cho nền tảng PostgreSQL 15+ dựa trên mô hình hội tụ CIA.

---

## 0. Mô hình bảo mật CIA (Triad)
GitMini áp dụng mô hình bảo mật chuẩn quốc tế CIA để đảm bảo an toàn thông tin toàn diện:

1.  **Confidentiality (Tính bảo mật):** Đảm bảo mã nguồn trong các repository riêng tư chỉ có người sở hữu và người được cấp quyền mới có thể xem. 
    *   *Giải pháp:* Sử dụng SSL/TLS, RBAC và Row-Level Security (RLS).
2.  **Integrity (Tính toàn vẹn):** Đảm bảo lịch sử commit và mã nguồn không bị thay đổi bất hợp pháp hoặc bị xóa mất dấu vết. 
    *   *Giải pháp:* Cơ chế Commit Immutability, SHA-1 Hashing và Database Transactions (ACID).
3.  **Availability (Tính sẵn sàng):** Đảm bảo hệ thống luôn hoạt động và dữ liệu có thể khôi phục ngay lập tức khi xảy ra sự cố phần cứng hoặc thảm họa. 
    *   *Giải pháp:* Chiến lược Backup/Recovery, WAL Archiving và Master-Slave Replication.

---

## 1. Bảo mật đường truyền (Security In Transit)
Để ngăn chặn các cuộc tấn công nghe lén (Eavesdropping) và Man-in-the-Middle (MitM), toàn bộ kết nối giữa Ứng dụng và CSDL phải được mã hóa.

*   **SSL/TLS:** Cấu hình PostgreSQL để chỉ chấp nhận các kết nối được mã hóa.
    *   *Cấu hình trên Server (`postgresql.conf`):*
        ```conf
        ssl = on
        ssl_cert_file = 'server.crt'
        ssl_key_file = 'server.key'
        ```
    *   *Ràng buộc kết nối (`pg_hba.conf`):*
        ```conf
        # Chỉ cho phép kết nối qua SSL từ mạng nội bộ
        hostssl all all 10.0.0.0/8 scram-sha-256
        ```
*   **Tham số phía Client:** Trong chuỗi kết nối (Connection String), sử dụng tham số `sslmode`.
    ```text
    postgresql://user:password@host:5432/gitmini?sslmode=verify-full
    ```

## 2. Kiểm soát truy cập dựa trên vai trò (RBAC)
Thay vì sử dụng tài khoản siêu quản trị (superuser), GitMini sử dụng mô hình đặc quyền tối thiểu (Principle of Least Privilege).

*   **Tách biệt Login:** Tuyệt đối không dùng user `postgres` cho ứng dụng.
*   **Phân quyền chi tiết trên Object:**
    | Vai trò | Đối tượng | Quyền hạn (Privileges) |
    | :--- | :--- | :--- |
    | **Developer** | `commits`, `issues`, `branches` | `SELECT`, `INSERT` (Không được `UPDATE/DELETE` lịch sử commit) |
    | **Reviewer** | `pull_requests`, `branches` | `SELECT`, `UPDATE` (để phê duyệt và merge) |
    | **Admin** | Toàn bộ các bảng | `ALL PRIVILEGES` |

*   **Ví dụ mã SQL triển khai:**
    ```sql
    CREATE ROLE git_developer;
    GRANT SELECT, INSERT ON TABLE commits TO git_developer;
    GRANT USAGE ON SEQUENCE commits_id_seq TO git_developer;
    ```

## 3. Bảo mật hàng dữ liệu (Row-Level Security - RLS)
Đây là "Vũ khí bí mật" của PostgreSQL giúp triển khai mô hình Multi-tenant (Nhiều người dùng chung một bảng).

*   **Mục tiêu:** Đảm bảo User A không bao giờ nhìn thấy hoặc can thiệp vào mã nguồn của User B trong các repository riêng tư (private).
*   **Triển khai:**
    ```sql
    ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

    CREATE POLICY repo_access_policy ON repositories
    FOR SELECT
    USING (
        is_private = FALSE 
        OR owner_id = (SELECT id FROM users WHERE username = current_user)
    );
    ```

## 4. Bảo mật dữ liệu tĩnh (Security At Rest)
Bảo vệ file dữ liệu thô trên ổ đĩa phòng trường hợp máy chủ bị đánh cắp vật lý.

*   **Mã hóa ở tầng Hệ điều hành:** Sử dụng **LUKS (Linux Unified Key Setup)** để mã hóa toàn bộ phân vùng (partition) chứa thư mục dữ liệu của PostgreSQL.
*   **Mã hóa cột nhạy cảm (Encryption at Field-level):** Sử dụng extension `pgcrypto` để mã hóa các thông tin nhạy cảm (như API Token của người dùng) trước khi lưu vào DB.
    ```sql
    CREATE EXTENSION pgcrypto;
    INSERT INTO users (api_token) VALUES (pgp_sym_encrypt('my_secret_token', 'encryption_key'));
    ```

## 5. Giám sát và Kiểm tra (Audit & Monitoring)
Ghi lại mọi hoạt động bất thường để phục vụ việc điều tra sự cố.

*   **pgaudit extension:** Cài đặt để ghi nhật ký chi tiết các câu lệnh SQL tác động đến dữ liệu nhạy cảm.
*   **Giám sát đăng nhập:** Theo dõi file log để phát hiện các cuộc tấn công Brute-force qua cổng 5432.
    ```conf
    log_connections = on
    log_disconnections = on
    log_statement = 'mod' # Ghi lại mọi câu lệnh INSERT, UPDATE, DELETE
    ```

## 6. Bảo mật Hạ tầng (Infrastructure Security)
*   **Cổng mặc định:** Sử dụng cổng **5432** (Không phải 1433 của SQL Server).
*   **Firewall:** Chỉ mở cổng 5432 cho IP cụ thể của Web Server.
*   **Private Network:** Đặt Database Server trong một Private Subnet không có Public IP để tránh mọi sự dòm ngó từ Internet.

---
> [!IMPORTANT]
> **Lưu ý quan trọng:** Chiến lược này tập trung vào tính toàn vẹn (Integrity) của mã nguồn. Trong hệ thống SCM, việc ngăn chặn chỉnh sửa lịch sử (Immutability) thông qua RBAC quan trọng hơn việc mã hóa toàn bộ dữ liệu.
