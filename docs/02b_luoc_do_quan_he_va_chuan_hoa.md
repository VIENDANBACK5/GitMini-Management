Source: https://docs.google.com/document/d/1ulJcVi8HE7hnGbc26_AOQedsqyDXlQlW/export?format=txt

---

﻿BÁO CÁO BÀI TẬP LỚN
GitMini — Hệ thống Quản lý và Lưu trữ Mã nguồn Tập trung


2b. Xây dựng Lược đồ Quan hệ và Chuẩn hóa Lược đồ
PHẦN A — Lược đồ Logic
A.1. Giới thiệu
Lược đồ logic (Logical Schema) là kết quả của bước chuyển hóa từ mô hình thực thể-quan hệ (ER Model) sang mô hình quan hệ (Relational Model). Tại giai đoạn này, mỗi thực thể và mỗi mối quan hệ được ánh xạ thành một quan hệ (relation) cụ thể với tập thuộc tính, khóa chính và khóa ngoại xác định. Lược đồ logic là cơ sở trực tiếp để triển khai cấu trúc bảng trên hệ quản trị cơ sở dữ liệu PostgreSQL 15+.
Trong phần này, lược đồ logic của GitMini được trình bày với các quy ước ký hiệu thống nhất: thuộc tính khóa chính được gạch dưới (__pk__), thuộc tính khóa ngoại được in nghiêng (*fk*), ký hiệu → biểu diễn phụ thuộc hàm (functional dependency), và ký hiệu {A, B} → C biểu diễn tập thuộc tính xác định.


A.2. Lược đồ Logic — 20 Quan hệ
(1) USERS
users(id, username, email, password_hash, full_name, bio,       avatar_url, is_active, created_at, updated_at)
Khóa chính: id   |   Khóa dự tuyển: username, email
(2) REPOSITORIES
repositories(id, name, description, owner_id, is_private, default_branch,              stars_count, forks_count, created_at, updated_at)
FK: owner_id → users(id)  ON DELETE CASCADE
UNIQUE: (owner_id, name)
(3) COMMITS
commits(commit_hash, repo_id, author_id, message, created_at)
FK: repo_id → repositories(id)  ON DELETE CASCADE
FK: author_id → users(id)  ON DELETE SET NULL
(4) COMMIT_PARENTS
commit_parents(commit_hash, parent_hash, ordinal)
Khóa chính ghép: (commit_hash, parent_hash)
FK: commit_hash → commits(commit_hash)  ON DELETE CASCADE
FK: parent_hash → commits(commit_hash)  ON DELETE CASCADE
(5) BRANCHES
branches(id, repo_id, name, head_commit_hash, is_protected, created_at, updated_at)
FK: repo_id → repositories(id)  ON DELETE CASCADE
FK: head_commit_hash → commits(commit_hash)  ON DELETE SET NULL
UNIQUE: (repo_id, name)
(6) ISSUES
issues(id, repo_id, author_id, assignee_id, title, body, status,        labels, created_at, updated_at, closed_at)
FK: repo_id → repositories(id)  ON DELETE CASCADE
FK: author_id → users(id)  ON DELETE SET NULL
FK: assignee_id → users(id)  ON DELETE SET NULL
(7) PULL_REQUESTS
pull_requests(id, repo_id, author_id, title, body, status,              source_branch, target_branch, merge_commit_hash,              created_at, updated_at, merged_at, closed_at)
FK: repo_id → repositories(id)  ON DELETE CASCADE
FK: author_id → users(id)  ON DELETE SET NULL
FK: merge_commit_hash → commits(commit_hash)  ON DELETE SET NULL
(8) REPO_STATS
repo_stats(repo_id, commit_count, branch_count, issue_open_count,           issue_closed_count, pr_open_count, pr_merged_count,           latest_commit_hash, latest_commit_time, latest_commit_msg, updated_at)
FK: repo_id → repositories(id)  ON DELETE CASCADE   [Bảng phi chuẩn hóa]
(9) REPO_MEMBERS
repo_members(repo_id, user_id, role, joined_at)
PK: (repo_id, user_id); FK repo_id → repositories(id); FK user_id → users(id)
(10) PULL_REQUEST_REVIEWS
pull_request_reviews(id, pull_request_id, reviewer_id, status, created_at)
FK: pull_request_id → pull_requests(id); FK reviewer_id → users(id); UNIQUE(pull_request_id, reviewer_id)
(11) AUDIT_LOGS
audit_logs(id, actor_id, repo_id, action, target_type, target_id, metadata, created_at)
FK: actor_id → users(id); FK repo_id → repositories(id)
(12) FILE_BLOBS
file_blobs(id, blob_hash, content, size_bytes, mime_type, created_at)
UQ: blob_hash; CK: size_bytes >= 0
(13) COMMIT_FILES
commit_files(commit_hash, file_path, blob_id, change_type, additions, deletions)
PK: (commit_hash, file_path); FK commit_hash → commits(commit_hash); FK blob_id → file_blobs(id)
(14) REPOSITORY_LANGUAGES
repository_languages(repo_id, language, bytes_count, percentage)
PK: (repo_id, language); FK repo_id → repositories(id); CK percentage 0..100
(15) TAGS
tags(id, repo_id, name, target_commit_hash, created_by, created_at)
FK: repo_id → repositories(id); FK target_commit_hash → commits(commit_hash); UNIQUE(repo_id, name)
(16) RELEASES
releases(id, repo_id, tag_id, title, description, is_prerelease, published_by, published_at)
FK: repo_id → repositories(id); FK tag_id → tags(id); FK published_by → users(id)
(17) ISSUE_COMMENTS
issue_comments(id, issue_id, author_id, body, created_at, updated_at)
FK: issue_id → issues(id); FK author_id → users(id)
(18) PULL_REQUEST_COMMENTS
pull_request_comments(id, pull_request_id, author_id, body, file_path, line_number, created_at, updated_at)
FK: pull_request_id → pull_requests(id); FK author_id → users(id); CK line_number > 0 nếu có
(19) CI_RUNS
ci_runs(id, repo_id, commit_hash, pull_request_id, status, started_at, finished_at, metadata)
FK: repo_id → repositories(id); FK commit_hash → commits(commit_hash); FK pull_request_id → pull_requests(id)
(20) BACKUP_JOBS
backup_jobs(id, job_type, status, backup_path, started_at, finished_at, metadata)
CK: job_type IN full/restore_test; status IN running/success/failed


