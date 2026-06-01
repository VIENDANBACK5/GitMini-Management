Source: https://docs.google.com/document/d/1_WgvdsO_2tiZqbFsCb6BWXQSoUtlZ8Dr/export?format=txt

---

﻿BÁO CÁO BÀI TẬP LỚN
Môn: Quản trị Cơ sở Dữ liệu Nâng cao
GitMini — Hệ thống Quản lý và Lưu trữ Mã nguồn Tập trung


1. MÔ TẢ CHỨC NĂNG
1.1. Giới thiệu tổng quan hệ thống
GitMini là một hệ thống quản lý mã nguồn (Source Code Management — SCM) được xây dựng hoàn toàn trên nền tảng cơ sở dữ liệu quan hệ PostgreSQL 15+. Hệ thống mô phỏng các tính năng cốt lõi của Git hiện đại, bao gồm: quản lý kho mã nguồn (repository), theo dõi lịch sử thay đổi thông qua cấu trúc đồ thị có hướng không chu trình (Directed Acyclic Graph — DAG), phân nhánh mã nguồn (branching), theo dõi vấn đề kỹ thuật (issue tracking) và hợp nhất mã nguồn thông qua cơ chế Pull Request. GitMini được thiết kế dành cho các nhóm phát triển phần mềm vừa và nhỏ, với mục tiêu chứng minh khả năng ứng dụng của cơ sở dữ liệu quan hệ trong việc giải quyết các bài toán quản lý dữ liệu có cấu trúc phức tạp.
Về mặt kỹ thuật cơ sở dữ liệu, GitMini khai thác một cách có hệ thống nhiều tính năng nâng cao của PostgreSQL. Cụ thể, cấu trúc lịch sử commit được biểu diễn dưới dạng đồ thị DAG thông qua bảng commit_parents, cho phép hỗ trợ merge commit nhiều nhánh cha. Việc duyệt đồ thị này được thực hiện bằng kỹ thuật Recursive Common Table Expression (CTE), thay thế hiệu quả cho các giải pháp xử lý ở tầng ứng dụng. Ngoài ra, hệ thống tận dụng Full-text Search với chỉ mục GIN (Generalized Inverted Index) để tìm kiếm nhanh trên nội dung commit và issue. Cơ chế phi chuẩn hóa có kiểm soát (Controlled Denormalization) được áp dụng cho bảng repo_stats nhằm tránh các truy vấn tổng hợp nặng trên dashboard. Tính toàn vẹn dữ liệu trong các thao tác phức tạp như tạo commit và merge được đảm bảo thông qua Transaction ACID.


1.2. Đối tượng người dùng
Hệ thống GitMini phục vụ ba nhóm đối tượng người dùng chính, với phân cấp quyền hạn rõ ràng như trình bày trong bảng dưới đây:


Vai trò
	Tên gọi
	Quyền hạn chính
	Developer
	Lập trình viên
	Tạo và quản lý repository; push commit lên hệ thống; tạo và quản lý branch; mở và đóng issue; tạo Pull Request.
	Reviewer
	Người đánh giá mã nguồn
	Xem xét và phê duyệt Pull Request; thực hiện thao tác merge mã nguồn giữa các nhánh; xem lịch sử commit và danh sách issue.
	Admin
	Quản trị viên hệ thống
	Quản lý toàn bộ tài khoản người dùng và repository; thực hiện sao lưu (backup) và phục hồi (restore) cơ sở dữ liệu; giám sát hiệu năng và tính toàn vẹn dữ liệu.


1.3. Bảng tổng hợp chức năng
Hệ thống GitMini bao gồm 21 use case thuộc 7 nhóm chức năng, được tổng hợp trong bảng sau:


