Source: https://docs.google.com/document/d/13rn6zkrkWF1wcXI-bGenBt8_mm2vPhKHTpw4WSHPf2Y/export?format=txt

---

﻿Thẻ 2
GitMini: Hệ thống Quản lý và Lưu trữ Mã nguồn Tập trung"
1. Tài liệu phân tích
a. Phân tích thực thể
* Users: Lưu thông tin tài khoản (username, email, hashed_password, bio).
* Repositories: Tên kho, mô tả, trạng thái (public/private), chủ sở hữu (Owner_ID).
* Commits: Lưu định danh commit (Hash SHA-1), lời nhắn, ngày tạo, tác giả.
   * Đặc biệt: Cần quan hệ tự thân (Self-reference) để lưu Parent_Commit_ID (tạo thành cấu trúc đồ thị DAG).
* Branches: Tên nhánh, Repo_ID, và Commit_ID hiện tại (Head).
* Issues/Pull Requests: Tiêu đề, nội dung, trạng thái (Open/Closed), người tạo, người được giao.
* Code_Blobs (Tùy chọn): Nếu ông muốn lưu cả nội dung file vào DB (dùng kiểu dữ liệu TEXT hoặc BLOB).
b. Xây dựng lược đồ quan hệ & Chuẩn hóa
* Lược đồ Logic: Đảm bảo chuẩn 3NF. Tách bảng Commit_History riêng để quản lý lịch sử thay đổi của từng file.
* Lược đồ Vật lý: Sử dụng UUID hoặc Hash làm khóa chính cho Commits thay vì INT để tránh đụng độ khi phân tán dữ liệu.
* Data Dictionary (Ví dụ bảng Commits):
Cột
	Kiểu dữ liệu
	Mục đích
	Ràng buộc
	commit_hash
	CHAR(40)
	Mã định danh duy nhất của commit
	PRIMARY KEY
	repo_id
	INT
	Thuộc kho mã nguồn nào
	FOREIGN KEY
	author_id
	INT
	Người thực hiện
	FOREIGN KEY
	parent_hash
	CHAR(40)
	Commit đứng trước nó
	Self-reference FK
	message
	TEXT
	Lời nhắn commit
	NOT NULL
	________________


2. Tài liệu khởi tạo CSDL (Migration & Seed)
* Migration: Viết các script 2024_create_users_table.sql, 2024_create_repos_table.sql...
* Seed Data: Đây là phần quan trọng để làm "Minh chứng tối ưu". Ông nên dùng Python/Node.js để tạo:
   * 10,000 Users.
   * 50,000 Repositories.
   * 1,000,000 Commits. (Dữ liệu lớn mới thấy rõ vai trò của Index và Sharding).
________________


3. Tài liệu tối ưu CSDL
* Danh sách Index:
   * INDEX trên commit_hash: Tìm kiếm commit cực nhanh.
   * FULLTEXT INDEX trên issues(title, body): Để tìm kiếm lỗi/yêu cầu theo từ khóa.
   * INDEX trên repos(owner_id, created_at): Tối ưu trang cá nhân hiển thị các repo mới nhất.
* Minh chứng (Explain Query):
   * Query: Tìm tất cả commit của một User trong 1 tháng qua.
   * So sánh: Show kết quả EXPLAIN trước khi có Index (loại ALL - Full Table Scan) và sau khi có Index (loại ref hoặc range).
________________


4. Tài liệu sao lưu và phục hồi
* Chiến lược: Sử dụng Write-Ahead Logging (WAL) hoặc Binary Logs.
* Backup:
   * Hàng ngày: pg_dump hoặc mysqldump (Full backup).
   * Hàng giờ: Backup file log (Incremental backup).
* Kịch bản: Giả lập sự cố "Mất dữ liệu nhánh Master của một repo quan trọng" -> Thực hiện khôi phục về trạng thái trước đó 5 phút.
________________


