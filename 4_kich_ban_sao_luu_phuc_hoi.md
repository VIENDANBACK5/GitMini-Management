# KỊCH BẢN SAO LƯU VÀ PHỤC HỒI DỮ LIỆU (AVAILABILITY)

Tài liệu này trình bày các kịch bản thực tế để đảm bảo **Tính sẵn sàng (Availability)** của hệ thống GitMini, giúp khôi phục dữ liệu trong các tình huống thảm họa hoặc sai sót của con người.

---

## 1. Chiến lược sao lưu (Backup Strategy)
Hệ thống sử dụng chiến lược sao lưu kết hợp giữa **Full Backup** và **Incremental Backup**.

### a. Full Backup (Sao lưu toàn bộ)
*   **Công cụ:** `pg_dump`
*   **Tần suất:** Hàng ngày (vào lúc 01:00 AM khi ít người dùng).
*   **Mục tiêu:** Tạo bản chụp hoàn chỉnh của Database tại một thời điểm.
*   **Lệnh thực hiện:**
    ```bash
    pg_dump -U postgres -h localhost -F c gitmini_db > /backups/full/gitmini_$(date +%Y%m%d).bak
    ```

### b. Incremental Backup (Sao lưu gia tăng)
*   **Công cụ:** **Write-Ahead Logging (WAL)** Archiving.
*   **Tần suất:** Liên tục (Real-time).
*   **Mục tiêu:** Lưu lại mọi thay đổi (INSERT/UPDATE/DELETE) ngay khi chúng xảy ra.
*   **Cấu hình trên `postgresql.conf`:**
    ```conf
    wal_level = replica
    archive_mode = on
    archive_command = 'test ! -f /backups/wal/%f && cp %p /backups/wal/%f'
    ```

---

## 2. Kịch bản phục hồi (Recovery Scenarios)

### Kịch bản 1: Phục hồi sau thảm họa (Full Restore)
*   **Tình huống:** Server bị hỏng ổ cứng, cần dựng lại DB trên server mới.
*   **Các bước thực hiện:**
    1. Cài đặt PostgreSQL mới.
    2. Sử dụng bản Full Backup gần nhất:
       ```bash
       pg_restore -U postgres -d gitmini_db /backups/full/gitmini_20240422.bak
       ```

### Kịch bản 2: Phục hồi theo thời điểm (Point-in-Time Recovery - PITR)
*   **Tình huống:** Một Admin vô tình chạy lệnh `DROP TABLE commits` vào lúc 10:15 AM. Cần khôi phục dữ liệu về thời điểm **10:14:59 AM**.
*   **Đặc điểm:** Đây là tính năng cao cấp của PostgreSQL giúp giảm thiểu mất mát dữ liệu tối đa.
*   **Các bước thực hiện:**
    1. Dừng Database Server.
    2. Khôi phục bản **Base Backup** (Full backup) gần nhất.
    3. Tạo file `recovery.signal` trong thư mục dữ liệu.
    4. Cấu hình thời điểm dừng trong `postgresql.conf`:
       ```conf
       recovery_target_time = '2024-04-22 10:14:59'
       ```
    5. Khởi động lại Server. PostgreSQL sẽ tự động "phát lại" (replay) các file WAL cho đến đúng giây yêu cầu.

---

## 3. Lịch trình quản trị (Maintenance Schedule)
| Công việc | Tần suất | Mô tả |
| :--- | :--- | :--- |
| **Check Integrity** | Hàng tuần | Chạy `VACUUM ANALYZE` để tối ưu chỉ mục và dọn dẹp dữ liệu rác. |
| **Test Restore** | Hàng tháng | Thử nghiệm khôi phục bản backup lên server test để đảm bảo bản backup không bị lỗi. |
| **Retention Policy** | 30 ngày | Xóa các bản Full Backup cũ hơn 30 ngày để tiết kiệm bộ nhớ. |

---

## 4. Script mẫu cho Quản trị viên (Automation)
Dưới đây là script bash đơn giản (`backup.sh`) để tự động hóa việc sao lưu:

```bash
#!/bin/bash
BACKUP_DIR="/home/chung/lab/CSDL/backups"
DB_NAME="gitmini_db"
DATE=$(date +%Y%m%d_%H%M%S)

# Tạo thư mục nếu chưa có
mkdir -p $BACKUP_DIR

# Thực hiện Dump
echo "Starting backup for $DB_NAME..."
pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/gitmini_$DATE.sql.gz

# Xóa bản backup cũ hơn 7 ngày
find $BACKUP_DIR -type f -mtime +7 -name "*.sql.gz" -delete

echo "Backup completed: $BACKUP_DIR/gitmini_$DATE.sql.gz"
```

---

## 5. Kết nối dự phòng (Streaming Replication)
Để trả lời câu hỏi "làm thêm 1 db backup ntn nếu bên cũ hỏng", PostgreSQL cung cấp cơ chế **Streaming Replication (Master-Slave)**.

### a. Mô hình hoạt động
*   **Primary (Master):** Server chính xử lý cả đọc và ghi (Push code, Merge PR, Create Issue).
*   **Standby (Slave):** Server phụ (Backup DB), liên tục nhận dữ liệu thay đổi từ Master qua đường truyền mạng. 
    *   *Ưu điểm:* Slave luôn có dữ liệu mới nhất (gần như tức thời). Slave có thể hỗ trợ chia tải các truy vấn ĐỌC (Xem lịch sử commit, Xem dashboard).

### b. Kịch bản Failover (Chuyển vùng khi sự cố)
Nếu Server Master bị hỏng hoàn toàn:
1.  **Phát hiện sự cố:** Hệ thống giám sát báo Master không phản hồi.
2.  **Promote Standby:** Admin thực hiện lệnh "thăng cấp" Slave trở thành Master mới:
    ```bash
    pg_ctl promote -D /var/lib/postgresql/data
    ```
3.  **Chuyển hướng App:** Cập nhật Connection String của ứng dụng để trỏ sang địa chỉ IP của Server Slave (nay đã là Master).
4.  **Dựng lại Master cũ:** Sau khi sửa xong server cũ, nó sẽ được dựng lại thành Slave mới để tiếp tục nhận dữ liệu từ Master hiện tại.

---
> [!IMPORTANT]
> **Điểm khác biệt:** Backup (pg_dump) là bản chụp dữ liệu trong quá khứ, còn Replication (Slave DB) là bản sao dữ liệu tại thời điểm hiện tại. Một hệ thống chuyên nghiệp cần **CẢ HAI** để đảm bảo an toàn tuyệt đối.

---
> [!TIP]
> Để đạt điểm tối đa trong môn Quản trị CSDL nâng cao, bạn nên trình bày thêm về **Replication** (Master-Slave) trong phần Availability này để chứng minh hệ thống có khả năng chịu lỗi (Fault Tolerance) cao.