A.3. Sơ đồ Quan hệ giữa các Bảng
Bảng dưới đây tóm tắt toàn bộ các mối quan hệ khóa ngoại trong lược đồ GitMini, bao gồm kiểu quan hệ và chiến lược xử lý khi bản ghi cha bị xóa:


Bảng con
	Khóa ngoại
	Bảng cha
	Kiểu quan hệ
	Hành động khi xóa
	repositories
	owner_id
	users
	N:1
	CASCADE — Xóa user xóa toàn bộ repo
	commits
	repo_id
	repositories
	N:1
	CASCADE — Xóa repo xóa toàn bộ commit
	commits
	author_id
	users
	N:1
	SET NULL — Giữ commit, author_id = NULL
	commit_parents
	commit_hash
	commits
	N:N (self)
	CASCADE — Xóa commit xóa quan hệ cha-con
	commit_parents
	parent_hash
	commits
	N:N (self)
	CASCADE — Xóa commit cha xóa quan hệ
	branches
	repo_id
	repositories
	N:1
	CASCADE — Xóa repo xóa toàn bộ nhánh
	branches
	head_commit_hash
	commits
	N:1
	SET NULL — Giữ nhánh, HEAD = NULL
	issues
	repo_id
	repositories
	N:1
	CASCADE — Xóa repo xóa toàn bộ issue
	issues
	author_id
	users
	N:1
	SET NULL — Giữ issue, author = NULL
	issues
	assignee_id
	users
	N:1
	SET NULL — Giữ issue, assignee = NULL
	pull_requests
	repo_id
	repositories
	N:1