5. Tài liệu kỹ thuật nâng cao (Điểm cộng cực lớn)
Vì quản lý mã nguồn có lượng đọc (Read) rất cao và lượng ghi (Write) tập trung vào Commits:
* Replication: Cấu hình 1 Master (Ghi commit) và 2 Slaves (Chỉ đọc để hiển thị danh sách file, issues). Giải thích cách hệ thống vẫn chạy khi 1 Slave chết.
* Sharding: Phân mảnh dữ liệu theo User_ID.
   * User từ ID 1-1000 nằm ở Server DB 1.
   * User từ ID 1001-2000 nằm ở Server DB 2.
   * Lý do: Giúp hệ thống mở rộng vô hạn khi số lượng lập trình viên tăng lên.
* Full-text Search: Sử dụng tính năng tìm kiếm nâng cao của SQL để "Search code" hiệu quả hơn lệnh LIKE '%...%'.
________________


6. Ứng dụng (Giao diện minh họa)
Ông có thể vẽ mockup hoặc làm Web đơn giản bằng React/Vue/Thymeleaf:
1. Trang Dashboard: Danh sách các Repository bạn đang theo dõi.
2. Trang Chi tiết Repo: Hiển thị cây thư mục (truy vấn từ bảng Files/Blobs).
3. Trang Commit History: Hiển thị danh sách commit (truy vấn đệ quy hoặc theo thời gian từ bảng Commits).
4. Trang Search: Ô tìm kiếm issue toàn hệ thống.
________________


Tại sao chọn ý tưởng này?

Môn Qtri CSDL nâng cao rất thích các bài toán có phân cấp (hierarchy) như Git. Việc ông giải quyết được bài toán "Làm sao để truy vấn lịch sử Commit nhanh nhất" hoặc "Làm sao để lưu trữ hàng triệu dòng code mà không treo máy" sẽ giúp ông đạt điểm A tuyệt đối.
note_RAW
nhấn mạnh vào khả năng tối ưu, quy mô (scalability) và tính sẵn sàng (availability) của dữ liệu, 3NF để tránh dư thừa, nhưng với các bảng cần truy vấn cực nhanh (như bảng Order để thống kê), có thể cân nhắc kỹ thuật Denormalization (Phi chuẩn hóa) , dùng script để tạo khoảng 100,000 - 1,000,000 records để minh chứng được hiệu năng tối ưu ở phần sau., Chỉ mục (Index):


Tạo B-Tree Index trên products(name) để tìm kiếm nhanh.


Tạo Composite Index trên orders(user_id, status) để lọc đơn hàng của một user theo trạng thái.


Explain Query: Sử dụng lệnh EXPLAIN ANALYZE (trong MySQL/PostgreSQL) để so sánh tốc độ trước và sau khi đánh Index.






"Trước khi đánh index, query mất 500ms (Full Table Scan). Sau khi đánh index, chỉ còn 10ms (Index Scan)."


4. Tài liệu sao lưu và phục hồi


Chiến lược:


Full Backup: Vào 1h sáng mỗi Chủ Nhật.


Incremental Backup: Ghi lại Log (Binary logs/WAL) hàng giờ.


Kịch bản phục hồi: Giả lập tình huống xóa nhầm bảng Orders, dùng bản backup gần nhất và log để khôi phục đến thời điểm ngay trước khi xóa (Point-in-time recovery).


5. Tài liệu kỹ thuật nâng cao (Option lấy điểm 10)


Để "flex" kỹ năng quản trị, ông nên chọn 1 trong 2:






Replication (Bản sao)


Mô hình: Master-Slave.


Cài đặt: Mọi lệnh INSERT/UPDATE gửi tới Master, lệnh SELECT (xem sản phẩm) gửi tới các Slave. Điều này giúp hệ thống chịu tải được hàng triệu lượt xem cùng lúc.


Sharding (Phân mảnh)


Chiến lược: Sharding bảng Inventory theo Warehouse_ID.


Lý do: Kho ở Hà Nội lưu dữ liệu ở Server miền Bắc, kho TP.HCM lưu ở Server miền Nam. Giúp giảm tải cho một database duy nhất và tăng tốc độ truy cập theo địa lý., show được các chức năng gọi tới database:






Màn hình Danh sách sản phẩm (có phân trang).


Màn hình Đặt hàng (có xử lý Transaction - cực kỳ quan trọng để đảm bảo không bị trừ tiền mà mất đơn).


