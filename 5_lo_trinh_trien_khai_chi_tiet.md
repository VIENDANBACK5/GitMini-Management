# LỘ TRÌNH TRIỂN KHAI CHI TIẾT DỰ ÁN GITMINI

Tài liệu này phân rã dự án thành 5 giai đoạn (Phases) thực thi chuyên sâu, tập trung vào kỹ thuật quản trị cơ sở dữ liệu nâng cao trên PostgreSQL 15+.

---

## GIAI ĐOẠN 1: THIẾT KẾ & ĐẶC TẢ (PLANNING)
*Trạng thái: Hoàn tất*

*   **Task 1.1:** Xác định yêu cầu chức năng và đối tượng người dùng.
*   **Task 1.2:** Thiết kế mô hình ERD và chuẩn hóa 3NF cho 8 bảng chính.
*   **Task 1.3:** Thiết kế chiến lược bảo mật CIA (SSL, RBAC, RLS).
*   **Task 1.4:** Thiết kế kịch bản sao lưu và phục hồi (Backup, WAL, Replication).
*   **Kết quả đầu ra:** 5 file tài liệu `.md` (từ 1 đến 5).

---

## GIAI ĐOẠN 2: XÂY DỰNG NỀN TẢNG (SQL CORE)
*Trạng thái: Sắp bắt đầu*

*   **Task 2.1:** Viết script khởi tạo Schema (`01_schema.sql`) với đầy đủ ràng buộc PK/FK/CHECK.
*   **Task 2.2:** Thiết lập hệ thống Index (`02_indexes.sql`) bao gồm B-Tree và GIN Index cho tìm kiếm.
*   **Task 2.3:** Viết mã SQL cho các truy vấn đệ quy (Recursive CTE) để duyệt đồ thị Commit (DAG).
*   **Task 2.4:** Viết các Procedure/Trigger (`03_triggers.sql`) để tự động cập nhật bảng phi chuẩn hóa `repo_stats`.
*   **Kết quả đầu ra:** Các file SQL khởi tạo core hệ thống.

---

## GIAI ĐOẠN 3: BẢO MẬT & PHÂN QUYỀN (CIA IMPLEMENTATION)
*Trạng thái: Chờ thực thi*

*   **Task 3.1:** Triển khai **RBAC** (`04_security_roles.sql`): Tạo Role Admin, Reviewer, Developer và gán quyền chi tiết.
*   **Task 3.2:** Triển khai **RLS** (`05_security_rls.sql`): Viết các Policy bảo vệ dữ liệu ở mức hàng (chống xem trộm repository).
*   **Task 3.3:** Cấu hình **Audit**: Thiết lập logging để ghi lại các hành vi thay đổi dữ liệu nhạy cảm.
*   **Kết quả đầu ra:** Mã SQL bảo mật hỏa lực mạnh cho DB.

---

## GIAI ĐOẠN 4: DỮ LIỆU LỚN & TỐI ƯU (STRESS TEST)
*Trạng thái: Chờ thực thi*

*   **Task 4.1:** Viết script Python (`seed_data.py`) để sinh tự động từ 100,000 đến 1,000,000 bản ghi commit.
*   **Task 4.2:** Thực hiện **Benchmark**: So sánh tốc độ truy vấn trước và sau khi đánh Index bằng lệnh `EXPLAIN ANALYZE`.
*   **Task 4.3:** Kiểm tra hiệu năng của bảng phi chuẩn hóa so với lệnh `COUNT(*)` truyền thống.
*   **Kết quả đầu ra:** Báo cáo so sánh hiệu năng và dữ liệu mẫu lớn.

---

## GIAI ĐOẠN 5: VẬN HÀNH & SẴN SÀNG (OPERATIONS)
*Trạng thái: Chờ thực thi*

*   **Task 5.1:** Triển khai script sao lưu tự động (`backup.sh`) và cơ chế lưu trữ WAL.
*   **Task 5.2:** Giả lập sự cố xóa nhầm dữ liệu và thực hiện phục hồi theo thời điểm (PITR).
*   **Task 5.3:** Cấu hình mô hình Master-Slave (Replication) để đảm bảo High Availability.
*   **Kết quả đầu ra:** Hệ thống có khả năng tự phục hồi và chịu lỗi cao.

---
> [!IMPORTANT]
> **Nguyên tắc thực hiện:** Hoàn thành dứt điểm từng Giai đoạn mới chuyển sang giai đoạn tiếp theo để đảm bảo tính nhất quán của cơ sở dữ liệu.
