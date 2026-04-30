# GitMini — Hướng dẫn chụp ảnh minh chứng (Dành cho báo cáo)

Tài liệu này cung cấp các lệnh chính xác (Terminal và SQL) để bạn tự chạy trên máy tính của mình, chụp ảnh màn hình và chèn vào các file tài liệu `04`, `05`, và `06` để làm minh chứng thực tế nộp cho giảng viên.

Hãy lưu các ảnh chụp màn hình vào thư mục `screenshots/` và đổi tên theo thứ tự (ví dụ: `01_docker_run.png`, `02_explain_commit.png`, v.v.).

---

## BƯỚC 1: Chuẩn bị môi trường & Dữ liệu lớn (Benchmark)

Bật terminal tại thư mục gốc của project, chạy các lệnh sau và **chụp màn hình**:

1.  **Chụp cảnh khởi động Docker thành công**:
    ```bash
    docker compose up -d db
    docker ps
    ```
2.  **Chụp cảnh chạy script tạo 100,000 dữ liệu mẫu**:
    ```bash
    python scripts/seed_data.py --profile benchmark
    ```
    *(Đợi script chạy xong sẽ hiện log thành công, hãy chụp lại đoạn log này)*

---

## BƯỚC 2: Chụp minh chứng cho file `04_toi_uu_csdl_index.md`

Thay vì cài đặt phần mềm bên ngoài, bạn có thể truy cập trực tiếp vào cơ sở dữ liệu ngay trong Terminal bằng lệnh:
```bash
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db
```
*(Bạn sẽ thấy dấu nhắc lệnh đổi thành `gitmini_db=#`)*

Tiếp theo, dán câu lệnh SQL sau vào và Enter để lấy danh sách Index, sau đó **chụp lại kết quả**:

```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

---

## BƯỚC 3: Chụp minh chứng cho file `05_minh_chung_toi_uu_explain.md`

Vẫn trong giao diện `gitmini_db=#` ở trên, bạn sẽ chạy 4 câu lệnh `EXPLAIN ANALYZE` và **chụp màn hình** kết quả trả về.

*Lưu ý: Để truy vấn chính xác, hệ thống cần một mã ID ngẫu nhiên. Hãy chạy lệnh này để lấy 1 mã Repo và 1 mã Commit:*
```sql
SELECT id AS ma_repo_cua_ban FROM repositories LIMIT 1;
SELECT commit_hash AS ma_commit_cua_ban FROM commit_parents LIMIT 1;
```
*(Copy 2 đoạn mã vừa hiện ra để thay thế vào chữ `<MÃ...>` ở các câu lệnh bên dưới nhé)*

**Minh chứng 1: Truy vấn Commit History cực nhanh nhờ Composite Index**
```sql
EXPLAIN ANALYZE
SELECT commit_hash, message, created_at
FROM commits
WHERE repo_id = '<MÃ_REPO_CỦA_BẠN>'
ORDER BY created_at DESC
LIMIT 10;
```

**Minh chứng 2: Tìm kiếm Issue bằng GIN Full-text Index**
```sql
EXPLAIN ANALYZE
SELECT id, title
FROM issues
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', 'login | error')
LIMIT 10;
```

**Minh chứng 3: Duyệt cây DAG bằng Recursive CTE**
*(Thay `<MÃ_COMMIT_CỦA_BẠN>` bằng một mã có trong bảng `commit_parents`)*
```sql
EXPLAIN ANALYZE
WITH RECURSIVE commit_history AS (
    SELECT commit_hash, parent_hash, 1 as depth
    FROM commit_parents
    WHERE commit_hash = '<MÃ_COMMIT_CỦA_BẠN>'
    UNION ALL
    SELECT cp.commit_hash, cp.parent_hash, ch.depth + 1
    FROM commit_parents cp
    JOIN commit_history ch ON cp.commit_hash = ch.parent_hash
)
SELECT * FROM commit_history LIMIT 50;
```

**Minh chứng 4: Dashboard đọc trực tiếp từ bảng thống kê (Repo Stats)**
```sql
EXPLAIN ANALYZE
SELECT commit_count, issue_open_count, pr_open_count 
FROM repo_stats 
WHERE repo_id = '<MÃ_REPO_CỦA_BẠN>';
```

---

## BƯỚC 4: Chụp minh chứng cho file `06_sao_luu_phuc_hoi.md`

Nếu bạn vẫn đang ở trong màn hình `gitmini_db=#`, hãy gõ lệnh `\q` và ấn Enter để thoát ra ngoài Terminal thường trước nhé.

Sau đó, chạy lần lượt các lệnh sau và **chụp lại toàn bộ Terminal**:

**Minh chứng 1: Chạy Logical Backup (pg_dump)**
```bash
docker exec -it gitmini_db_container bash -c "mkdir -p /tmp/backups && pg_dump -U gitmini_user -d gitmini_db -F c > /tmp/backups/gitmini_logical.bak && ls -lh /tmp/backups"
```
*(Chụp màn hình thấy file `.bak` đã được tạo thành công với dung lượng thực tế)*

**Minh chứng 2: Chạy Physical Base Backup (Phục vụ PITR)**
```bash
docker exec -it gitmini_db_container bash -c "pg_basebackup -U gitmini_user -D /tmp/base_backup -Fp -Xs -P && ls -l /tmp/base_backup"
```
*(Chụp màn hình thấy tiến trình backup chạy và xuất hiện các file cấu hình `backup_label`, `pg_wal`)*

---

## BƯỚC 5: Chèn ảnh vào tài liệu

Sau khi đã có đủ ảnh trong thư mục `screenshots/`, bạn chỉ cần mở các file `04`, `05`, `06` và thêm cú pháp chèn ảnh của Markdown vào dưới các tiêu đề tương ứng.

Ví dụ, muốn chèn ảnh vào file `05`:
```markdown
### 2.2. Sau khi tối ưu (Dùng Composite Index)

*(Kết quả minh chứng thực tế trên máy)*
![Minh chứng Commit History](../screenshots/explain_commit.png)
```

Bạn cứ tiến hành làm theo Checklist này nhé, mọi thông số thầy cần đều nằm hết ở đây rồi!