Màn hình Admin xem Dashboard thống kê (dùng query phức tạp).


Lời khuyên từ tôi:


Nếu ông chọn MySQL, hãy tìm hiểu về InnoDB Storage Engine. Nếu chọn PostgreSQL, hãy tập trung vào Partitioning. Cả hai đều rất "ăn điểm" trong mắt giảng viên.,  kỹ năng xử lý cấu trúc dữ liệu phức tạp (cây commit), tối ưu tìm kiếm văn bản (code/issue) và các kỹ thuật mở rộng hệ thống (sharding/replication) khi dữ liệu phình to., bài toán có phân cấp (hierarchy) như Git, Gemini đã nói






Nếu để chọn một ý tưởng thực sự "đáng đồng tiền bát gạo" cho môn Quản trị CSDL nâng cao, tôi khuyên ông nên chọn GitMini (Hệ thống quản lý mã nguồn).


Dưới đây là lý do tại sao ý tưởng này "ăn đứt" thương mại điện tử trong bối cảnh một môn học nâng cao, kèm theo các điểm mấu chốt để ông ghi điểm tuyệt đối.


🏆 Tại sao GitMini "out trình" hơn?


Tiêu chíE-commerce (Kho hàng)GitMini (Quản lý Code)Cấu trúc dữ liệuPhẳng, quan hệ 1-nhiều đơn giản.Phức tạp (Graph/Tree). Các commit nối đuôi nhau tạo thành đồ thị.Truy vấn nâng caoJOIN nhiều bảng, Aggregate (Sum, Count).Recursive CTE (Truy vấn đệ quy) để tìm lịch sử commit.Thử thách lưu trữDữ liệu dạng text, số đơn giản.BLOB/LOB. Lưu trữ nội dung file (Code) đòi hỏi kỹ thuật nén hoặc lưu trữ ngoài DB.Tìm kiếmB-Tree Index trên tên SP là đủ.Full-text Search. Tìm một đoạn code trong hàng triệu file là bài toán cực khó.Độ "Unique"Rất phổ biến, dễ bị đụng hàng.Độc đáo, thể hiện tư duy hệ thống tốt.


🚀 Các "vũ khí" nâng cao ông có thể cài đặt cho GitMini

Để bài tập lớn thực sự là "nâng cao", ông hãy tập trung vào 3 kỹ thuật này:


1. Truy vấn đệ quy (Recursive CTE)


Trong Git, mỗi commit trỏ về Parent_ID. Để lấy toàn bộ lịch sử của một nhánh, ông không thể dùng JOIN thông thường nếu không biết có bao nhiêu commit.


Ghi điểm: Viết một câu SQL đệ quy để "du hành" ngược thời gian từ commit hiện tại về commit đầu tiên (Root). Đây là kiến thức mà giảng viên cực kỳ thích ở phần nâng cao.


2. Chiến lược Sharding theo "Repo_ID" thay vì "User_ID"


Bài toán: Nếu một User có 1000 Repo, và ông Sharding theo User, toàn bộ 1000 Repo đó đổ dồn vào 1 server -> Quá tải.


Giải pháp nâng cao: Sharding theo Repo_ID kết hợp với Consistent Hashing. Điều này đảm bảo các Repository được phân tán đều trên các Node dữ liệu khác nhau, giúp hệ thống chịu tải hàng tỷ dòng code.


3. Tối ưu hóa lưu trữ (Large Objects & Compression)


Dữ liệu code có thể rất lớn. Thay vì lưu thẳng vào bảng, ông có thể trình bày về:


TOAST (trong PostgreSQL): Cách DB tự động nén và lưu các dòng dữ liệu lớn ở một vùng nhớ riêng.


File Streaming: Chỉ lưu metadata trong SQL, còn nội dung file lưu ở hệ thống lưu trữ phân tán (MinIO/S3), sau đó dùng SQL để quản lý đường dẫn và phiên bản.


🛠 Lộ trình triển khai để lấy điểm A


Nếu ông chọn GitMini, hãy làm theo hướng này để "flex" với thầy cô:


Thiết kế DB cho phép "Branching": Làm sao để khi tạo nhánh mới, mình không phải nhân đôi toàn bộ dữ liệu? (Dùng con trỏ trỏ đến Commit cuối cùng).


Xử lý Concurrency (Transaction): Khi 2 người cùng push lên một lúc, DB xử lý khóa (Locking) như thế nào để không bị hỏng lịch sử?


Explain Query: Show bản kế hoạch truy vấn cho thấy việc tìm kiếm một commit hash trong 1 triệu bản ghi chỉ mất < 1ms nhờ Hash Index., 


note
1) Những ý nên giữ mạnh
Đây là phần thực sự giúp GitMini ăn điểm ở môn Qtri CSDL nâng cao:
* 3NF để giảm dư thừa và tránh lỗi cập nhật.
* Recursive CTE để truy vết cây/đồ thị commit.
* Index + EXPLAIN ANALYZE để chứng minh tối ưu hiệu năng.
* Backup/restore + point-in-time recovery để nói về tính sẵn sàng dữ liệu.
* Transaction khi push/merge/create branch để tránh trạng thái lỗi.
* Seed data lớn 100k–1M records để có cơ sở đo hiệu năng thật.
* Full-text search cho issue / code / commit message.
Đây là xương sống của bài.
________________


2) Những ý nên chỉnh lại
Có vài chỗ trong note nên sửa để tránh bị thầy bắt bẻ.
a) “Hash Index trên commit_hash”
Nếu commit_hash đã là PRIMARY KEY hoặc UNIQUE, thì nó đã có index rồi.
Với MySQL/PostgreSQL, trong nhiều trường hợp B-Tree là đủ tốt cho tra cứu bằng khóa.
Nên nói lại thành:
* commit_hash là PK/Unique
* Có thể dùng B-Tree index cho tra cứu theo hash
* Chỉ dùng Hash Index nếu thật sự cần và DB hỗ trợ phù hợp, nhưng đây không phải lựa chọn mặc định
b) “Composite Index trên orders(user_id, status)”
Đây là ví dụ ecommerce, không khớp với GitMini.
Bạn nên đổi sang index đúng ngữ cảnh GitMini:
* commits(repo_id, created_at)
* commits(author_id, created_at)
* branches(repo_id, name)
* issues(repo_id, status, created_at)
* fulltext(issues.title, issues.body)
* fulltext(commits.message)
c) “Denormalization cho bảng Order”
Cái này đúng về nguyên lý, nhưng với GitMini nên đổi thành:
* Phi chuẩn hóa có kiểm soát cho các màn hình đọc nhiều như:
   * dashboard repo
   * commit history
   * thống kê issue
   * số lượng commit theo branch
* Ví dụ lưu sẵn:
   * repo_commit_count
   * repo_issue_open_count
   * latest_commit_message
   * branch_head_commit_hash
Tức là không nói “Order”, mà nói “bảng tổng hợp phục vụ thống kê”.
d) “Sharding theo User_ID”
Với GitMini, sharding theo user_id chưa chắc tối ưu nhất.

Nếu mục tiêu là repo/commit/read-heavy, nên cân nhắc:
* Sharding theo repo_id: hợp lý hơn với truy vấn lịch sử repo
* Hoặc hash-based sharding theo repo_id để cân bằng tải
* user_id chỉ phù hợp nếu bài toán thiên về tài khoản/người dùng
Nếu bạn chỉ làm báo cáo, có thể nói:
“Có thể shard theo user_id hoặc repo_id, nhưng trong GitMini, repo_id thường hợp workload hơn vì phần lớn truy vấn xoay quanh repo, commit, branch.”
e) “1 triệu commit” là tốt, nhưng có thể quá nặng
Nếu máy yếu hoặc thời gian làm hạn chế, nên chuẩn bị 2 mức dữ liệu:
* 100k records: demo nhanh, an toàn
* 1M records: benchmark tối ưu
Cách này khôn hơn vì vừa có demo chạy được, vừa có phần “wow” để trình bày.
________________