Mã UC
	Tên chức năng
	Mô tả ngắn gọn
	Bảng DB liên quan
	Kỹ thuật DB đặc biệt
	Nhóm 1 — Quản lý Tài khoản
	UC01
	Đăng ký tài khoản
	Người dùng nhập thông tin cá nhân để tạo tài khoản mới trong hệ thống.
	users
	INSERT, ràng buộc UNIQUE
	UC02
	Đăng nhập
	Xác thực danh tính người dùng thông qua username và mật khẩu đã mã hóa.
	users
	SELECT, kiểm tra password_hash
	UC03
	Xem / Chỉnh sửa hồ sơ
	Người dùng xem và cập nhật thông tin cá nhân (bio, email).
	users
	UPDATE với điều kiện lọc theo ID
	Nhóm 2 — Quản lý Repository
	UC04
	Tạo repository mới
	Tạo kho mã nguồn mới, đồng thời khởi tạo nhánh mặc định main.
	repositories, branches
	INSERT đa bảng, giá trị mặc định
	UC05
	Xem danh sách repository
	Liệt kê repository với bộ lọc, sắp xếp và hỗ trợ phân trang.
	repositories, users
	SELECT với LIMIT/OFFSET, ORDER BY
	UC06
	Xem chi tiết repository
	Hiển thị đầy đủ thông tin repo bao gồm thống kê tổng quan.
	repositories, users, repo_stats
	JOIN đa bảng
	UC07
	Chỉnh sửa / Xóa repository
	Cập nhật thông tin mô tả hoặc xóa hoàn toàn repository.
	repositories

UPDATE / DELETE CASCADE
	Nhóm 3 — Quản lý Commit
	UC08
	Tạo commit mới
	Ghi nhận snapshot mã nguồn mới, liên kết cha-con và cập nhật con trỏ nhánh.
	commits, commit_parents, branches
	TRANSACTION ACID, ROLLBACK
	UC09
	Xem lịch sử commit
	Duyệt toàn bộ cây lịch sử commit từ HEAD về root theo cấu trúc DAG.
	commits, commit_parents, branches
	Recursive CTE (WITH RECURSIVE)
	UC10
	Tìm kiếm commit
	Tìm kiếm commit theo từ khóa trong nội dung thông điệp commit.
	commits
	GIN Index, Full-text Search
	Nhóm 4 — Quản lý Branch
	UC11
	Tạo nhánh mới
	Tạo con trỏ branch mới trỏ đến commit hiện tại đang được chỉ định.
	branches
	INSERT với tham chiếu commit_hash
	UC12
	Liệt kê các nhánh
	Hiển thị toàn bộ nhánh hiện có của một repository.
	branches
	SELECT với điều kiện repo_id
	UC13
	Xóa nhánh
	Xóa một nhánh không còn cần thiết (không xóa commit).
	branches
	DELETE có kiểm tra ràng buộc
	Nhóm 5 — Quản lý Issue
	UC14
	Tạo issue mới
	Ghi nhận một vấn đề kỹ thuật hoặc yêu cầu tính năng mới.
	issues
	INSERT với trạng thái mặc định 'open'
	UC15
	Xem danh sách issues
	Liệt kê issues theo trạng thái (open/closed) với hỗ trợ phân trang.
	issues
	SELECT với ENUM filter, LIMIT/OFFSET
	UC16
	Tìm kiếm issue
	Tìm kiếm issue theo từ khóa trong tiêu đề và nội dung mô tả.
	issues
	GIN Index, Full-text Search đa trường
	UC17
	Đóng issue
	Cập nhật trạng thái issue từ 'open' sang 'closed' sau khi xử lý xong.
	issues
	UPDATE với điều kiện trạng thái
	Nhóm 6 — Quản lý Pull Request
	UC18
	Tạo Pull Request
	Gửi yêu cầu hợp nhất mã nguồn từ nhánh nguồn vào nhánh đích.
	pull_requests
	INSERT với tham chiếu 2 nhánh
	UC19
	Merge Pull Request
	Thực hiện hợp nhất mã nguồn, tạo merge commit với hai nhánh cha.
	commits, commit_parents, branches, pull_requests
	TRANSACTION phức tạp, merge commit 2 parents
	UC20
	Xem danh sách PR
	Liệt kê Pull Request theo trạng thái (open/merged/closed).
	pull_requests
	SELECT với ENUM filter
	Nhóm 7 — Thống kê Dashboard
	UC21
	Xem thống kê tổng quan
	Hiển thị số liệu tổng hợp của repository: tổng commit, issue đang mở, commit mới nhất.
	repo_stats
	Phi chuẩn hóa (Denormalization), cache số liệu tổng hợp


