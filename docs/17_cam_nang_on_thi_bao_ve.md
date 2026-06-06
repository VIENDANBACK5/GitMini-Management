# GitMini — Cẩm nang ôn thi bảo vệ đồ án (Dành cho nhóm)

Tài liệu này tổng hợp **toàn bộ lý thuyết cốt lõi** và **các câu lệnh SQL phức tạp nhất** trong dự án GitMini. Các thành viên hãy học kỹ tài liệu này, đây là những câu hỏi "tủ" mà các thầy cô thường dùng để test sinh viên xem có thực sự hiểu bài hay không.

---

## PHẦN 1: TỔNG HỢP LÝ THUYẾT (HỎI ĐÁP)

### 1. Tại sao dùng UUID thay vì SERIAL (ID tự tăng) cho các bảng?
*   **Trả lời**: SERIAL dễ bị đoán ID (biết ID=1 thì đoán được ID=2) gây mất bảo mật (lỗi Insecure Direct Object Reference). Việc đếm số lượng bản ghi cũng bị lộ. UUID (mã chuỗi ngẫu nhiên dài) giúp bảo mật tốt hơn, phù hợp với hệ thống phân tán (không sợ trùng ID khi ghép dữ liệu từ nhiều server).
*   **Điểm trừ cần biết**: UUID tốn dung lượng lưu trữ hơn (16 bytes so với 4 bytes của INT) và làm chậm tốc độ đánh Index (B-Tree).

### 2. Chuẩn 3 (3NF) là gì? Dự án này có tuân thủ 3NF không?
*   **Trả lời**: Chuẩn 3 (3NF) yêu cầu: (1) Các cột chỉ chứa giá trị đơn, (2) Có khóa chính, (3) Không có cột nào phụ thuộc bắc cầu vào khóa chính (mọi cột non-key đều phải phụ thuộc TRỰC TIẾP vào khóa chính).
*   Hệ thống cơ bản tuân thủ 3NF để tránh dư thừa dữ liệu. **TUY NHIÊN**, nhóm đã cố tình **PHI CHUẨN HÓA (Denormalization)** ở bảng `repo_stats` (lưu sẵn số đếm commit, issue) để tăng tốc độ hiển thị Dashboard thay vì phải dùng `COUNT(*)` liên tục.

### 3. RLS (Row-Level Security) là gì?
*   **Trả lời**: RLS là bảo mật ở mức **dòng (row)** ngay bên trong Database. Khác với RBAC là cấp quyền trên toàn bảng (cho phép SELECT cả bảng), RLS sẽ tự động thêm điều kiện ngầm định vào mỗi câu query. Nếu không phải chủ sở hữu hoặc repo không public, hệ thống sẽ trả về 0 dòng, dù hacker có bypass được code Backend thì cũng bị PostgreSQL chặn lại.

### 4. Đồ thị DAG trong bảng `commit_parents` là gì?
*   **Trả lời**: DAG (Directed Acyclic Graph) là đồ thị có hướng không chu trình. Trong Git, một commit có thể có nhiều cha (Merge commit). Bảng `commit_parents` lưu mối quan hệ `(commit_hash, parent_hash)` để dựng lại được cây lịch sử code nhánh rẽ của Git.

### 5. Khác biệt giữa Logical Backup và Physical Backup?
*   **Logical Backup (pg_dump)**: Lưu dữ liệu dưới dạng các câu lệnh SQL (INSERT...). Ưu điểm: Đọc được, dễ chuyển sang phiên bản khác. Nhược điểm: Phục hồi chậm.
*   **Physical Backup (pg_basebackup)**: Copy "bê nguyên" cục file nhị phân của ổ cứng. Ưu điểm: Phục hồi cực nhanh, hỗ trợ khôi phục về từng giây (PITR - Point-in-time Recovery). Nhược điểm: Phải cùng phiên bản PostgreSQL.

---

## PHẦN 2: TỔNG HỢP CÁC CÂU LỆNH SQL QUAN TRỌNG

Dưới đây là các câu SQL "khó nhằn" mà thầy cô có thể yêu cầu giải thích từng dòng chữ.

### 1. Truy vấn đệ quy duyệt cây lịch sử (Recursive CTE)
**Mục đích**: Tìm toàn bộ chuỗi lịch sử commit từ 1 commit hiện tại ngược về gốc.
```sql
WITH RECURSIVE commit_history AS (
    -- 1. BASE CASE (Bước neo): Bắt đầu từ 1 commit cụ thể (độ sâu = 1)
    SELECT commit_hash, parent_hash, 1 as depth
    FROM commit_parents
    WHERE commit_hash = 'MÃ_COMMIT_BẮT_ĐẦU'
    
    UNION ALL
    
    -- 2. RECURSIVE STEP (Bước đệ quy): Tìm cha của các commit ở bước trước
    SELECT cp.commit_hash, cp.parent_hash, ch.depth + 1
    FROM commit_parents cp
    -- JOIN với chính bảng commit_history ảo đang được tạo ra
    JOIN commit_history ch ON cp.commit_hash = ch.parent_hash
)
SELECT * FROM commit_history LIMIT 50;
```
*   **Cách giải thích**: Lệnh này dùng từ khóa `WITH RECURSIVE`. Nó chạy đoạn Base Case trước, sau đó lấy kết quả đó bỏ vào đoạn Recursive Step để quét tiếp, cứ lặp lại như vậy cho đến khi không còn `parent_hash` nào nữa (về đến Init commit).

