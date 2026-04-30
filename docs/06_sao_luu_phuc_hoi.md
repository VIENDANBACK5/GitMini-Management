# GitMini — Kịch bản sao lưu và phục hồi dữ liệu

## 1. Tầm quan trọng của sao lưu (Backup)

Đối với một hệ thống lưu trữ mã nguồn như GitMini, dữ liệu là tài sản quan trọng nhất. Project này triển khai hai chiến lược sao lưu song song để đảm bảo an toàn dữ liệu tuyệt đối:
1.  **Sao lưu Logic (Logical Backup)**: Dùng để di chuyển dữ liệu hoặc phục hồi các bảng cụ thể.
2.  **Sao lưu Vật lý và Phục hồi theo thời gian (Physical Backup & PITR)**: Dùng để khôi phục hệ thống về bất kỳ thời điểm nào trong quá khứ khi gặp sự cố nghiêm trọng.

---

## 2. Chiến lược 1: Sao lưu Logic bằng `pg_dump`

Phương pháp này trích xuất cấu trúc và dữ liệu thành các câu lệnh SQL. Ưu điểm là linh hoạt, có thể khôi phục sang các phiên bản PostgreSQL khác nhau.

### 2.1. Thực hiện sao lưu
Lệnh sao lưu toàn bộ database `gitmini_db` ra file:
```bash
docker exec gitmini_db_container pg_dump -U gitmini_user -d gitmini_db -F c > backups/full/gitmini_2024.bak
```

### 2.2. Quy trình phục hồi
Để phục hồi, trước hết cần đảm bảo database đích đã được tạo rỗng:
```bash
# Tạo database mới nếu chưa có
createdb -U postgres gitmini_db

# Tiến hành phục hồi từ file backup
pg_restore -U postgres -d gitmini_db backups/full/gitmini_2024.bak
```

---

## 3. Chiến lược 2: Sao lưu Vật lý và PITR (Nâng cao)

Đây là kỹ thuật quản trị CSDL chuyên nghiệp, kết hợp giữa bản sao lưu vật lý (Base Backup) và các bản ghi nhật ký giao dịch (WAL).

### 3.1. Physical Base Backup
Sử dụng công cụ `pg_basebackup` để tạo một bản sao vật lý của toàn bộ thư mục dữ liệu (data directory):
```bash
pg_basebackup -U replicator -h localhost -p 5435 -D /backups/base_backup -Fp -Xs -P
```

### 3.2. Point-in-Time Recovery (PITR)
Khi có sự cố (ví dụ: lỡ tay xóa một repository quan trọng vào lúc 10:05 AM), chúng mình có thể khôi phục CSDL về đúng thời điểm 10:04 AM bằng cách:
1.  Dừng PostgreSQL.
2.  Khôi phục bản **Base Backup** gần nhất.
3.  Cấu hình `recovery.signal` và thiết lập `recovery_target_time` trong `postgresql.conf`.
4.  Khởi động lại PostgreSQL để nó tự động "re-play" các file WAL đến đúng thời điểm mong muốn.

---

## 4. Kiểm tra và bảo trì định kỳ

Một bản backup chỉ có giá trị khi nó có thể phục hồi được. Quy trình bảo trì của GitMini bao gồm:

*   **VACUUM ANALYZE**: Thực hiện định kỳ để dọn dẹp các bản ghi rác (dead tuples) và cập nhật số liệu thống kê cho bộ tối ưu hóa truy vấn (Optimizer).
    ```sql
    VACUUM ANALYZE repositories;
    ```
*   **Test Restore định kỳ**: Mỗi tháng một lần, tiến hành khôi phục thử nghiệm các file backup lên một server tạm thời để đảm bảo file không bị lỗi.
*   **Streaming Replication**: Thiết lập mô hình Master-Slave để có một bản sao CSDL chạy song song, sẵn sàng thay thế (Failover) nếu Server chính gặp sự cố phần cứng.

---

## 5. Minh chứng thực thi chạy Backup

Để chứng minh quy trình sao lưu được thiết lập và hoạt động thành công, dưới đây là các hình ảnh chạy lệnh tạo bản sao lưu trực tiếp trên máy chủ:

### 5.1. Chạy Logical Backup (pg_dump) thành công
*(Chèn ảnh Terminal chạy lệnh pg_dump ra file .bak vào đây)*
`![Minh chứng Logical Backup](../screenshots/06_backup_logical.png)`

### 5.2. Chạy Physical Backup (pg_basebackup) thành công
*(Chèn ảnh Terminal chạy lệnh pg_basebackup tạo các file hệ thống WAL vào đây)*
`![Minh chứng Physical Backup](../screenshots/06_backup_physical.png)`

---

## 6. Kết luận

Với sự kết hợp giữa `pg_dump` (linh hoạt) và `pg_basebackup + WAL` (an toàn tuyệt đối), hệ thống GitMini đảm bảo dữ liệu luôn có phương án dự phòng. Việc hiểu rõ sự khác biệt giữa sao lưu Logic và vật lý là kỹ năng cốt lõi của một quản trị viên CSDL chuyên nghiệp.
