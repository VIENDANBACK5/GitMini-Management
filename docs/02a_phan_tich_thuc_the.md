Source: https://docs.google.com/document/d/1Hg0FwMqXY_ooULA6uLsb5LBqG71n6fIG/export?format=txt

---

﻿BÁO CÁO BÀI TẬP LỚN
GitMini — Hệ thống Quản lý và Lưu trữ Mã nguồn Tập trung


2. Tài liệu Thiết kế Cơ sở Dữ liệu
2a. Phân tích thực thể
Hệ thống GitMini được xây dựng trên nền tảng 8 thực thể chính, trong đó 7 thực thể phản ánh các đối tượng nghiệp vụ thực tế (users, repositories, commits, commit_parents, branches, issues, pull_requests) và 1 thực thể kỹ thuật (repo_stats) được tạo ra nhằm mục đích tối ưu hiệu năng truy vấn thông qua kỹ thuật phi chuẩn hóa có kiểm soát. Điểm đặc trưng nổi bật nhất của thiết kế này là việc sử dụng cấu trúc Đồ thị có hướng không chu trình (DAG — Directed Acyclic Graph) để biểu diễn lịch sử commit, thay vì cấu trúc danh sách liên kết đơn tuyến tính thông thường. Cấu trúc DAG được hiện thực hóa thông qua bảng commit_parents độc lập, cho phép mỗi commit có thể có nhiều commit cha — điều này là bắt buộc để hỗ trợ merge commit trong quy trình làm việc nhiều nhánh. Ngoài ra, thiết kế cũng áp dụng nguyên tắc phi chuẩn hóa có chủ ý tại bảng repo_stats để đảm bảo hiệu năng cao cho các truy vấn đọc trên dashboard, chấp nhận sự đánh đổi với chi phí cập nhật bổ sung tại các thao tác ghi.




1. Thực thể USERS
Mô tả:
Thực thể users đại diện cho tài khoản người dùng trong hệ thống GitMini. Mỗi bản ghi trong bảng này tương ứng với một cá nhân hoặc tổ chức đã đăng ký sử dụng hệ thống. Người dùng là điểm khởi đầu của hầu hết các luồng nghiệp vụ: họ sở hữu repository, thực hiện commit, báo cáo issue và gửi pull request. Thực thể này lưu trữ cả thông tin xác thực (credentials) lẫn thông tin hồ sơ cá nhân (profile), trong đó mật khẩu được lưu dưới dạng băm bcrypt để đảm bảo an toàn bảo mật.


Thuộc tính:
Tên cột
	Kiểu dữ liệu
	Mô tả
	Ràng buộc
	id
	SERIAL
	Khóa chính tự tăng
	PRIMARY KEY
	username
	VARCHAR(50)
	Tên đăng nhập, định danh người dùng trong hệ thống
	NOT NULL, UNIQUE
	email
	VARCHAR(255)
	Địa chỉ email liên lạc và xác thực tài khoản
	NOT NULL, UNIQUE
	password_hash
	VARCHAR(255)
	Mật khẩu đã qua hàm băm bcrypt (không lưu plaintext)
	NOT NULL
	full_name
	VARCHAR(100)
	Họ và tên đầy đủ, dùng để hiển thị giao diện
	NULL (tùy chọn)
	bio
	TEXT
	Mô tả ngắn về cá nhân, hiển thị trên trang hồ sơ
	DEFAULT ''
	avatar_url
	VARCHAR(500)
	Đường dẫn đến ảnh đại diện của người dùng
	NULL (tùy chọn)
	is_active
	BOOLEAN
	Trạng thái tài khoản: TRUE = đang hoạt động, FALSE = bị khóa
	DEFAULT TRUE
	created_at
	TIMESTAMPTZ
	Thời điểm tạo tài khoản (có múi giờ)
	DEFAULT NOW()
	updated_at
	TIMESTAMPTZ
	Thời điểm cập nhật thông tin gần nhất
	DEFAULT NOW()