### 2. Cơ chế Trigger tự động đếm số liệu (Phi chuẩn hóa)
**Mục đích**: Tự động cộng 1 vào bảng `repo_stats` khi có 1 commit mới được chèn vào bảng `commits`.
```sql
-- 1. Định nghĩa Hàm xử lý (Function)
CREATE OR REPLACE FUNCTION increment_commit_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Hàm này sẽ UPDATE cột commit_count tăng lên 1
    -- NEW.repo_id chính là id của repo vừa nhận được commit mới
    UPDATE repo_stats
    SET commit_count = commit_count + 1
    WHERE repo_id = NEW.repo_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Gắn Hàm đó vào Trigger của bảng commits
CREATE TRIGGER trigger_increment_commit_count
AFTER INSERT ON commits -- Sau khi có hành động chèn vào bảng commits
FOR EACH ROW -- Áp dụng cho từng dòng được chèn
EXECUTE FUNCTION increment_commit_count();
```
*   **Cách giải thích**: Hệ thống dùng `AFTER INSERT FOR EACH ROW`. Khi có dữ liệu bơm vào `commits`, trigger này tự động "bóp cò" (execute) hàm UPDATE kia, đảm bảo dữ liệu đếm luôn chính xác tuyệt đối ngay trong 1 Transaction, ứng dụng không cần lo việc đếm sót.

### 3. Tìm kiếm toàn văn bản (Full-Text Search với GIN Index)
**Mục đích**: Tìm Issue có chứa từ khóa một cách nhanh nhất.
```sql
-- 1. Lệnh tạo Index đặc biệt (GIN)
CREATE INDEX idx_issues_search ON issues 
USING GIN (to_tsvector('english', title || ' ' || body));

-- 2. Lệnh tìm kiếm có sử dụng Index
SELECT id, title
FROM issues
-- Dùng toán tử @@ và to_tsquery thay vì LIKE '%keyword%'
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', 'bug & crash');
```
*   **Cách giải thích**: Nếu dùng `LIKE '%bug%'`, database phải quét toàn bộ từng chữ trong hàng triệu dòng (Sequential Scan), cực chậm. `to_tsvector` tách các từ trong câu thành một cuốn từ điển (Inverted Index). Khi tìm, chỉ cần lật từ điển ra là thấy ID của dòng đó, tốc độ tăng vọt.

### 4. Đọc hiểu kết quả EXPLAIN ANALYZE
**Mục đích**: Chứng minh Index hoạt động (câu này hay bị hỏi lúc show minh chứng).
```sql
EXPLAIN ANALYZE 
SELECT * FROM commits WHERE repo_id = '...' ORDER BY created_at DESC LIMIT 10;
```
**Khi nhìn vào kết quả (bảng đen), bạn cần chú ý tìm 2 chữ này để chỉ cho thầy:**
*   `Index Scan using idx_commits_repo_time`: Chứng tỏ PostgreSQL **đã dùng Index**, không phải quét toàn bảng (Seq Scan).
*   `Sort Method`: Nếu **KHÔNG CÓ** dòng này, nghĩa là Index phức hợp (Composite Index) của bạn cực kỳ xịn, dữ liệu đọc ra đã được sắp xếp sẵn, database không tốn RAM và CPU để sắp xếp lại nữa.

### 5. Cấu hình bảo mật RLS
**Mục đích**: Chặn người dùng lạ xem Repo Private.
```sql
CREATE POLICY repo_access_policy ON repositories
    FOR SELECT -- Chỉ áp dụng cho lệnh SELECT (xem)
    USING (
        is_private = FALSE -- 1. Nếu public thì cho xem luôn
        -- 2. Hoặc ID người tạo giống hệt ID người đang truy cập
        OR owner_id::text = current_setting('app.current_user_id', true)
        -- 3. Hoặc người đang truy cập nằm trong danh sách repo_members
        OR EXISTS (
            SELECT 1 FROM repo_members rm
            WHERE rm.repo_id = repositories.id
              AND rm.user_id::text = current_setting('app.current_user_id', true)
        )
    );
```
*   **Cách giải thích**: Mệnh đề `USING` hoạt động như một cái phễu lọc (Filter) vô hình. Khi gõ `SELECT * FROM repositories`, Database tự động chèn thêm đống điều kiện `USING` này vào mệnh đề `WHERE` đằng sau lưng.

---
**Chúc toàn bộ nhóm ôn tập tốt và tự tin bảo vệ xuất sắc dự án GitMini nhé! 🚀**