CASCADE — Xóa repo xóa toàn bộ PR
	pull_requests
	author_id
	users
	N:1
	SET NULL — Giữ PR, author = NULL
	pull_requests
	merge_commit_hash
	commits
	N:1
	SET NULL — Giữ PR, commit hash = NULL
	repo_stats
	repo_id
	repositories
	1:1
	CASCADE — Xóa repo xóa thống kê tương ứng




PHẦN B — Chuẩn hóa Lược đồ (3NF)
B.1. Lý thuyết Chuẩn hóa — Tóm tắt
Phụ thuộc hàm (Functional Dependency)
Cho lược đồ quan hệ R(U) với U là tập thuộc tính. Phụ thuộc hàm X → Y (X xác định Y) có nghĩa là: với mọi hai bộ giá trị (tuple) t₁, t₂ trong R, nếu t₁[X] = t₂[X] thì t₁[Y] = t₂[Y]. Nói cách khác, giá trị của tập thuộc tính X quyết định duy nhất giá trị của tập thuộc tính Y. Phụ thuộc hàm là nền tảng để phân tích và đánh giá mức độ chuẩn hóa của lược đồ quan hệ.


Dạng chuẩn 1 (First Normal Form — 1NF)
Một quan hệ đạt 1NF khi và chỉ khi tất cả các thuộc tính đều có giá trị nguyên tử (atomic) — tức là không có thuộc tính đa trị hay thuộc tính phức hợp lồng nhau. Mỗi ô trong bảng chứa đúng một giá trị duy nhất, không thể chia nhỏ hơn.
Ví dụ vi phạm: Nếu cột phone lưu '0912345, 0987654' (hai số điện thoại trong một ô) thì vi phạm 1NF. Khắc phục: tách ra bảng riêng hoặc dùng kiểu mảng gốc của PostgreSQL.


Dạng chuẩn 2 (Second Normal Form — 2NF)
Một quan hệ đạt 2NF khi đã đạt 1NF và mọi thuộc tính không khóa (non-key attribute) đều phụ thuộc hàm đầy đủ (full functional dependency) vào toàn bộ khóa chính — tức là không tồn tại phụ thuộc bộ phận (partial dependency). Điều kiện này chỉ có ý nghĩa khi khóa chính là khóa ghép (composite key); nếu khóa chính là đơn thì lược đồ tự động đạt 2NF.
Ví dụ vi phạm: Trong bảng ENROLLMENT(__student_id__, __course_id__, student_name), student_name chỉ phụ thuộc vào student_id, không phụ thuộc vào course_id — đây là phụ thuộc bộ phận, vi phạm 2NF. Khắc phục: tách student_name sang bảng STUDENTS.


Dạng chuẩn 3 (Third Normal Form — 3NF)
Một quan hệ đạt 3NF khi đã đạt 2NF và không tồn tại phụ thuộc bắc cầu (transitive dependency): không có thuộc tính không khóa nào phụ thuộc vào một thuộc tính không khóa khác. Cụ thể: nếu X → Y và Y → Z trong đó Y không phải là siêu khóa (superkey), thì Z vi phạm 3NF (vì Z phụ thuộc bắc cầu qua Y vào X).
Ví dụ vi phạm: Trong bảng EMPLOYEE(__emp_id__, dept_id, dept_name), dept_id → dept_name tạo ra phụ thuộc bắc cầu emp_id → dept_id → dept_name. Khắc phục: tách dept_name sang bảng DEPARTMENT.