3) Những ý còn thiếu
Đây là các phần mình nghĩ bạn nên thêm để bài tròn hơn.
a) Mô hình dữ liệu Git đúng hơn
Nếu muốn GitMini “đã” thật sự, nên mô tả theo kiểu Git-like storage:
* users
* repositories
* branches
* commits
* commit_parents
* trees
* tree_entries
* blobs
* issues
* pull_requests
* comments
Điểm quan trọng nhất:
* Commit có thể có nhiều parent vì merge commit
* Không nên chỉ để một parent_commit_id
Đây là chỗ rất dễ được cộng điểm vì thể hiện hiểu cấu trúc Git thật.
b) Cơ chế versioning / snapshot
Nên nói rõ:
* Commit không sửa trực tiếp dữ liệu cũ
* Mỗi commit là một snapshot hoặc tham chiếu đến tree/blob
* Dữ liệu bất biến giúp:
   * giảm lock
   * dễ rollback
   * tăng tính nhất quán
c) Transaction cho push/merge
Nên mô tả transaction ở 1–2 luồng quan trọng:
* tạo commit
* cập nhật branch head
* ghi parent relation
* ghi blob/tree nếu có
Nếu một bước fail thì rollback toàn bộ.
Đây là điểm rất mạnh vì cho thấy bạn hiểu atomicity.
d) Phân trang và truy vấn hot path
Nên thêm mục:
* danh sách repo có phân trang
* commit history có phân trang
* issue list theo status
* tìm kiếm theo keyword
Vì đây là các truy vấn rất thực tế, giảng viên thường thích.
e) Monitoring/benchmark
Nên có một bảng so sánh:
* trước index
* sau index
* trước denormalization
* sau denormalization
* trước phân vùng
* sau phân vùng
Chỉ cần 3–4 query tiêu biểu là đủ.
________________


4) Những ý nên bỏ hoặc giảm bớt
Không phải bỏ vì sai, mà vì dễ làm bài bị loãng.
a) Đừng ôm quá nhiều công nghệ cùng lúc
Bạn không nên vừa:
* replication
* sharding
* partitioning
* full-text
* compression
* S3/MinIO
* graph DB so sánh
* TOAST
* WAL
Tất cả cùng lúc sẽ biến bài thành “kể lể công nghệ” chứ không còn là một project rõ ràng.
Nên chọn:
* 1 DB chính: PostgreSQL hoặc MySQL
* 1 hướng tối ưu chính: index + partitioning/denormalization
* 1 hướng mở rộng: replication hoặc sharding
* 1 hướng search: full-text
b) Giảm phần “flex” quá đà về Hash Index
Vì commit hash lookup thực tế đã rất nhanh nhờ PK/Unique.
Nên nói ngắn gọn, tránh nhấn quá nhiều vào “Hash Index 1ms” nếu không benchmark thật.
c) Không cần đưa quá nhiều ví dụ ecommerce
Vì đề tài của bạn là GitMini.
Các ví dụ như orders, products, inventory chỉ nên giữ nếu bạn đang so sánh để giải thích khái niệm chung.
Còn phần báo cáo chính nên đồng bộ theo GitMini.
________________


5) Cấu trúc note nên chốt lại thế này
Mình khuyên bạn chốt project theo 6 mảng:
1. Mô hình dữ liệu
* 3NF
* commit graph dạng DAG
* many-to-many parent relation
* blobs/trees nếu muốn nâng cao
2. Tối ưu truy vấn
* PK/unique index cho hash
* composite index cho repo_id + created_at
* full-text cho issues/message
* EXPLAIN ANALYZE trước/sau
3. Phi chuẩn hóa có kiểm soát
* bảng summary cho dashboard/statistics
* chỉ dùng nơi đọc nhiều, tránh lạm dụng
4. Tính sẵn sàng dữ liệu
* full backup
* incremental/WAL/binlog
* PITR
5. Khả năng mở rộng
* replication hoặc sharding
* partitioning nếu dùng PostgreSQL

* giải thích theo workload thật của GitMini
6. Minh chứng hiệu năng
* 100k đến 1M records
* test truy vấn hot path
* so sánh thời gian trước/sau tối ưu
________________


