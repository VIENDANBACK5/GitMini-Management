#!/bin/bash

# GITMINI AUTOMATED BACKUP SCRIPT
# Hướng dẫn: Chạy script này hàng ngày qua Cronjob

# 1. Tải cấu hình từ file .env
ENV_FILE="/home/chung/lab/CSDL/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "Lỗi: Không tìm thấy file .env tại $ENV_FILE"
    exit 1
fi

# 2. Cấu hình thư mục sao lưu
BACKUP_DIR="/home/chung/lab/CSDL/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# 3. Thực hiện sao lưu sử dụng pg_dump
# Lưu ý: Script này giả định bạn đã cấu hình file .pgpass hoặc PGPASSWORD
echo "--- Bắt đầu sao lưu database: $DB_NAME ---"
export PGPASSWORD=$DB_PASS

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -F c "$DB_NAME" > "$BACKUP_DIR/gitmini_$DATE.dump"

if [ $? -eq 0 ]; then
    echo "Sao lưu thành công: $BACKUP_DIR/gitmini_$DATE.dump"
    
    # 4. Lưu giữ (Retention): Xóa các bản cũ hơn 7 ngày
    echo "Đang dọn dẹp các bản sao lưu cũ..."
    find "$BACKUP_DIR" -type f -mtime +7 -name "*.dump" -delete
    echo "Hoàn tất."
else
    echo "Lỗi: Sao lưu thất bại!"
    exit 1
fi