B.2. Chứng minh đạt 3NF cho từng quan hệ
▶ Bảng: USERS
Khóa chính: id (SERIAL, đơn)
Tập phụ thuộc hàm F:
id → username, email, password_hash, full_name, bio, avatar_url, is_active, created_at, updated_at
username → id, email          (username là khóa dự tuyển UNIQUE)
email → id, username          (email là khóa dự tuyển UNIQUE)
✓ Đạt 1NF: Tất cả thuộc tính (username, email, password_hash...) đều là nguyên tử, không có đa trị hay lồng nhau.
✓ Đạt 2NF: Khóa chính là đơn (id), nên không thể có phụ thuộc bộ phận. Mọi thuộc tính đều phụ thuộc đầy đủ vào id.
✓ Đạt 3NF: Không tồn tại phụ thuộc bắc cầu: id → username (khóa dự tuyển, là siêu khóa) và id → email (khóa dự tuyển, là siêu khóa). Không có thuộc tính không khóa nào xác định thuộc tính không khóa khác.
▶ Bảng: REPOSITORIES
Khóa chính: id (SERIAL, đơn)  |  Khóa dự tuyển bổ sung: (owner_id, name)
Tập phụ thuộc hàm F:
id → name, description, owner_id, is_private, default_branch, stars_count, forks_count, created_at, updated_at
{owner_id, name} → id          (ràng buộc UNIQUE composite)
✓ Đạt 1NF: Tất cả thuộc tính đều là nguyên tử. Cột description là TEXT đơn giản, không phải cấu trúc lồng nhau.

✓ Đạt 2NF: Khóa chính là đơn (id), tự đạt 2NF. Cột owner_id là khóa ngoại tham chiếu sang bảng users — thông tin chi tiết của owner (username, email...) không nằm trong bảng này.
✓ Đạt 3NF: Không có phụ thuộc bắc cầu: id → owner_id, nhưng owner_id không xác định thêm thuộc tính nào trong bảng repositories (owner_name, owner_email... không tồn tại ở đây). Việc tách bảng users ra riêng chính là cách loại bỏ phụ thuộc bắc cầu tiềm năng này.
▶ Bảng: COMMITS
Khóa chính: commit_hash (CHAR(40), đơn — SHA-1 hash)
Tập phụ thuộc hàm F:
commit_hash → repo_id, author_id, message, created_at
✓ Đạt 1NF: Tất cả thuộc tính đều nguyên tử. message là TEXT đơn, author_id và repo_id là FK số nguyên.
✓ Đạt 2NF: Khóa chính là đơn (commit_hash), tự đạt 2NF. Không thể có phụ thuộc bộ phận khi khóa không ghép.
✓ Đạt 3NF: commit_hash → repo_id, nhưng repo_id → repo_name KHÔNG TỒN TẠI trong bảng này (repo_name đã được tách sang bảng repositories). Tương tự, commit_hash → author_id, nhưng author_id → username KHÔNG TỒN TẠI ở đây. Không có phụ thuộc bắc cầu nào vì thông tin chi tiết của repo và user đã được tách bảng đúng chuẩn.
▶ Bảng: COMMIT_PARENTS
Khóa chính: (commit_hash, parent_hash) — Khóa chính ghép (Composite PK)
Tập phụ thuộc hàm F:
{commit_hash, parent_hash} → ordinal
commit_hash → (không xác định được ordinal độc lập)
parent_hash → (không xác định được ordinal độc lập)
✓ Đạt 1NF: Bảng chỉ gồm 3 thuộc tính: commit_hash, parent_hash (đều là CHAR(40)), và ordinal (INT). Tất cả đều nguyên tử.
✓ Đạt 2NF: Khóa chính là ghép (commit_hash, parent_hash). Thuộc tính không khóa duy nhất là ordinal. Ordinal biểu thị thứ tự của parent trong ngữ cảnh của một cặp (commit_hash, parent_hash) cụ thể, không thể xác định bằng chỉ commit_hash hoặc chỉ parent_hash riêng lẻ. Do đó không có phụ thuộc bộ phận. Đây là điểm đặc biệt nhất của bảng này: chứng minh 2NF cho khóa ghép.
✓ Đạt 3NF: Chỉ có một thuộc tính không khóa (ordinal) và ordinal là giá trị nguyên — không xác định bất kỳ thuộc tính nào khác. Không tồn tại chuỗi phụ thuộc bắc cầu nào.
▶ Bảng: BRANCHES
Khóa chính: id (SERIAL, đơn)  |  Khóa dự tuyển: (repo_id, name)
Tập phụ thuộc hàm F:
id → repo_id, name, head_commit_hash, is_protected, created_at, updated_at
{repo_id, name} → id          (ràng buộc UNIQUE composite)
✓ Đạt 1NF: Tất cả thuộc tính đều nguyên tử. name là VARCHAR, head_commit_hash là CHAR(40), các cột còn lại là kiểu cơ bản.
✓ Đạt 2NF: Khóa chính là đơn (id), tự đạt 2NF.
✓ Đạt 3NF: id → head_commit_hash, nhưng head_commit_hash → message (thông tin chi tiết commit) KHÔNG TỒN TẠI trong bảng branches. Tương tự, id → repo_id, nhưng repo_id → repo_name KHÔNG TỒN TẠI ở đây. Tất cả thông tin chi tiết đã được tách sang bảng tương ứng. Không có phụ thuộc bắc cầu.
▶ Bảng: ISSUES
Khóa chính: id (SERIAL, đơn)
Tập phụ thuộc hàm F:
id → repo_id, author_id, assignee_id, title, body, status, labels, created_at, updated_at, closed_at
✓ Đạt 1NF: Tất cả thuộc tính đều nguyên tử. Cột labels dùng kiểu TEXT[] (mảng gốc PostgreSQL) — đây là trường hợp đặc biệt cho phép trong thiết kế hiện đại, không vi phạm 1NF theo định nghĩa mở rộng khi các phần tử mảng là nguyên tử đồng nhất.
✓ Đạt 2NF: Khóa chính là đơn (id), tự đạt 2NF.
✓ Đạt 3NF: id → status (giá trị ENUM 'open'/'closed'), nhưng status không xác định thêm bất kỳ thuộc tính nào khác trong bảng. id → author_id, nhưng thông tin chi tiết của author (username...) không có ở đây. id → repo_id, nhưng thông tin chi tiết repo không có ở đây. Không có phụ thuộc bắc cầu.
▶ Bảng: PULL_REQUESTS
Khóa chính: id (SERIAL, đơn)
Tập phụ thuộc hàm F:
id → repo_id, author_id, title, body, status, source_branch, target_branch,