Ràng buộc toàn vẹn:
* UNIQUE(username): Không được phép tồn tại hai tài khoản có cùng tên đăng nhập trong toàn hệ thống.
* UNIQUE(email): Mỗi địa chỉ email chỉ được đăng ký cho một tài khoản duy nhất.
* NOT NULL(password_hash): Tài khoản bắt buộc phải có mật khẩu; không cho phép tài khoản không có thông tin xác thực.
* Chỉ mục idx_users_username và idx_users_email: tăng tốc các truy vấn đăng nhập và kiểm tra trùng tên khi đăng ký.


Quan hệ với các thực thể khác:
* 1 users SỞ HỮU N repositories (quan hệ 1:N — chủ sở hữu repository)
* 1 users TẠO N commits (quan hệ 1:N — tác giả commit)
* 1 users TẠO N issues (quan hệ 1:N — người báo cáo vấn đề)
* 1 users TẠO N pull_requests (quan hệ 1:N — người gửi yêu cầu merge)




2. Thực thể REPOSITORIES
Mô tả:

Thực thể repositories đại diện cho kho mã nguồn — đơn vị tổ chức trung tâm của toàn bộ hệ thống. Mỗi repository là không gian độc lập chứa toàn bộ lịch sử mã nguồn, các nhánh phát triển, danh sách vấn đề và pull request của một dự án phần mềm. Repository có thể ở chế độ công khai (public) hoặc riêng tư (private). Toàn bộ các thực thể quan trọng khác trong hệ thống đều có quan hệ trực tiếp với repositories, xác nhận vị trí trung tâm của thực thể này trong mô hình dữ liệu.


Thuộc tính:
Tên cột
	Kiểu dữ liệu
	Mô tả
	Ràng buộc
	id
	SERIAL
	Khóa chính tự tăng, định danh duy nhất cho mỗi repository
	PRIMARY KEY
	name
	VARCHAR(100)
	Tên repository (vd: gitmini-core, my-website)
	NOT NULL
	description
	TEXT
	Mô tả tóm tắt nội dung và mục đích của repository
	DEFAULT ''
	owner_id
	INT
	Tham chiếu đến chủ sở hữu trong bảng users
	NOT NULL, FK → users(id) ON DELETE CASCADE
	is_private
	BOOLEAN
	Chế độ hiển thị: FALSE = công khai, TRUE = riêng tư
	DEFAULT FALSE
	default_branch
	VARCHAR(100)
	Tên nhánh mặc định, thường là 'main' hoặc 'master'
	DEFAULT 'main'
	stars_count
	INT
	Số lượt người dùng đánh dấu yêu thích (cache)
	DEFAULT 0
	forks_count
	INT
	Số lượt sao chép repository (cache)
	DEFAULT 0
	created_at
	TIMESTAMPTZ
	Thời điểm tạo repository
	DEFAULT NOW()
	updated_at
	TIMESTAMPTZ
	Thời điểm cập nhật thông tin gần nhất
	DEFAULT NOW()


Ràng buộc toàn vẹn:
* UNIQUE(owner_id, name): Ràng buộc composite đảm bảo trong phạm vi của cùng một chủ sở hữu, không tồn tại hai repository trùng tên. Các chủ sở hữu khác nhau hoàn toàn có thể có repository cùng tên.
* FK owner_id ON DELETE CASCADE: Khi một tài khoản người dùng bị xóa, toàn bộ repository thuộc sở hữu của tài khoản đó sẽ bị xóa theo.
* Chỉ mục idx_repos_owner (owner_id, created_at DESC): tối ưu truy vấn liệt kê repository của một người dùng, sắp xếp theo thời gian tạo mới nhất.
* Chỉ mục idx_repos_public (is_private, created_at DESC): tối ưu truy vấn khám phá repository công khai.