6) Kết luận ngắn gọn
Nếu mình chấm theo hướng báo cáo, note của bạn đang ở mức tốt, nhưng để thành rất mạnh thì cần:
* giảm ví dụ ecommerce
* bỏ các ý không sát GitMini
* chỉnh index cho đúng ngữ cảnh
* thêm commit graph nhiều parent
* thêm transaction, backup/PITR, benchmark
* chọn ít công nghệ nhưng đào sâu
Câu chốt nên dùng trong báo cáo là:
GitMini tập trung vào mô hình dữ liệu dạng DAG, tối ưu truy vấn lịch sử commit bằng index và truy vấn đệ quy, đồng thời đảm bảo khả năng mở rộng và sẵn sàng dữ liệu thông qua backup, replication/sharding và phi chuẩn hóa có kiểm soát.





script - plan
BÁO CÁO DỰ ÁN: GITMINI (DATABASE FOCUS)
1. TỔNG QUAN & LỘ TRÌNH THIẾT KẾ (ROADMAP)
Dự án tập trung vào việc mô phỏng cách Git lưu trữ dữ liệu dưới dạng Content-Addressable Filesystem nhưng triển khai hoàn toàn trên Relational Database (SQL).
Lộ trình triển khai (6 Bước):
1. Giai đoạn 1: Thiết kế thực thể & Quan hệ (ERD). Tập trung vào cấu trúc Đồ thị có hướng không chu trình (DAG) của Commit.
2. Giai đoạn 2: Cài đặt CSDL & Migration. Sử dụng PostgreSQL (khuyên dùng vì hỗ trợ đệ quy và JSONB cực tốt).
3. Giai đoạn 3: Xử lý Logic nâng cao. Viết các SQL nâng cao cho Branching, Merging (Logic).
4. Giai đoạn 4: Tối ưu hóa (Performance). Đánh Index, Partitioning cho bảng dữ liệu lớn.
5. Giai đoạn 5: Quản trị vận hành. Thiết lập Replication và chiến lược Backup.
6. Giai đoạn 6: Demo App. Xây dựng giao diện Web đơn giản hiển thị Commit Tree.


2. CHI TIẾT THIẾT KẾ CSDL (DATABASE DESIGN)
a. Phân tích thực thể
Khác với DB thông thường, GitMini cần lưu trữ theo cấu trúc: Commit -> Tree -> Blob.
* Users: Thông tin định danh.
* Repositories: Thông tin kho chứa.
* Blobs: Lưu nội dung file thô (sử dụng kiểu BYTEA hoặc TEXT).
* Commits: Lưu Snapshot của hệ thống.
   * commit_hash (PK): SHA-1 của nội dung.
   * parent_hash (FK): Trỏ về commit trước đó (Quan hệ 1-N để tạo nhánh).
* Branches: Bản chất là một "con trỏ" (Pointer) lưu commit_hash mới nhất của một nhánh.
b. Sơ đồ vật lý & Data Dictionary (Mẫu)
Bảng Commits là bảng quan trọng nhất:
Cột
	Kiểu
	Mô tả
	Ghi chú
	id
	UUID
	Khóa chính
	Dùng UUID để dễ Sharding sau này
	repo_id
	INT
	ID của Repository
	INDEXED
	author_id
	INT
	ID người tạo


	message
	TEXT
	Lời nhắn commit


	parent_id
	UUID
	Trỏ về commit trước
	Self-reference
	created_at
	TIMESTAMP
	Thời gian
	PARTITION KEY


3. KIẾN THỨC NÂNG CAO (THE "MASTER" PART)
Đây là những phần giúp ông lấy điểm 10 và thể hiện trình độ "Advanced".
A. Truy vấn đệ quy (Recursive CTE) - Lấy lịch sử Commit
Trong Git, để lấy "Git Log", ông phải duyệt ngược từ Commit hiện tại về Root.
SQL
WITH RECURSIVE commit_history AS (
    -- Điểm bắt đầu (Anchor): Commit hiện tại của nhánh Main
    SELECT id, message, parent_id, 1 as depth
    FROM commits WHERE id = 'current-hash'
    UNION ALL
    -- Bước đệ quy: Tìm parent của commit vừa tìm được
    SELECT c.id, c.message, c.parent_id, h.depth + 1
    FROM commits c
    INNER JOIN commit_history h ON c.id = h.parent_id
)
SELECT * FROM commit_history ORDER BY depth ASC;