1.4. Mô tả chi tiết các chức năng quan trọng
Phần này trình bày chi tiết năm chức năng có kỹ thuật cơ sở dữ liệu đặc thù, thể hiện chiều sâu thiết kế của hệ thống GitMini.


a) UC08 — Tạo commit mới
Mô tả nghiệp vụ: Khi một developer hoàn thành một phiên làm việc, họ cần ghi nhận trạng thái hiện tại của mã nguồn vào hệ thống dưới dạng một commit. Commit mới phải được liên kết chính xác với commit cha (parent), đồng thời con trỏ của nhánh hiện tại phải được cập nhật để trỏ đến commit vừa tạo. Đây là thao tác quan trọng nhất của hệ thống, yêu cầu tính nguyên tử tuyệt đối: hoặc toàn bộ các bước đều thành công, hoặc hệ thống phải khôi phục về trạng thái ban đầu.


Luồng xử lý:
1. Nhận thông tin đầu vào từ người dùng: repo_id, branch_name, nội dung commit, danh sách file thay đổi.
2. Bắt đầu Transaction (BEGIN).
3. Tính toán commit_hash (SHA-1) từ nội dung commit.
4. INSERT bản ghi mới vào bảng commits với các thuộc tính: commit_hash, repo_id, author_id, message, timestamp.
5. INSERT bản ghi vào bảng commit_parents để thiết lập quan hệ cha-con giữa commit mới và commit cha hiện tại.
6. UPDATE bảng branches: cập nhật trường head_commit_hash trỏ đến commit vừa tạo.
7. UPDATE bảng repo_stats: tăng commit_count và cập nhật latest_commit_hash.
8. Nếu tất cả các bước thành công: COMMIT Transaction. Nếu bất kỳ bước nào thất bại: ROLLBACK toàn bộ để đảm bảo tính nhất quán.


Kỹ thuật CSDL sử dụng:

* Transaction ACID (Atomicity, Consistency, Isolation, Durability): đảm bảo thao tác ghi dữ liệu vào nhiều bảng xảy ra nguyên tử, không để cơ sở dữ liệu ở trạng thái không nhất quán.
* Cơ chế ROLLBACK tự động: nếu bất kỳ câu lệnh nào trong transaction thất bại (vi phạm ràng buộc, lỗi kết nối...), toàn bộ thay đổi bị hủy bỏ.


Lý do cần kỹ thuật này:
Nếu không dùng Transaction, có thể xảy ra tình huống commit được INSERT thành công nhưng branches chưa kịp UPDATE (do lỗi giữa chừng), dẫn đến con trỏ nhánh trỏ sai commit — một lỗi dữ liệu nghiêm trọng không thể phát hiện bằng mắt thường.


b) UC09 — Xem lịch sử commit của một branch
Mô tả nghiệp vụ: Người dùng muốn xem toàn bộ chuỗi lịch sử thay đổi mã nguồn của một nhánh, từ commit mới nhất (HEAD) ngược về commit khởi tạo ban đầu (root). Do lịch sử commit có cấu trúc đồ thị DAG (không phải danh sách tuyến tính đơn giản), việc duyệt lịch sử đòi hỏi kỹ thuật truy vấn đệ quy đặc biệt.


Luồng xử lý:
1. Tra cứu bảng branches theo repo_id và branch_name để lấy head_commit_hash (điểm bắt đầu duyệt).
2. Khởi tạo phần anchor của Recursive CTE với commit tại HEAD.
3. Phần đệ quy JOIN với bảng commit_parents và commits để lấy commit cha của từng commit trong tập kết quả hiện tại.
4. Lặp đệ quy cho đến khi không còn commit cha nào (tức là đã đến root commit).
5. Trả về tập kết quả đã sắp xếp theo timestamp giảm dần để hiển thị.