Quan hệ với các thực thể khác:
* N repositories THUỘC VỀ 1 users (quan hệ N:1 — chủ sở hữu)
* 1 repositories CHỨA N commits (quan hệ 1:N)
* 1 repositories CHỨA N branches (quan hệ 1:N)
* 1 repositories CHỨA N issues (quan hệ 1:N)
* 1 repositories CHỨA N pull_requests (quan hệ 1:N)
* 1 repositories CÓ 1 repo_stats (quan hệ 1:1 — bảng thống kê)




3. Thực thể COMMITS
Mô tả:
Thực thể commits là thực thể cốt lõi (core entity) quan trọng nhất của GitMini, đại diện cho một snapshot — ảnh chụp toàn bộ trạng thái mã nguồn tại một thời điểm cụ thể. Mỗi commit ghi lại: ai đã thực hiện thay đổi, khi nào, trong dự án nào, và với thông điệp mô tả gì. Đặc điểm then chốt phân biệt commits với các thực thể thông thường là tính bất biến tuyệt đối (immutability): một commit sau khi được tạo sẽ không bao giờ bị chỉnh sửa — đây là nguyên tắc nền tảng của mọi hệ thống quản lý phiên bản. Cơ chế quan hệ cha-con giữa các commit để tạo cấu trúc DAG được tách ra bảng commit_parents riêng biệt.


Thuộc tính:
Tên cột
	Kiểu dữ liệu
	Mô tả
	Ràng buộc
	commit_hash
	CHAR(40)
	Mã định danh SHA-1 duy nhất toàn cầu của commit (40 ký tự hex)
	PRIMARY KEY
	repo_id
	INT
	Repository chứa commit này
	NOT NULL, FK → repositories(id) ON DELETE CASCADE
	author_id
	INT
	Người thực hiện commit (tác giả)
	NOT NULL, FK → users(id) ON DELETE SET NULL
	message
	TEXT
	Nội dung mô tả mục đích và thay đổi của commit
	NOT NULL
	created_at
	TIMESTAMPTZ
	Thời điểm chính xác khi commit được tạo (có múi giờ)
	DEFAULT NOW()


Ràng buộc toàn vẹn:

* PRIMARY KEY (commit_hash): Toàn bộ hệ thống dùng giá trị SHA-1 40 ký tự làm khóa chính thay vì số nguyên tự tăng. Đây là quyết định thiết kế có chủ ý: SHA-1 hash được tính từ chính nội dung commit, đảm bảo tính toàn vẹn dữ liệu (nếu nội dung thay đổi, hash thay đổi). Ngoài ra, thiết kế này phù hợp với kiến trúc phân tán và sharding về sau.
* FK author_id ON DELETE SET NULL: Khi người dùng bị xóa, các commit của họ được giữ lại nhưng author_id được đặt về NULL, đảm bảo không mất lịch sử mã nguồn.
* Chỉ mục GIN trên to_tsvector(message): Hỗ trợ tìm kiếm toàn văn bản (Full-text Search) trên nội dung thông điệp commit với hiệu năng cao.


Quan hệ với các thực thể khác:
* N commits THUỘC VỀ 1 repositories (quan hệ N:1)
* N commits DO 1 users TẠO (quan hệ N:1 — tác giả)
* commits CÓ QUAN HỆ CHA-CON với nhau qua bảng commit_parents (quan hệ N:N tự tham chiếu)
* 1 commits ĐƯỢC TRỎ ĐẾN bởi N branches qua trường head_commit_hash (quan hệ 1:N ngược)


Ghi chú thiết kế:
* Tính bất biến (Immutability): Bảng commits không bao giờ có câu lệnh UPDATE hay DELETE trong các luồng nghiệp vụ thông thường. Mỗi "chỉnh sửa" lịch sử thực chất là tạo commit mới, không phải sửa commit cũ. Đây là thuộc tính bảo toàn tính toàn vẹn lịch sử.
* CHAR(40) vs SERIAL: Việc sử dụng CHAR(40) SHA-1 làm khóa chính tốn bộ nhớ hơn INT (40 bytes so với 4 bytes) nhưng đổi lại mang lại tính nhất quán toàn cầu không phụ thuộc vào database instance, phù hợp hơn với bản chất phân tán của hệ thống quản lý mã nguồn.