B. Sharding Chiến lược (Horizontal Scaling)
Vì số lượng commit có thể lên tới hàng tỷ, ông đề xuất:
* Sharding Key: repo_id.
* Lý do: Các thao tác Git thường diễn ra trong phạm vi 1 Repository. Việc đưa 1 Repo vào 1 Shard giúp tránh việc "Join" xuyên Server (Cross-shard join), tăng tốc độ truy vấn đáng kể.
C. Partitioning (Phân vùng dữ liệu)

Với bảng Blobs (lưu code) cực lớn, hãy sử dụng Table Partitioning theo created_at (năm/tháng). Code cũ ít khi được sờ tới sẽ nằm ở các Partition cũ, giúp Index của các Partition mới luôn nhỏ gọn và nhanh.
D. Tối ưu tìm kiếm với GIN Index
Nếu user muốn tìm một từ khóa trong đống code (Search code):
* Sử dụng Full-text Search kết hợp với GIN Index trong PostgreSQL thay vì LIKE %...%. Nó giúp tìm kiếm trong hàng triệu dòng code chỉ mất vài miligiây.


4. CHIẾN LƯỢC SAO LƯU & PHỤC HỒI (BACKUP/RECOVERY)
Trong quản trị nâng cao, "Mất code là mất hết". Ông cần trình bày:
1. Write-Ahead Logging (WAL): Giải thích cách DB ghi Log trước khi ghi Data thật để đảm bảo an toàn nếu server sập.
2. Point-in-Time Recovery (PITR): Kỹ thuật cho phép khôi phục DB về đúng một giây cụ thể trong quá khứ (Ví dụ: "Tôi muốn quay lại lúc 10:05:02 sáng nay trước khi bị tấn công SQL Injection").


5. CÔNG NGHỆ KHUYÊN DÙNG (STACK)
* Database: PostgreSQL 15+ (Mạnh nhất về xử lý cấu trúc phức tạp).
* Backend: Golang hoặc Node.js (Xử lý concurrency tốt khi nhiều người cùng push code).
* Dữ liệu ảo (Seed): Viết script Python dùng thư viện Faker để tạo 1 triệu bản ghi commit nhằm test hiệu năng Index


Thiết kế schema chuẩn (3NF + commit DAG)
PHASE 1 — THIẾT KẾ DATABASE (PostgreSQL)
 Mục tiêu
* Thiết kế đúng Git structure
* Đảm bảo 3NF
* Có khả năng scale
 1.1 Tạo schema (run trên DBeaver)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);


________________


CREATE TABLE repositories (
    id SERIAL PRIMARY KEY,
    name TEXT,
    owner_id INT REFERENCES users(id),
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);




1.2 COMMITS (CORE)
CREATE TABLE commits (
    commit_hash CHAR(40) PRIMARY KEY,
    repo_id INT REFERENCES repositories(id),
    author_id INT REFERENCES users(id),
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);




1.3 COMMIT GRAPH (QUAN TRỌNG)
 hỗ trợ merge commit (multi-parent)
CREATE TABLE commit_parents (
    commit_hash CHAR(40),
    parent_hash CHAR(40),
    PRIMARY KEY (commit_hash, parent_hash),
    FOREIGN KEY (commit_hash) REFERENCES commits(commit_hash),
    FOREIGN KEY (parent_hash) REFERENCES commits(commit_hash)
);


1.4 BRANCHES
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    repo_id INT REFERENCES repositories(id),
    name TEXT,
    head_commit_hash CHAR(40),
    UNIQUE(repo_id, name)
);


1.5 ISSUES (cho full-text search)
CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    repo_id INT REFERENCES repositories(id),
    title TEXT,
    body TEXT,
    status TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);




Seed dữ liệu lớn (100k → 1M records)
PHASE 2 — SEED DATA 
Mục tiêu
* Có data đủ lớn để benchmark
* 100k → 1M commits
________________
 Dùng Python generate
import random, string, time


def random_hash():
    return ''.join(random.choices('abcdef0123456789', k=40))