Kỹ thuật CSDL sử dụng:
* Recursive CTE (WITH RECURSIVE): cho phép định nghĩa truy vấn tự tham chiếu trong SQL, duyệt qua cấu trúc đồ thị DAG mà không cần vòng lặp ở tầng ứng dụng.
* JOIN với bảng commit_parents: mối quan hệ cha-con nhiều-nhiều giữa các commit được biểu diễn qua bảng trung gian này.


Lý do cần kỹ thuật này:
Với cấu trúc DAG, độ sâu của cây commit là không xác định trước. Nếu xử lý ở tầng ứng dụng (application-level loop), mỗi bước cần một round-trip đến database, gây ra hiện tượng N+1 query cực kỳ kém hiệu năng với repository lớn. Recursive CTE đẩy toàn bộ logic duyệt đồ thị xuống engine của PostgreSQL, chỉ cần một lần kết nối duy nhất.


c) UC16 — Tìm kiếm issue theo từ khóa
Mô tả nghiệp vụ: Người dùng nhập một hoặc nhiều từ khóa vào ô tìm kiếm để tìm các issue có liên quan theo tiêu đề hoặc nội dung mô tả chi tiết. Hệ thống phải hỗ trợ tìm kiếm ngôn ngữ tự nhiên, xử lý được các biến thể từ (stemming), và trả về kết quả theo mức độ liên quan (relevance ranking).


Luồng xử lý:
1. Nhận chuỗi từ khóa đầu vào từ người dùng.
2. Chuyển đổi chuỗi từ khóa thành tsquery (text search query) theo cú pháp PostgreSQL Full-text Search.
3. Tìm kiếm trên tsvector đã được tính toán sẵn từ cột title và body của bảng issues (sử dụng hàm to_tsvector).
4. Chỉ mục GIN trên tsvector được khai thác để tăng tốc độ tra cứu, tránh sequential scan.
5. Xếp hạng kết quả theo hàm ts_rank() và trả về theo thứ tự giảm dần của điểm relevance.


Kỹ thuật CSDL sử dụng:
* Full-text Search (FTS): tính năng tìm kiếm văn bản nâng cao của PostgreSQL, hỗ trợ stemming, stop words, và weighted ranking.
* GIN Index (Generalized Inverted Index): loại chỉ mục tối ưu cho tìm kiếm full-text, lưu trữ mapping từ các lexeme về danh sách document ID chứa chúng.
* Tìm kiếm đa trường (multi-field search): kết hợp vector tìm kiếm từ cả hai cột title và body với trọng số khác nhau (title có độ ưu tiên cao hơn body).


Lý do cần kỹ thuật này:

Tìm kiếm bằng LIKE '%keyword%' không thể tận dụng chỉ mục B-tree thông thường và phải thực hiện sequential scan trên toàn bảng, rất chậm khi số lượng issue lớn. GIN Index cho phép tìm kiếm trong thời gian gần như hằng số bất kể kích thước bảng.


d) UC19 — Merge Pull Request
Mô tả nghiệp vụ: Khi một Reviewer chấp thuận Pull Request, hệ thống cần thực hiện hợp nhất mã nguồn từ nhánh nguồn (source branch) vào nhánh đích (target branch). Thao tác này tạo ra một merge commit đặc biệt có hai nhánh cha, đồng thời cập nhật trạng thái của Pull Request và con trỏ nhánh đích. Đây là thao tác có độ phức tạp transaction cao nhất trong toàn hệ thống.