4. Thực thể COMMIT_PARENTS
Mô tả:
Thực thể commit_parents là bảng liên kết (junction table) đặc biệt, lưu trữ quan hệ cha-con giữa các commit để tạo nên cấu trúc Đồ thị có hướng không chu trình (DAG — Directed Acyclic Graph). Đây là điểm khác biệt kiến trúc quan trọng nhất của GitMini so với các hệ thống quản lý dữ liệu thông thường. Trong đồ thị này, mỗi commit là một nút (node) và mỗi quan hệ cha-con là một cạnh có hướng (directed edge) luôn đi từ commit con về commit cha. Tính không chu trình (acyclic) được đảm bảo bởi bản chất thời gian: một commit không thể là tổ tiên của chính nó. Lý do phải tách thành bảng riêng, thay vì thêm cột parent_hash trực tiếp vào bảng commits, xuất phát từ yêu cầu hỗ trợ merge commit: trong một commit thông thường chỉ có một parent, nhưng trong một merge commit có thể có hai hoặc nhiều parent, điều mà mô hình cột đơn không thể biểu diễn được.


Thuộc tính:
Tên cột
	Kiểu dữ liệu
	Mô tả
	Ràng buộc
	commit_hash
	CHAR(40)
	Định danh commit con (commit hiện tại, đứng sau về thời gian)
	PRIMARY KEY (composite), FK → commits(commit_hash) ON DELETE CASCADE
	parent_hash
	CHAR(40)
	Định danh commit cha (commit đứng trước về thời gian)
	PRIMARY KEY (composite), FK → commits(commit_hash) ON DELETE CASCADE
	ordinal
	INT
	Thứ tự của parent: 0 = parent chính (first-parent), 1 = merge parent (nhánh được merge vào)
	DEFAULT 0


Ràng buộc toàn vẹn:
* Khóa chính composite (commit_hash, parent_hash): Đảm bảo một cặp quan hệ cha-con cụ thể chỉ xuất hiện một lần trong bảng.
* FK commit_hash ON DELETE CASCADE: Khi commit con bị xóa (hiếm gặp), quan hệ cha-con tương ứng cũng bị xóa.
* FK parent_hash ON DELETE CASCADE: Khi commit cha bị xóa (hiếm gặp, không xảy ra trong nghiệp vụ thông thường), quan hệ liên kết cũng bị xóa.
* Chỉ mục idx_commit_parents_commit (commit_hash): Tối ưu duyệt xuôi — từ một commit tìm các commit cha của nó (phục vụ git log).
* Chỉ mục idx_commit_parents_parent (parent_hash): Tối ưu duyệt ngược — từ một commit tìm các commit con kế thừa nó (phục vụ tính toán divergence giữa các nhánh).


Quan hệ với các thực thể khác:

* Tự tham chiếu N:N bảng commits: Mỗi bản ghi trong commit_parents thể hiện một cạnh trong đồ thị DAG, nối hai nút commit với nhau.
* Phục vụ Recursive CTE: Bảng này là thành phần không thể thiếu để thực hiện truy vấn lịch sử commit bằng WITH RECURSIVE trong PostgreSQL.


Ghi chú thiết kế:
* Tại sao không dùng self-reference đơn giản? Nếu thêm cột parent_hash trực tiếp vào bảng commits, mỗi commit chỉ có thể tham chiếu đúng một parent. Điều này không thể biểu diễn merge commit — loại commit đặc biệt xuất hiện khi hợp nhất hai nhánh, với hai nhánh cha đồng thời (first-parent từ nhánh đích và merge-parent từ nhánh nguồn).
* Ý nghĩa của cột ordinal: Giá trị 0 xác định first-parent — đường chính của lịch sử; giá trị 1 xác định merge-parent — nhánh được tích hợp vào. Thứ tự này quan trọng để tái hiện đúng luồng lịch sử commit khi hiển thị git log.
* Cấu trúc DAG đảm bảo: (1) Không có chu trình trong lịch sử commit; (2) Nhiều nhánh có thể hội tụ tại một commit chung (chế độ merge); (3) Một commit có thể là tổ tiên của nhiều nhánh phát triển độc lập (chế độ fork/branch).