for i in range(100000):
    print(f"""
    INSERT INTO commits (commit_hash, repo_id, author_id, message)
    VALUES ('{random_hash()}', {random.randint(1,100)}, {random.randint(1,1000)}, 'commit message {i}');
    """)


 copy vào DBeaver chạy batch
________________


 Pro tip
* Seed:
   * 1,000 users
   * 10,000 repos
   * 100k–1M commits


Tối ưu truy vấn (Index + EXPLAIN ANALYZE)
PHASE 3 — INDEX & TỐI ƯU
Mục tiêu
Show rõ ràng:
“Trước index: chậm → Sau index: nhanh”
3.1 Tạo index
CREATE INDEX idx_commits_repo_time 
ON commits(repo_id, created_at DESC);


CREATE INDEX idx_commits_author 
ON commits(author_id);


CREATE INDEX idx_commit_parents 
ON commit_parents(commit_hash);


CREATE INDEX idx_commit_parents_parent 
ON commit_parents(parent_hash);


3.2 FULL-TEXT SEARCH
CREATE INDEX idx_issues_fulltext 
ON issues USING GIN (to_tsvector('english', title || ' ' || body));


3.3 TEST QUERY
EXPLAIN ANALYZE
SELECT *
FROM commits
WHERE repo_id = 10
ORDER BY created_at DESC
LIMIT 20;


KỊCH BẢN DEMO
Trạng thái
	Kết quả
	Không index
	Seq Scan (~300-500ms)

Có index
	Index Scan (~5-20ms)
	 Đây là đoạn bạn flex mạnh nhất










Nâng cao (Denormalization + Partitioning)
PHASE 4 — NÂNG CAO 
4.1 DENORMALIZATION
 tạo bảng dashboard
CREATE TABLE repo_stats (
    repo_id INT PRIMARY KEY,
    commit_count INT,
    latest_commit_time TIMESTAMP
);


________________


 update bằng trigger hoặc batch
INSERT INTO repo_stats
SELECT repo_id, COUNT(*), MAX(created_at)
FROM commits
GROUP BY repo_id;


________________


 Insight để nói:
“Giảm JOIN → tăng tốc read-heavy query”
 4.2 PARTITIONING (PostgreSQL cực ăn điểm)
CREATE TABLE commits_partitioned (
    commit_hash CHAR(40),
    repo_id INT,
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);


________________


CREATE TABLE commits_2025
PARTITION OF commits_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');


________________


 Insight:
Query theo thời gian → chỉ scan 1 partition


Availability (Backup+Recovery+Replicationconcept)
PHASE 5 — BACKUP & RECOVERY
________________


 5.1 FULL BACKUP
pg_dump -U postgres -d gitmini > backup.sql


________________


 5.2 WAL (incremental)
PostgreSQL tự động ghi WAL
cần nói:
“Dùng WAL để phục hồi theo thời điểm”
________________
 5.3 KỊCH BẢN
 “Xóa bảng commits”
DROP TABLE commits;


 Restore:
psql -U postgres -d gitmini < backup.sql


________________


 Insight:
“Có thể restore đến thời điểm trước khi lỗi xảy ra (PITR)”


 PHASE 6 — SCALABILITY (LÝ THUYẾT + DEMO NHẸ)
________________


 6.1 REPLICATION
* 1 Primary (write)
* 2 Replica (read)
 nói:
“Read scaling x3 mà không tăng write load”
________________


 6.2 SHARDING (concept)
 đề xuất:
* hash(repo_id)
* phân phối qua nhiều node
________________


 Insight chốt:
“Repo là đơn vị workload → shard theo repo”


 PHASE 7 — DEMO UI (OPTION NHẸ)
Chỉ cần mock:
* Repo list
* Commit history
* Search issue
 PHẦN “ĂN ĐIỂM KHI DEFEND”
Bạn phải nói được 5 câu này:


1
“Commit graph là DAG, không phải linked list”


2
“Dùng Recursive CTE để truy vấn lịch sử commit”


3
“Index giúp giảm từ Seq Scan xuống Index Scan”


4
“Denormalization chỉ dùng cho read-heavy workload”


5
“Sharding theo repo_id giúp phân tán tải tốt hơn user_id”