Luồng xử lý:
1. Tra cứu head_commit_hash của nhánh nguồn (source_head) và nhánh đích (target_head).
2. Bắt đầu Transaction (BEGIN).
3. Tạo merge commit: INSERT vào bảng commits với thông điệp hợp nhất, tạo commit_hash mới.
4. INSERT hai bản ghi vào bảng commit_parents: liên kết merge commit với source_head (parent 1) và target_head (parent 2).
5. UPDATE bảng branches: cập nhật head_commit_hash của nhánh đích sang merge commit mới.
6. UPDATE bảng pull_requests: đặt status = 'merged' và ghi lại merged_at timestamp.
7. UPDATE bảng repo_stats: tăng commit_count và cập nhật latest_commit_hash.
8. COMMIT Transaction nếu toàn bộ thành công; ROLLBACK nếu bất kỳ bước nào thất bại.


Kỹ thuật CSDL sử dụng:
* Transaction ACID với nhiều bảng: đảm bảo 4 bảng (commits, commit_parents, branches, pull_requests) được cập nhật đồng bộ hoặc không cập nhật gì cả.
* Merge commit hai parent: cấu trúc bảng commit_parents với thiết kế nhiều-nhiều cho phép một commit có nhiều hơn một parent, đây là điểm khác biệt then chốt so với commit thông thường.
* Pessimistic Locking (SELECT FOR UPDATE): khóa các bản ghi branches và pull_requests trước khi cập nhật để tránh race condition khi nhiều reviewer merge đồng thời.


Lý do cần kỹ thuật này:
Merge Pull Request là thao tác không thể chia cắt: nếu con trỏ nhánh đích được cập nhật nhưng status của Pull Request chưa kịp đổi sang 'merged' (do lỗi), hệ thống sẽ ở trạng thái không nhất quán — nhánh đã được merge nhưng Pull Request vẫn hiển thị là 'open'. Transaction đảm bảo điều này không xảy ra trong bất kỳ tình huống lỗi nào.


e) UC21 — Xem thống kê tổng quan (Dashboard)
Mô tả nghiệp vụ: Trang tổng quan của mỗi repository cần hiển thị ngay lập tức các số liệu thống kê: tổng số commit, số issue đang mở, commit mới nhất. Nếu tính toán theo thời gian thực bằng cách COUNT trên bảng commits và issues, mỗi lần tải trang sẽ tốn rất nhiều tài nguyên, đặc biệt với các repository có hàng triệu commit.


Luồng xử lý:
1. Người dùng truy cập trang chi tiết repository.
2. Hệ thống truy vấn trực tiếp bảng repo_stats theo repo_id (single-row lookup, rất nhanh).
3. Các giá trị commit_count, issue_open_count, latest_commit_hash được đọc từ bảng cache và hiển thị ngay.
4. Bảng repo_stats được cập nhật tự động sau mỗi thao tác tạo commit (UC08), merge PR (UC19), tạo/đóng issue (UC14, UC17).


Kỹ thuật CSDL sử dụng:
* Phi chuẩn hóa có kiểm soát (Controlled Denormalization): bảng repo_stats không phải là một thực thể nghiệp vụ độc lập mà là bảng cache lưu trữ dữ liệu tổng hợp đã được tính toán trước, vi phạm chuẩn 3NF một cách có chủ đích.
* Write-through cache pattern: mỗi thao tác ghi vào bảng gốc (commits, issues) đều kéo theo cập nhật đồng bộ vào repo_stats trong cùng một transaction.
* Primary Key lookup: truy vấn repo_stats chỉ cần tìm theo repo_id (khóa chính), đảm bảo thời gian truy xuất O(log n) hoặc O(1) tùy cấu hình index.


Lý do cần kỹ thuật này:

Truy vấn thời gian thực COUNT(*) FROM commits WHERE repo_id = X với repository có hàng triệu commit sẽ mất hàng giây dù có index tốt. Ngược lại, SELECT commit_count FROM repo_stats WHERE repo_id = X luôn trả về kết quả trong vài millisecond. Đây là sự đánh đổi (trade-off) được chấp nhận trong thiết kế hệ thống: hy sinh một chút tính nhất quán tức thời (eventual consistency) để đổi lấy hiệu năng đọc vượt trội.


GitMini — Báo cáo Bài tập lớn | Quản trị Cơ sở Dữ liệu Nâng cao