5. Thực thể BRANCHES
Mô tả:
Thực thể branches lưu trữ thông tin các nhánh phát triển của repository. Điều quan trọng cần nhấn mạnh là trong mô hình Git — và GitMini — một nhánh không phải là tập hợp các commit độc lập, mà chỉ là một con trỏ (pointer) trỏ đến commit mới nhất trên nhánh đó. Toàn bộ lịch sử của nhánh được suy diễn bằng cách đi ngược qua chuỗi quan hệ cha-con từ commit được trỏ đến. Thiết kế này mang lại hiệu quả đặc biệt: việc tạo một nhánh mới không tốn chi phí sao chép dữ liệu — chỉ cần INSERT một bản ghi vào bảng branches với trường head_commit_hash trỏ đến commit hiện tại.


Thuộc tính:
Tên cột
	Kiểu dữ liệu
	Mô tả
	Ràng buộc
	id
	SERIAL
	Khóa chính tự tăng
	PRIMARY KEY
	repo_id
	INT
	Repository chứa nhánh này
	NOT NULL, FK → repositories(id) ON DELETE CASCADE
	name
	VARCHAR(255)
	Tên nhánh (vd: main, develop, feature/user-auth, hotfix/bug-123)
	NOT NULL
	head_commit_hash
	CHAR(40)
	Con trỏ trỏ đến commit mới nhất của nhánh (HEAD)
	FK → commits(commit_hash) ON DELETE SET NULL
	is_protected
	BOOLEAN
	Nhánh được bảo vệ: không cho phép xóa hoặc force push
	DEFAULT FALSE
	created_at
	TIMESTAMPTZ
	Thời điểm tạo nhánh
	DEFAULT NOW()
	updated_at
	TIMESTAMPTZ
	Thời điểm HEAD được cập nhật (khi có commit hoặc merge mới)
	DEFAULT NOW()


Ràng buộc toàn vẹn:
* UNIQUE(repo_id, name): Trong phạm vi một repository, không được có hai nhánh trùng tên. Các repository khác nhau có thể có nhánh cùng tên mà không xung đột.
* FK head_commit_hash ON DELETE SET NULL: Cho phép nhánh tồn tại ngay cả khi commit được trỏ đến bị xóa (tình huống hiếm gặp), thay vì xóa luôn nhánh.
* Cột is_protected: Đây là ràng buộc ở tầng logic nghiệp vụ — các thao tác xóa nhánh hoặc force push trên nhánh được bảo vệ cần được kiểm tra trước khi thực thi.


Quan hệ với các thực thể khác:
* N branches THUỘC VỀ 1 repositories (quan hệ N:1)
* N branches TRỎ ĐẾN 1 commits qua head_commit_hash (quan hệ N:1 — HEAD pointer)


Ghi chú thiết kế:
* Khái niệm 'nhánh là con trỏ': Đây là sự khác biệt quan trọng với quan niệm thông thường. Khi tạo nhánh feature/new-login từ nhánh main, hệ thống không sao chép toàn bộ lịch sử commit của main — thay vào đó chỉ tạo một bản ghi mới với head_commit_hash trỏ đến commit hiện tại của main. Chi phí tạo nhánh là O(1) bất kể lịch sử lớn đến đâu.
* Cập nhật con trỏ khi commit mới: Mỗi lần tạo commit mới (UC08) hoặc merge PR (UC19), trường head_commit_hash của nhánh được UPDATE sang commit mới nhất — đây là thao tác diễn ra trong cùng một Transaction với việc tạo commit.

