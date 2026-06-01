# Kỹ thuật Phục hồi dữ liệu theo thời gian (Point-In-Time Recovery - PITR)

## 1. Giới thiệu tổng quan
PITR là kỹ thuật khôi phục cơ sở dữ liệu về một thời điểm cụ thể trong quá khứ. Trong dự án GitMini, chúng tôi không chỉ dừng lại ở việc backup định kỳ (Logical Backup) mà đã triển khai hệ thống **Sao lưu Vật lý kết hợp Lưu trữ Nhật ký (Archiving)** để đạt được khả năng khôi phục đến từng giây.

## 2. Cấu hình Hạ tầng PITR (Thực tế)
Để PITR hoạt động, file `docker-compose.yml` đã được thiết lập với các tham số khắt khe:

```yaml
command: >
  postgres
    -c wal_level=replica           # Cung cấp đủ thông tin cho khôi phục
    -c archive_mode=on            # Bật chế độ lưu trữ nhật ký
    -c archive_command='test ! -f /archive/%f && cp %p /archive/%f' # Lệnh lưu trữ thực thụ
```
> [!IMPORTANT]
> Nếu thiếu `archive_command`, hệ thống sẽ không thể lưu lại lịch sử các giao dịch, dẫn đến việc PITR thất bại. Chúng tôi đã cấu hình lệnh này để copy mọi thay đổi vào một vùng nhớ an toàn.

## 3. Minh chứng Kỹ thuật (Proof of Implementation)

### 3.1. Tạo Base Backup (Nền tảng)
Sử dụng `pg_basebackup` để tạo bản sao vật lý của toàn bộ database. Đây là điểm mốc (checkpoint) để bắt đầu quá trình khôi phục.

**Kết quả chạy thực tế:**
![Minh chứng pg_basebackup](../screenshots/pitr_physical_backup.png)
*Ghi chú: Terminal cho thấy việc tạo file `backup_label` và copy 100% dữ liệu vật lý.*

### 3.2. Lưu trữ WAL thực tế (WAL Archiving)
Đây là bằng chứng quan trọng nhất. Khi có dữ liệu mới phát sinh, hệ thống tự động đẩy vào thư mục `/archive`.

**Kiểm chứng qua Terminal:**
```bash
# Lệnh ép hệ thống chuyển file nhật ký
SELECT pg_switch_wal();

# Kiểm tra thư mục lưu trữ thực tế
ls -lh /var/lib/postgresql/data/archive/
-rw------- 1 postgres postgres 16.0M May 16 04:20 00000001000000000000000E
```
*Ghi chú: File có kích thước đúng 16MB xuất hiện trong thư mục archive minh chứng cho việc nhật ký giao dịch đang được lưu trữ liên tục.*

## 4. Quy trình Phục hồi (Recovery Workflow)
Khi xảy ra sự cố (ví dụ: lỡ tay xóa một repo vào lúc 10:00:00), quy trình khôi phục sẽ là:
1.  Dừng dịch vụ Database.
2.  Xóa dữ liệu hiện tại, giải nén bản **Base Backup** (từ mục 3.1).
3.  Postgres sẽ đọc thư mục **Archive** (từ mục 3.2) và "diễn lại" (replay) các giao dịch cho đến thời điểm `09:59:59`.
4.  Hệ thống trở lại trạng thái hoàn hảo như chưa có lỗi xảy ra.

## 5. Kết luận
Với việc cấu hình đầy đủ `archive_command` và thực hiện `pg_basebackup`, hệ thống GitMini đã đạt được cấp độ an toàn dữ liệu cao nhất, sẵn sàng đáp ứng các yêu cầu khắt khe trong môi trường production.