merge_commit_hash, created_at, updated_at, merged_at, closed_at
✓ Đạt 1NF: Tất cả thuộc tính đều nguyên tử. source_branch và target_branch là VARCHAR lưu tên nhánh dạng chuỗi thuần túy, không phải FK.
✓ Đạt 2NF: Khóa chính là đơn (id), tự đạt 2NF.
✓ Đạt 3NF: id → merge_commit_hash, nhưng thông tin chi tiết merge commit (message, author...) không có trong bảng này. id → source_branch (chuỗi tên nhánh), nhưng source_branch không xác định thêm gì cả — đây không phải FK, chỉ là chuỗi tên lưu tham chiếu lịch sử. id → status, status không xác định thêm thuộc tính nào. Không có phụ thuộc bắc cầu.




B.3. Trường hợp đặc biệt: REPO_STATS — Phi chuẩn hóa có kiểm soát
Phân tích vi phạm 3NF (về mặt lý thuyết):
Bảng repo_stats chứa các cột latest_commit_hash, latest_commit_time và latest_commit_msg. Xét các phụ thuộc hàm sau:
repo_id → latest_commit_hash
latest_commit_hash → latest_commit_time   (vì commit_hash → created_at trong bảng commits)
latest_commit_hash → latest_commit_msg    (vì commit_hash → message trong bảng commits)


Chuỗi phụ thuộc repo_id → latest_commit_hash → latest_commit_time tạo ra phụ thuộc bắc cầu điển hình: latest_commit_hash là thuộc tính không khóa, nhưng lại xác định thuộc tính không khóa khác (latest_commit_time, latest_commit_msg). Theo định nghĩa nghiêm ngặt, đây là vi phạm 3NF. Ngoài ra, các cột commit_count, issue_open_count... là dữ liệu dẫn xuất (derived data) có thể tính lại từ các bảng gốc bằng câu lệnh COUNT, tức là vi phạm tính dư thừa dữ liệu.