6. Thực thể ISSUES
Mô tả:
Thực thể issues lưu trữ các vấn đề kỹ thuật (bug report) và yêu cầu tính năng (feature request) của từng repository. Đây là kênh giao tiếp chính giữa người dùng và nhóm phát triển, cho phép báo cáo lỗi, đề xuất cải tiến và theo dõi tiến độ xử lý. Issues hỗ trợ phân loại bằng nhãn linh hoạt (labels) và giao phó trách nhiệm xử lý cho một thành viên cụ thể (assignee). Đặc biệt, cột title và body được tích hợp chỉ mục GIN Full-text Search để hỗ trợ tìm kiếm toàn văn bản hiệu năng cao, phục vụ use case UC16.


Thuộc tính:
Tên cột
	Kiểu dữ liệu
	Mô tả
	Ràng buộc
	id
	SERIAL
	Khóa chính tự tăng
	PRIMARY KEY
	repo_id
	INT
	Repository chứa issue này
	NOT NULL, FK → repositories(id) ON DELETE CASCADE
	author_id
	INT
	Người tạo issue (người báo cáo)
	NOT NULL, FK → users(id) ON DELETE SET NULL
	title
	VARCHAR(500)
	Tiêu đề ngắn gọn mô tả vấn đề
	NOT NULL
	body
	TEXT
	Nội dung chi tiết: mô tả lỗi, bước tái hiện, kết quả mong đợi...
	DEFAULT ''
	status
	VARCHAR(20)
	Trạng thái xử lý: 'open' (đang mở) hoặc 'closed' (đã đóng)
	CHECK(status IN ('open','closed')), DEFAULT 'open'
	labels
	TEXT[]
	Mảng nhãn phân loại (vd: bug, feature, documentation, critical)
	DEFAULT '{}'
	assignee_id
	INT
	Người được giao trách nhiệm xử lý issue
	FK → users(id) ON DELETE SET NULL
	created_at
	TIMESTAMPTZ
	Thời điểm tạo issue
	DEFAULT NOW()
	updated_at
	TIMESTAMPTZ
	Thời điểm cập nhật issue gần nhất
	DEFAULT NOW()
	closed_at
	TIMESTAMPTZ
	Thời điểm issue được đóng (NULL nếu chưa đóng)
	NULL


Ràng buộc toàn vẹn:
* CHECK(status IN ('open','closed')): Ràng buộc domain đảm bảo trường status chỉ nhận một trong hai giá trị hợp lệ, ngăn chặn dữ liệu rác.
* FK author_id ON DELETE SET NULL và FK assignee_id ON DELETE SET NULL: Khi người dùng bị xóa, issue được giữ lại với author_id hoặc assignee_id về NULL, đảm bảo không mất thông tin nghiệp vụ.
* Chỉ mục GIN idx_issues_fulltext trên to_tsvector('english', title || ' ' || body): Đây là chỉ mục đặc biệt hỗ trợ Full-text Search, cho phép tìm kiếm trong cả tiêu đề lẫn nội dung với xếp hạng theo độ liên quan.
* Kiểu TEXT[] cho cột labels: Sử dụng kiểu mảng gốc của PostgreSQL, cho phép lọc issue theo nhãn bằng toán tử @> mà không cần bảng liên kết riêng.


Quan hệ với các thực thể khác:
* N issues THUỘC VỀ 1 repositories (quan hệ N:1)
* N issues DO 1 users TẠO (quan hệ N:1 — tác giả)
* N issues ĐƯỢC GIAO CHO 1 users XỬ LÝ (quan hệ N:1 — người thực hiện, có thể NULL)




7. Thực thể PULL_REQUESTS
Mô tả:
Thực thể pull_requests lưu trữ các yêu cầu hợp nhất mã nguồn (merge request) từ một nhánh nguồn (source branch) vào một nhánh đích (target branch). Pull Request là cơ chế kiểm soát chất lượng mã nguồn quan trọng: thay vì merge trực tiếp, lập trình viên tạo PR để các thành viên khác trong nhóm xem xét, thảo luận và phê duyệt trước khi tích hợp vào nhánh chính. Khi một PR được merge, hệ thống tự động thực thi một Transaction ACID phức tạp tạo ra merge commit với hai parent (UC19). Trường merge_commit_hash duy trì liên kết trực tiếp giữa PR và merge commit tương ứng, phục vụ truy xuất lịch sử kiểm duyệt.


Thuộc tính:
Tên cột
	Kiểu dữ liệu
	Mô tả
	Ràng buộc
	id
	SERIAL
	Khóa chính tự tăng
	PRIMARY KEY
	repo_id
	INT
	Repository chứa pull request này
	NOT NULL, FK → repositories(id) ON DELETE CASCADE
	author_id
	INT
	Người tạo pull request
	NOT NULL, FK → users(id) ON DELETE SET NULL
	title
	VARCHAR(500)
	Tiêu đề mô tả thay đổi trong PR
	NOT NULL
	body
	TEXT
	Nội dung chi tiết: mô tả thay đổi, lý do, ảnh hưởng...
	DEFAULT ''
	status
	VARCHAR(20)
	Trạng thái: 'open' / 'closed' / 'merged'
	CHECK(status IN ('open','closed','merged')), DEFAULT 'open'
	source_branch
	VARCHAR(255)

Nhánh chứa mã nguồn cần được merge vào
	NOT NULL
	target_branch
	VARCHAR(255)
	Nhánh đích nhận mã nguồn (thường là 'main')
	NOT NULL, DEFAULT 'main'
	merge_commit_hash
	CHAR(40)
	Hash của merge commit sau khi PR được merge (NULL trước khi merge)
	FK → commits(commit_hash) ON DELETE SET NULL
	created_at
	TIMESTAMPTZ
	Thời điểm tạo PR
	DEFAULT NOW()
	updated_at
	TIMESTAMPTZ
	Thời điểm cập nhật PR gần nhất
	DEFAULT NOW()
	merged_at
	TIMESTAMPTZ
	Thời điểm merge thành công (NULL nếu chưa merge)
	NULL
	closed_at
	TIMESTAMPTZ
	Thời điểm đóng PR không merge (NULL nếu còn open)
	NULL


Ràng buộc toàn vẹn:
* CHECK(status IN ('open','closed','merged')): Pull Request có ba trạng thái phân biệt rõ ràng; ràng buộc domain ngăn chặn giá trị không hợp lệ.
* FK merge_commit_hash ON DELETE SET NULL: Cho phép trường này là NULL khi PR chưa được merge; khi merge, giá trị được cập nhật thông qua Transaction trong UC19.
* Hai trường timestamp phân biệt merged_at và closed_at: Giúp phân biệt giữa PR được merge thành công (merged_at có giá trị) và PR bị đóng mà không merge (closed_at có giá trị), phục vụ phân tích thống kê chính xác.


Quan hệ với các thực thể khác:
* N pull_requests THUỘC VỀ 1 repositories (quan hệ N:1)
* N pull_requests DO 1 users TẠO (quan hệ N:1 — tác giả)
* N pull_requests LIÊN KẾT VỚI 1 commits qua merge_commit_hash (quan hệ N:1 — merge commit)




8. Thực thể REPO_STATS (Bảng phi chuẩn hóa)
Mô tả:
Thực thể repo_stats không đại diện cho một đối tượng nghiệp vụ thực thế — đây là bảng kỹ thuật được thiết kế có chủ đích nhằm tối ưu hiệu năng đọc dữ liệu thông qua kỹ thuật phi chuẩn hóa (Denormalization) có kiểm soát. Nếu tuân thủ hoàn toàn dạng chuẩn 3NF (Third Normal Form), tất cả các giá trị thống kê như tổng số commit hay số issue đang mở có thể được tính toán bằng câu lệnh COUNT trực tiếp trên các bảng gốc. Tuy nhiên, trong môi trường thực tế với repository có hàng triệu bản ghi, các truy vấn COUNT đó có thể tiêu tốn hàng trăm millisecond cho mỗi lần tải trang dashboard. Bảng repo_stats lưu trữ sẵn các giá trị đã tính toán, cho phép dashboard tải tức thì với chi phí O(1).