Quyết định thiết kế: Intentional Denormalization
Đây là kỹ thuật phi chuẩn hóa có chủ ý (Controlled Denormalization) — một quyết định kỹ thuật hợp lý và phổ biến trong thiết kế hệ thống hiệu năng cao. Lý do chấp nhận vi phạm 3NF tại bảng này được lập luận như sau:


Nếu tuân thủ 3NF nghiêm ngặt
	Với Denormalization (repo_stats)
	Mỗi lần tải dashboard: chạy COUNT(*) trên bảng commits, issues, pull_requests
	Mỗi lần tải dashboard: đọc 1 bản ghi từ repo_stats theo PK
	Thời gian truy vấn: ~245ms với repository lớn (hàng triệu commit)
	Thời gian truy vấn: ~1ms (Primary Key lookup)
	Không cần cập nhật thêm bảng phụ khi ghi dữ liệu
	Mỗi thao tác ghi phải cập nhật thêm repo_stats (chi phí ghi tăng nhẹ)
	Dữ liệu luôn nhất quán tức thì (strong consistency)
	Nhất quán trong phạm vi transaction (nhờ TRIGGER), nhất quán tức thì theo giao dịch


Cơ chế đảm bảo tính nhất quán:
Để giảm thiểu rủi ro dữ liệu không đồng bộ, GitMini sử dụng PostgreSQL TRIGGER — một thủ tục được thực thi tự động sau mỗi thao tác INSERT/UPDATE trên các bảng commits, issues, branches và pull_requests. Trigger này cập nhật đồng bộ các giá trị tương ứng trong repo_stats trong cùng một transaction với thao tác ghi chính. Nhờ cơ chế ACID của PostgreSQL, nếu trigger thất bại, toàn bộ transaction sẽ bị ROLLBACK — không bao giờ xảy ra tình huống bảng gốc được cập nhật nhưng repo_stats không được cập nhật.


Kết luận về repo_stats:
Bảng repo_stats là vi phạm 3NF có chủ đích (intentional denormalization), không phải lỗi thiết kế. Kỹ thuật này được sử dụng rộng rãi trong các hệ thống thực tế hiệu năng cao (ví dụ: GitHub lưu star_count trực tiếp trong bảng repositories, không COUNT mỗi lần). Đây là sự đánh đổi (trade-off) hợp lý: hy sinh một phần tính thuần nhất lý thuyết để đổi lấy hiệu năng đọc vượt trội, đồng thời vẫn đảm bảo tính nhất quán trong phạm vi giao dịch nhờ cơ chế Trigger.




B.4. Kết luận Chuẩn hóa

Toàn bộ lược đồ GitMini gồm 7 quan hệ nghiệp vụ (users, repositories, commits, commit_parents, branches, issues, pull_requests) đều đạt Dạng chuẩn 3 (3NF). Kết quả này đạt được một cách tự nhiên nhờ nguyên tắc thiết kế nhất quán: mỗi thực thể được tách thành bảng riêng, các mối quan hệ được biểu diễn thông qua khóa ngoại thay vì lưu dữ liệu trùng lặp. Đặc biệt, bảng commit_parents với khóa chính ghép (composite PK) đạt 2NF nhờ thuộc tính ordinal phụ thuộc hàm đầy đủ vào cả hai thành phần của khóa, không phụ thuộc bộ phận vào từng thành phần riêng lẻ.
Trường hợp ngoại lệ duy nhất là bảng repo_stats — vi phạm 3NF có chủ ý theo kỹ thuật Controlled Denormalization. Quyết định này được đưa ra có cơ sở kỹ thuật rõ ràng, với cơ chế TRIGGER đảm bảo tính nhất quán trong giao dịch. Đây là minh chứng cho quan điểm thiết kế cơ sở dữ liệu thực tế: chuẩn hóa là nguyên tắc nền tảng, nhưng không phải là mục tiêu tuyệt đối — cần đánh đổi có lý khi đòi hỏi hiệu năng đặt ra yêu cầu bắt buộc.


GitMini — Báo cáo Bài tập lớn | Quản trị Cơ sở Dữ liệu Nâng cao