Thuộc tính:
Tên cột
	Kiểu dữ liệu
	Mô tả
	Ràng buộc
	repo_id
	INT
	Khóa chính, tham chiếu trực tiếp đến repository
	PRIMARY KEY, FK → repositories(id) ON DELETE CASCADE
	commit_count
	INT
	Tổng số commit trong repository (cache, cập nhật qua Trigger)
	DEFAULT 0
	branch_count
	INT
	Tổng số nhánh hiện có trong repository
	DEFAULT 0
	issue_open_count
	INT
	Số issue đang ở trạng thái 'open'
	DEFAULT 0
	issue_closed_count
	INT
	Số issue đã ở trạng thái 'closed'
	DEFAULT 0
	pr_open_count
	INT
	Số pull request đang ở trạng thái 'open'
	DEFAULT 0
	pr_merged_count
	INT
	Số pull request đã được merge thành công
	DEFAULT 0
	latest_commit_hash
	CHAR(40)
	Hash của commit mới nhất (cache, tránh ORDER BY + LIMIT)
	NULL
	latest_commit_time
	TIMESTAMPTZ
	Thời điểm commit gần nhất (cache)
	NULL
	latest_commit_msg
	TEXT
	Nội dung thông điệp của commit gần nhất (cache)
	NULL
	updated_at
	TIMESTAMPTZ
	Thời điểm bảng cache này được cập nhật gần nhất
	DEFAULT NOW()


Ràng buộc toàn vẹn:
* PRIMARY KEY (repo_id): Đảm bảo quan hệ 1:1 nghiêm ngặt — mỗi repository có đúng một bản ghi thống kê tương ứng.
* FK repo_id ON DELETE CASCADE: Khi repository bị xóa, bản ghi thống kê tương ứng cũng bị xóa tự động.
* Cơ chế cập nhật tự động qua PostgreSQL TRIGGER: Thay vì cập nhật thủ công, hệ thống cài đặt trigger trên các bảng commits, issues, pull_requests và branches. Khi có INSERT/UPDATE vào các bảng này, trigger tự động điều chỉnh các giá trị tương ứng trong repo_stats, đảm bảo dữ liệu cache luôn đồng bộ trong phạm vi cùng một transaction.


Quan hệ với các thực thể khác:

* 1 repo_stats THUỘC VỀ 1 repositories (quan hệ 1:1 — bảng mở rộng thống kê)


Ghi chú thiết kế:
* Intentional Denormalization: Bảng repo_stats vi phạm có chủ ý chuẩn 3NF, vì các cột như commit_count có thể suy diễn từ bảng commits. Đây là quyết định kỹ thuật hợp lý trong kỹ thuật cơ sở dữ liệu, được gọi là denormalization có kiểm soát.
* Đánh đổi trade-off: Tốc độ đọc tăng mạnh (~245ms xuống ~1ms trên tập dữ liệu lớn) đổi lấy chi phí: (1) Mỗi thao tác ghi phải cập nhật thêm bảng này; (2) Có thể xảy ra window nhỏ không nhất quán nếu trigger thất bại; (3) Độ phức tạp bảo trì tăng lên.
* Write-through consistency: Cơ chế trigger đảm bảo repo_stats luôn được cập nhật trong cùng transaction với thao tác ghi chính, không để hai trạng thái không đồng bộ tồn tại đồng thời trong hệ thống.


GitMini — Báo cáo Bài tập lớn | Quản trị Cơ sở Dữ liệu Nâng cao

