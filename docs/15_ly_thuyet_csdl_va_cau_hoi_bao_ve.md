# GitMini — Lý thuyết CSDL và câu hỏi bảo vệ theo thành viên

Tài liệu này giúp 4 thành viên nắm kiến thức CSDL cơ bản của dự án GitMini trước khi báo cáo/bảo vệ. Nội dung tập trung vào môn **Quản trị Cơ sở dữ liệu**: thiết kế dữ liệu, chuẩn hóa, ràng buộc, index, trigger, bảo mật, backup/restore, benchmark và khai thác dữ liệu.

---

## 1. Tổng quan CSDL của GitMini

GitMini mô phỏng một hệ thống quản lý mã nguồn tập trung giống GitHub/GitLab ở mức nhỏ. Trọng tâm của dự án không phải là viết một hệ thống Git đầy đủ, mà là chứng minh PostgreSQL có thể quản lý tốt dữ liệu của một hệ thống SCM gồm:

- người dùng;
- repository;
- thành viên trong repository;
- commit và quan hệ cha-con giữa commit;
- branch;
- issue;
- pull request;
- review/approval;
- audit log;
- thống kê dashboard.

CSDL dùng PostgreSQL 15. Các file SQL chính:

| File | Vai trò |
|---|---|
| `sql/01_schema.sql` | Tạo bảng, khóa chính, khóa ngoại, ràng buộc dữ liệu |
| `sql/02_indexes.sql` | Tạo index B-tree và GIN để tối ưu truy vấn |
| `sql/03_triggers.sql` | Tạo trigger tự động cập nhật bảng thống kê `repo_stats` |
| `sql/04_security_roles.sql` | Tạo role RBAC trong PostgreSQL |
| `sql/05_security_rls.sql` | Tạo Row Level Security để bảo vệ repository private |
| `sql/06_benchmark_queries.sql` | Các truy vấn benchmark bằng `EXPLAIN ANALYZE` |
| `sql/07_analytics_queries.sql` | Truy vấn phân tích dữ liệu quản trị |
| `sql/08_phase4_pr_governance.sql` | Bổ sung bảng review pull request |

---

## 2. Các bảng chính và ý nghĩa

| Bảng | Ý nghĩa | Điểm CSDL cần nhớ |
|---|---|---|
| `users` | Người dùng hệ thống | Có `username`, `email` unique |
| `repositories` | Kho mã nguồn | Mỗi repo thuộc một owner, có public/private |
| `repo_members` | Thành viên theo từng repo | Bảng trung gian nhiều-nhiều giữa user và repo, có role |
| `commits` | Commit trong repository | Dùng `commit_hash` làm khóa chính |
| `commit_parents` | Quan hệ cha-con giữa commit | Biểu diễn commit graph dạng DAG |
| `branches` | Nhánh của repository | Có `head_commit_hash`, `is_protected` |
| `issues` | Vấn đề/công việc kỹ thuật | Có status `open/closed`, labels dạng array |
| `pull_requests` | Yêu cầu merge code | Có source branch, target branch, status |
| `pull_request_reviews` | Approval cho pull request | Dùng để kiểm soát merge vào protected branch |
| `audit_logs` | Nhật ký hành động nhạy cảm | Phục vụ accountability và truy vết |
| `repo_stats` | Thống kê phi chuẩn hóa | Tăng tốc dashboard, được cập nhật bằng trigger |

---

## 3. Kiến thức nền cần nắm

### 3.1. Khóa chính

Khóa chính định danh duy nhất mỗi dòng trong bảng.

Ví dụ trong GitMini:

- `users.id` là khóa chính UUID.
- `repositories.id` là khóa chính UUID.
- `commits.commit_hash` là khóa chính dạng chuỗi SHA-1 40 ký tự.
- `repo_members` dùng khóa chính ghép `(repo_id, user_id)` vì một user chỉ nên có một vai trò trong một repo.

Nếu thầy hỏi vì sao dùng UUID:

> UUID giúp tạo ID không phụ thuộc thứ tự tăng dần, phù hợp hệ thống phân tán hoặc seed dữ liệu độc lập. Với bài này, UUID giúp dữ liệu demo ít bị phụ thuộc vào sequence.

### 3.2. Khóa ngoại

Khóa ngoại đảm bảo dữ liệu giữa các bảng liên kết hợp lệ.

Ví dụ:

- `repositories.owner_id` tham chiếu `users.id`.
- `commits.repo_id` tham chiếu `repositories.id`.
- `issues.repo_id` tham chiếu `repositories.id`.
- `pull_requests.merge_commit_hash` tham chiếu `commits.commit_hash`.

Nếu thầy hỏi tác dụng:

> Khóa ngoại đảm bảo không thể tạo commit cho repository không tồn tại, không thể tạo issue cho repo không tồn tại, từ đó giữ toàn vẹn tham chiếu.

### 3.3. Ràng buộc UNIQUE

UNIQUE đảm bảo một giá trị hoặc tổ hợp giá trị không bị trùng.

Ví dụ:

- `users.username` unique.
- `users.email` unique.
- `repositories` có `UNIQUE(owner_id, name)` để cùng một owner không có hai repo trùng tên.
- `branches` có `UNIQUE(repo_id, name)` để một repo không có hai branch cùng tên.

### 3.4. Ràng buộc CHECK

CHECK giới hạn giá trị hợp lệ của cột.

Ví dụ:

- `repo_members.role` chỉ được nằm trong `owner`, `maintainer`, `developer`, `reviewer`, `viewer`.
- `issues.status` chỉ được `open` hoặc `closed`.
- `pull_requests.status` chỉ được `open`, `closed`, `merged`.

Nếu thầy hỏi vì sao cần CHECK:

> CHECK giúp chặn dữ liệu sai ngay ở tầng database, không phụ thuộc hoàn toàn vào backend.

### 3.5. Quan hệ một-nhiều

Một user có thể sở hữu nhiều repository:

```text
users 1 --- n repositories
```

Một repository có nhiều commit:

```text
repositories 1 --- n commits
```

Một repository có nhiều issue:

```text
repositories 1 --- n issues
```

### 3.6. Quan hệ nhiều-nhiều

User và repository là quan hệ nhiều-nhiều vì:

- một user có thể tham gia nhiều repository;
- một repository có nhiều user tham gia.

GitMini dùng bảng trung gian `repo_members`:

```text
users n --- n repositories
        qua repo_members
```

`repo_members` còn lưu thêm thuộc tính `role`, nên đây không chỉ là bảng nối đơn giản mà là bảng nghiệp vụ.

### 3.7. Chuẩn hóa dữ liệu

Chuẩn hóa giúp giảm trùng lặp và tránh bất thường dữ liệu.

GitMini hướng tới 3NF:

- Mỗi bảng biểu diễn một loại thực thể hoặc quan hệ rõ ràng.
- Dữ liệu user không lặp lại trong repository, issue, commit; chỉ lưu `user_id`.
- Dữ liệu repository không lặp lại trong commit/issue/PR; chỉ lưu `repo_id`.
- Role thành viên không lưu trong `users` vì role phụ thuộc vào từng repository, nên đặt trong `repo_members`.

Nếu thầy hỏi vì sao role không để trong bảng `users`:

> Vì một user có thể là owner ở repo A nhưng viewer ở repo B. Role không phụ thuộc riêng vào user mà phụ thuộc vào cặp user-repository, nên phải đặt trong `repo_members`.

### 3.8. Phi chuẩn hóa có kiểm soát

Bảng `repo_stats` là bảng phi chuẩn hóa để tăng tốc dashboard.

Nếu không có `repo_stats`, mỗi lần mở dashboard phải `COUNT(*)` từ nhiều bảng như commits, branches, issues, pull_requests. Khi dữ liệu lớn, truy vấn này chậm.

GitMini dùng trigger để cập nhật sẵn:

- số commit;
- số branch;
- số issue open/closed;
- số PR open/merged;
- commit mới nhất.

Nếu thầy hỏi phi chuẩn hóa có mâu thuẫn với chuẩn hóa không:

> Không. Thiết kế lõi vẫn chuẩn hóa để đảm bảo đúng dữ liệu. `repo_stats` là bảng phục vụ hiệu năng đọc, được kiểm soát bằng trigger để giảm nguy cơ sai lệch.

---

## 4. Commit graph và Recursive CTE

Git không lưu lịch sử commit như một danh sách thẳng. Mỗi commit có thể có một hoặc nhiều parent:

- commit thường có 1 parent;
- merge commit có 2 parent.

GitMini biểu diễn bằng hai bảng:

- `commits`: lưu commit;
- `commit_parents`: lưu cạnh cha-con giữa commit.

Đây là mô hình DAG: Directed Acyclic Graph.

Nếu cần duyệt lịch sử commit từ một commit HEAD về các commit cha, dùng Recursive CTE.

Ý tưởng:

```sql
WITH RECURSIVE commit_history AS (
  SELECT commit_hash, message, created_at
  FROM commits
  WHERE commit_hash = '<HEAD>'

  UNION ALL

  SELECT c.commit_hash, c.message, c.created_at
  FROM commits c
  JOIN commit_parents cp ON cp.parent_hash = c.commit_hash
  JOIN commit_history ch ON ch.commit_hash = cp.commit_hash
)
SELECT * FROM commit_history;
```

Câu trả lời ngắn nếu thầy hỏi:

> Vì commit history là quan hệ đệ quy cha-con, Recursive CTE phù hợp để duyệt graph từ commit HEAD về các parent.

---

## 5. Index và tối ưu truy vấn

### 5.1. Vì sao cần index

Index giống mục lục của bảng. Khi bảng lớn, nếu không có index, PostgreSQL phải scan nhiều dòng. Với index, PostgreSQL tìm nhanh hơn theo cột thường dùng trong `WHERE`, `JOIN`, `ORDER BY`.

GitMini tạo index cho:

- khóa ngoại để JOIN nhanh;
- commit theo repo và thời gian;
- issue theo repo và status;
- pull request theo repo và status;
- full-text search issue/commit;
- audit log theo thời gian, actor, repo, action.

### 5.2. B-tree index

B-tree phù hợp với:

- so sánh bằng `=`;
- lọc range;
- sort theo thứ tự;
- JOIN theo khóa.

Ví dụ:

```sql
CREATE INDEX IF NOT EXISTS idx_commits_repo_time
ON commits(repo_id, created_at DESC);
```

Index này giúp truy vấn lịch sử commit của một repo theo thời gian mới nhất nhanh hơn.

### 5.3. GIN index

GIN phù hợp cho dữ liệu nhiều phần tử như:

- full-text search;
- array;
- JSONB.

GitMini dùng GIN cho tìm kiếm text:

```sql
CREATE INDEX IF NOT EXISTS idx_issues_search
ON issues USING GIN (to_tsvector('english', title || ' ' || body));
```

Nếu thầy hỏi vì sao không dùng B-tree cho full-text search:

> B-tree phù hợp so sánh trực tiếp, còn full-text search cần tìm token/từ trong văn bản dài. GIN index phù hợp hơn vì lập chỉ mục các token.

### 5.4. EXPLAIN ANALYZE

`EXPLAIN` cho biết kế hoạch thực thi truy vấn. `EXPLAIN ANALYZE` chạy thật truy vấn và trả thời gian thực tế.

Nhóm dùng để chứng minh:

- truy vấn có dùng index hay không;
- thời gian trước/sau tối ưu;
- dashboard dùng `repo_stats` nhanh hơn `COUNT(*)` trực tiếp.

---

## 6. Trigger trong GitMini

Trigger là cơ chế tự động chạy function khi có INSERT/UPDATE/DELETE.

GitMini dùng trigger để cập nhật `repo_stats`:

| Trigger | Khi nào chạy | Mục đích |
|---|---|---|
| `trg_init_stats_on_repo_create` | Sau khi tạo repository | Tạo dòng thống kê ban đầu |
| `trg_commit_changes` | Sau INSERT/DELETE commit | Cập nhật số commit và commit mới nhất |
| `trg_issue_changes` | Sau INSERT/UPDATE issue | Cập nhật số issue open/closed |
| `trg_pr_changes` | Sau INSERT/UPDATE pull request | Cập nhật số PR open/merged |
| `trg_branch_changes` | Sau INSERT/DELETE branch | Cập nhật số branch |

Nếu thầy hỏi vì sao dùng trigger thay vì backend tự update:

> Trigger đảm bảo logic thống kê nằm ở database. Dù dữ liệu được ghi từ backend, script seed hay tool quản trị, thống kê vẫn được cập nhật nhất quán.

Nhược điểm trigger:

- khó debug hơn code backend;
- nếu trigger phức tạp có thể làm chậm thao tác ghi;
- phải test kỹ để tránh lệch số liệu.

---

## 7. RBAC và RLS

### 7.1. RBAC là gì

RBAC là Role-Based Access Control: phân quyền theo vai trò.

GitMini có các role PostgreSQL minh họa:

- `git_admin`;
- `git_developer`;
- `git_reviewer`.

Ý nghĩa:

- admin có quyền rộng;
- developer có quyền đọc và ghi một số bảng;
- reviewer có thêm quyền liên quan pull request.

### 7.2. RLS là gì

RLS là Row Level Security: bảo mật ở mức từng dòng dữ liệu.

Ví dụ bảng `repositories`:

- repo public: user đăng nhập có thể xem;
- repo private: chỉ admin, owner hoặc member được xem.

Điểm quan trọng:

> RLS giúp database tự chặn dòng không được phép xem, kể cả khi câu SQL vô tình select rộng.

### 7.3. Vì sao cần cả backend permission và RLS

Backend permission giúp trả lỗi rõ ràng và điều khiển luồng nghiệp vụ.

RLS là lớp bảo vệ sâu hơn ở database.

Câu trả lời ngắn:

> Backend kiểm soát nghiệp vụ, RLS bảo vệ dữ liệu ở tầng database. Có cả hai giúp hệ thống an toàn hơn.

---

## 8. Audit log

Audit log ghi lại hành động nhạy cảm để truy vết.

GitMini ghi các hành động như:

- thêm/sửa/xóa member;
- đóng/mở issue;
- review pull request;
- merge pull request.

Bảng `audit_logs` có:

- `actor_id`: ai thực hiện;
- `repo_id`: repo liên quan;
- `action`: hành động;
- `target_type`: loại đối tượng;
- `target_id`: ID đối tượng;
- `metadata`: thông tin bổ sung dạng JSONB;
- `created_at`: thời điểm.

Nếu thầy hỏi audit log phục vụ gì:

> Audit log phục vụ accountability: khi có thay đổi nhạy cảm, nhóm biết ai làm, làm lúc nào, tác động vào đối tượng nào.

---

## 9. Backup, restore và availability

GitMini dùng `pg_dump`/`pg_restore` để backup/restore.

### 9.1. Full backup

Full backup là sao lưu toàn bộ database tại một thời điểm.

Ưu điểm:

- dễ thực hiện;
- dễ restore;
- phù hợp bài tập/demo.

Nhược điểm:

- file có thể lớn;
- chỉ khôi phục về thời điểm backup.

### 9.2. WAL và PITR

WAL là Write-Ahead Logging. PostgreSQL ghi log thay đổi trước khi ghi dữ liệu chính thức.

PITR là Point-in-Time Recovery: khôi phục đến một thời điểm cụ thể.

Ví dụ:

> Nếu admin lỡ xóa bảng lúc 10:15, có thể khôi phục về 10:14:59 nếu có base backup và WAL archive.

### 9.3. Replication

Replication tạo DB standby nhận dữ liệu từ primary.

Khác nhau giữa backup và replication:

| Backup | Replication |
|---|---|
| Bản chụp dữ liệu trong quá khứ | Bản sao gần thời gian thực |
| Dùng để khôi phục khi mất/sai dữ liệu | Dùng để tăng availability/failover |
| Có thể lưu nhiều phiên bản | Standby cũng có thể nhận lỗi logic nếu primary ghi sai |

Câu trả lời ngắn:

> Backup giúp quay lại quá khứ, replication giúp có máy dự phòng gần thời gian thực. Hệ thống tốt nên có cả hai.

---

## 10. Migration, seed và môi trường sạch

Migration là script thay đổi schema database có kiểm soát.

GitMini có quy trình:

1. Chạy `sql/01_schema.sql`.
2. Chạy `sql/02_indexes.sql`.
3. Chạy `sql/03_triggers.sql`.
4. Chạy `sql/04_security_roles.sql`.
5. Chạy `sql/05_security_rls.sql`.
6. Chạy migration bổ sung nếu có.
7. Seed dữ liệu demo/benchmark.

Lệnh kiểm tra:

```bash
bash scripts/test_migrations.sh
```

Lệnh đồng bộ DB Docker hiện hữu:

```bash
bash scripts/sync_docker_db.sh
```

Seed dữ liệu demo:

```bash
DATABASE_URL="postgresql://gitmini_user:gitmini_password@localhost:5435/gitmini_db" python scripts/seed_data.py --profile demo
```

Điểm cần nhớ khi thầy hỏi:

> Nhóm không reset dữ liệu tùy tiện. Khi cần kiểm thử DB sạch, nhóm dùng PostgreSQL container tạm. Khi DB Docker cũ bị lệch schema, dùng script sync idempotent để đồng bộ.

---

## 11. Câu hỏi chung thầy có thể hỏi cả nhóm

### Câu 1: Dự án này có gì liên quan đến Quản trị CSDL?

Trả lời:

> Dự án tập trung vào thiết kế và quản trị PostgreSQL cho hệ thống quản lý mã nguồn: schema, khóa, chuẩn hóa, index, trigger, RBAC/RLS, audit log, backup/restore, benchmark và Docker deployment. Web/API chỉ là lớp minh chứng để kiểm tra dữ liệu vận hành đúng.

### Câu 2: Vì sao chọn PostgreSQL?

Trả lời:

> PostgreSQL hỗ trợ tốt quan hệ dữ liệu, khóa ngoại, transaction, index B-tree/GIN, full-text search, trigger, RLS, JSONB, backup/restore và replication. Các tính năng này phù hợp với yêu cầu môn Quản trị CSDL nâng cao.

### Câu 3: Điểm mới/hữu ích của GitMini là gì?

Trả lời:

> GitMini không thay thế GitHub/GitLab, mà dùng bài toán quản lý mã nguồn để chứng minh năng lực thiết kế CSDL: commit graph, phân quyền repository, audit, benchmark, analytics và vận hành PostgreSQL.

### Câu 4: Nếu dữ liệu lớn lên thì hệ thống tối ưu thế nào?

Trả lời:

> Nhóm dùng index cho khóa ngoại và truy vấn chính, GIN cho full-text search, `repo_stats` để tránh COUNT trực tiếp nhiều bảng, benchmark bằng `EXPLAIN ANALYZE`, và có thể mở rộng bằng partitioning/sharding nếu dữ liệu rất lớn.

### Câu 5: Nếu một user không có quyền xem repo private thì hệ thống chặn ở đâu?

Trả lời:

> Chặn ở hai lớp: backend kiểm tra membership/role để trả lỗi nghiệp vụ, và PostgreSQL RLS giới hạn dòng dữ liệu được SELECT ở tầng database.

### Câu 6: Nếu mất database thì khôi phục thế nào?

Trả lời:

> Dùng bản backup từ `pg_dump` để restore bằng `pg_restore`. Với hệ thống nâng cao hơn, dùng base backup kết hợp WAL để PITR, và dùng replication để có standby DB khi primary hỏng.

---

## 12. Thành viên 1 — Phân tích nghiệp vụ CSDL, thực thể, chuẩn hóa

### Kiến thức cần nắm

Thành viên 1 cần giải thích được:

- hệ thống cần lưu những dữ liệu gì;
- vì sao có các bảng chính;
- quan hệ giữa các thực thể;
- vì sao dùng bảng trung gian;
- chuẩn hóa 1NF, 2NF, 3NF;
- vì sao role thành viên nằm trong `repo_members`, không nằm trong `users`.

### Câu hỏi thầy có thể hỏi

#### Câu 1: Em hãy nêu các thực thể chính của hệ thống.

Trả lời:

> Các thực thể chính gồm users, repositories, repo_members, commits, commit_parents, branches, issues, pull_requests, pull_request_reviews, audit_logs và repo_stats. Trong đó users/repositories/commits/issues/PR là nghiệp vụ chính; repo_members biểu diễn quan hệ thành viên; audit_logs phục vụ truy vết; repo_stats phục vụ dashboard.

#### Câu 2: Vì sao cần bảng `repo_members`?

Trả lời:

> Vì user và repository là quan hệ nhiều-nhiều. Một user có thể tham gia nhiều repo, một repo có nhiều user. Ngoài ra mỗi cặp user-repo có role riêng như owner, maintainer, developer, viewer, nên cần bảng trung gian `repo_members` để lưu role.

#### Câu 3: Vì sao không lưu role trực tiếp trong bảng `users`?

Trả lời:

> Vì role phụ thuộc vào từng repository. Một user có thể là owner ở repo A nhưng viewer ở repo B. Nếu lưu role trong `users` thì không biểu diễn được role theo từng repo và gây sai thiết kế.

#### Câu 4: Dự án đã chuẩn hóa đến mức nào?

Trả lời:

> Thiết kế lõi hướng tới 3NF: mỗi bảng lưu một loại thực thể/quan hệ, thuộc tính phụ thuộc vào khóa chính, không lặp dữ liệu user/repo ở các bảng con mà dùng khóa ngoại. Riêng `repo_stats` là bảng phi chuẩn hóa có kiểm soát để tối ưu dashboard.

#### Câu 5: `repo_stats` có vi phạm chuẩn hóa không?

Trả lời:

> `repo_stats` là phi chuẩn hóa có chủ đích. Dữ liệu thống kê có thể tính từ bảng gốc, nhưng lưu riêng để tăng tốc đọc dashboard. Nhóm dùng trigger để cập nhật tự động, giảm nguy cơ lệch dữ liệu.

#### Câu 6: Quan hệ giữa commit và commit parent là gì?

Trả lời:

> Commit history là graph cha-con. Một commit có thể có nhiều parent, đặc biệt merge commit có 2 parent. Vì vậy nhóm tách `commits` và `commit_parents` để biểu diễn DAG thay vì lưu một parent cố định trong bảng commits.

---

## 13. Thành viên 2 — Thiết kế vật lý PostgreSQL, index, trigger, backup/restore

### Kiến thức cần nắm

Thành viên 2 cần giải thích được:

- schema vật lý PostgreSQL;
- khóa chính, khóa ngoại, unique, check;
- index B-tree và GIN;
- trigger cập nhật `repo_stats`;
- migration idempotent;
- seed demo/benchmark;
- backup/restore và replication.

### Câu hỏi thầy có thể hỏi

#### Câu 1: File `sql/01_schema.sql` làm gì?

Trả lời:

> File này tạo cấu trúc vật lý của database: extension UUID, các bảng chính, khóa chính, khóa ngoại, unique constraint và check constraint. Đây là nền tảng schema của toàn bộ hệ thống.

#### Câu 2: Vì sao cần index cho khóa ngoại?

Trả lời:

> PostgreSQL không tự tạo index cho khóa ngoại. Trong hệ thống có nhiều JOIN theo `repo_id`, `owner_id`, `author_id`, nếu không có index thì truy vấn phải scan nhiều dòng. Index giúp JOIN và lọc nhanh hơn.

#### Câu 3: B-tree và GIN khác nhau thế nào?

Trả lời:

> B-tree phù hợp so sánh bằng, range, sort và JOIN. GIN phù hợp dữ liệu có nhiều phần tử như full-text search, array, JSONB. GitMini dùng B-tree cho repo/time/status và GIN cho tìm kiếm text issue/commit.

#### Câu 4: Trigger trong dự án dùng để làm gì?

Trả lời:

> Trigger tự động cập nhật `repo_stats` khi commit, branch, issue hoặc pull request thay đổi. Nhờ đó dashboard không phải COUNT trực tiếp từ nhiều bảng mỗi lần mở.

#### Câu 5: Vì sao migration cần idempotent?

Trả lời:

> Idempotent nghĩa là chạy lại không gây lỗi hoặc phá dữ liệu. Khi demo hoặc chuyển máy, có thể cần chạy lại migration trên DB đã có một phần schema. Các script dùng `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP TRIGGER IF EXISTS` rồi tạo lại để tránh lỗi trùng object.

#### Câu 6: Backup và restore dự án kiểm chứng thế nào?

Trả lời:

> Nhóm có script `scripts/test_backup_restore.sh`. Script tạo DB nguồn tạm, chạy migration, seed demo, dump bằng `pg_dump`, restore sang DB tạm khác bằng `pg_restore`, rồi kiểm tra dữ liệu và bảng chính tồn tại.

#### Câu 7: Nếu database chính hỏng thì xử lý thế nào?

Trả lời:

> Có thể restore từ full backup gần nhất. Nếu muốn giảm mất dữ liệu, dùng WAL/PITR để khôi phục đến thời điểm cụ thể. Nếu cần sẵn sàng cao, dùng replication để có standby DB và failover khi primary hỏng.

---

## 14. Thành viên 3 — Bảo mật dữ liệu, RBAC/RLS, audit log

### Kiến thức cần nắm

Thành viên 3 cần giải thích được:

- nguyên tắc bảo mật CIA;
- RBAC;
- RLS;
- membership permission;
- branch protection và approval;
- audit log;
- vì sao cần test permission.

### Câu hỏi thầy có thể hỏi

#### Câu 1: RBAC trong dự án là gì?

Trả lời:

> RBAC là phân quyền theo vai trò. GitMini minh họa các role như `git_admin`, `git_developer`, `git_reviewer`. Mỗi role được grant quyền phù hợp trên schema, table và sequence.

#### Câu 2: RLS khác RBAC thế nào?

Trả lời:

> RBAC phân quyền theo role ở mức quyền thao tác như SELECT/INSERT/UPDATE. RLS kiểm soát ở mức từng dòng dữ liệu. Ví dụ cùng có quyền SELECT bảng repositories, nhưng RLS chỉ cho thấy repo public hoặc repo private mà user là owner/member.

#### Câu 3: Repo private được bảo vệ thế nào?

Trả lời:

> Backend kiểm tra user hiện tại và membership trước khi trả dữ liệu hoặc cho ghi. Đồng thời RLS trên bảng repositories chỉ cho admin, owner hoặc member xem repo private. Như vậy có hai lớp bảo vệ.

#### Câu 4: Audit log ghi những gì?

Trả lời:

> Audit log ghi actor, repo, action, target type, target id, metadata và thời gian. Các hành động như thêm member, đổi role, đóng/mở issue, review hoặc merge PR đều có thể ghi audit để truy vết.

#### Câu 5: Vì sao audit log quan trọng trong quản trị CSDL?

Trả lời:

> Audit log giúp accountability. Khi dữ liệu hoặc quyền bị thay đổi, quản trị viên biết ai thực hiện, lúc nào, trên đối tượng nào. Đây là yêu cầu quan trọng trong hệ thống nhiều người dùng.

#### Câu 6: Vì sao cần test permission?

Trả lời:

> Permission dễ sai ở các case biên, ví dụ viewer không được merge PR, tác giả không được tự approve, last owner không được bị xóa. Test giúp đảm bảo rule bảo mật không bị hỏng khi sửa code/schema.

#### Câu 7: Protected branch hoạt động thế nào?

Trả lời:

> Branch có cột `is_protected`. Khi PR merge vào branch protected, hệ thống yêu cầu có ít nhất một approval từ reviewer/maintainer không phải tác giả. Owner/maintainer mới được merge sau khi điều kiện đạt.

---

## 15. Thành viên 4 — Khai thác dữ liệu, truy vấn, analytics và minh chứng giao diện

### Kiến thức cần nắm

Thành viên 4 cần giải thích được:

- dữ liệu từ PostgreSQL được khai thác thế nào;
- các truy vấn phục vụ UI;
- analytics dashboard;
- full-text search;
- EXPLAIN/benchmark ở mức cơ bản;
- vì sao UI là minh chứng dữ liệu chứ không phải trọng tâm chính.

### Câu hỏi thầy có thể hỏi

#### Câu 1: UI trong dự án chứng minh gì về CSDL?

Trả lời:

> UI chứng minh dữ liệu trong PostgreSQL được khai thác được trong các luồng thực tế: xem repositories, history, issues, pull requests, analytics. Backend/frontend không phải trọng tâm chính, mà là cách minh họa database hoạt động đúng.

#### Câu 2: Analytics lấy dữ liệu từ đâu?

Trả lời:

> Analytics lấy từ các bảng PostgreSQL như repositories, commits, issues, pull_requests, repo_stats. Một số số liệu dùng bảng `repo_stats` đã được trigger cập nhật sẵn để đọc nhanh hơn.

#### Câu 3: Vì sao cần `repo_stats` cho dashboard?

Trả lời:

> Dashboard thường đọc số liệu tổng hợp. Nếu mỗi lần mở lại COUNT từ commits/issues/PR thì chậm khi dữ liệu lớn. `repo_stats` lưu sẵn số liệu và trigger cập nhật khi dữ liệu thay đổi.

#### Câu 4: Full-text search trong GitMini dùng gì?

Trả lời:

> Dùng `to_tsvector` kết hợp GIN index cho nội dung issue và commit message. GIN giúp tìm theo token trong văn bản dài nhanh hơn so với scan toàn bảng.

#### Câu 5: Khi demo UI cần nói gì để liên hệ với CSDL?

Trả lời:

> Khi mở từng màn hình, cần nói rõ dữ liệu đến từ bảng nào. Ví dụ repositories từ bảng repositories/repo_members; history từ commits/commit_parents; issues từ issues; PR từ pull_requests/pull_request_reviews; analytics từ repo_stats và các query tổng hợp.

#### Câu 6: Nếu UI hiển thị sai số liệu analytics thì kiểm tra ở đâu?

Trả lời:

> Kiểm tra theo thứ tự: dữ liệu gốc trong PostgreSQL, trigger cập nhật `repo_stats`, query analytics ở backend, cuối cùng mới kiểm tra frontend hiển thị. Vì nguồn sự thật là database.

#### Câu 7: Vì sao cần screenshot trong báo cáo?

Trả lời:

> Screenshot là minh chứng trực quan rằng dữ liệu CSDL không chỉ nằm trong script SQL mà đã được khai thác qua ứng dụng. Nó giúp thầy thấy schema, query, permission và analytics có kết quả thực tế.

---

## 16. Bộ câu hỏi nhanh để cả nhóm ôn trước khi bảo vệ

| Câu hỏi | Ý trả lời ngắn |
|---|---|
| CSDL có bao nhiêu nhóm bảng chính? | User/repo/membership, commit graph, issue/PR workflow, security/audit, statistics |
| Bảng nào biểu diễn quan hệ nhiều-nhiều user-repo? | `repo_members` |
| Vì sao dùng `commit_parents`? | Để biểu diễn commit graph/DAG và merge commit có nhiều parent |
| Vì sao dùng `repo_stats`? | Tối ưu dashboard bằng phi chuẩn hóa có trigger kiểm soát |
| Index quan trọng nhất cho commit history là gì? | `idx_commits_repo_time` trên `(repo_id, created_at DESC)` |
| GIN index dùng để làm gì? | Full-text search issue/commit message |
| RBAC là gì? | Phân quyền theo vai trò |
| RLS là gì? | Bảo mật ở mức từng dòng dữ liệu |
| Audit log dùng để làm gì? | Truy vết ai làm gì, lúc nào, trên đối tượng nào |
| Backup khác replication thế nào? | Backup là bản chụp quá khứ, replication là bản sao gần thời gian thực |
| Migration idempotent là gì? | Chạy lại không lỗi, không phá dữ liệu |
| Lệnh kiểm tra migration là gì? | `bash scripts/test_migrations.sh` |
| Lệnh backup/restore test là gì? | `bash scripts/test_backup_restore.sh` |
| Lệnh chạy app demo là gì? | `docker compose up -d db app` |
| Health check ở đâu? | `http://localhost:8099/health` |

---

## 17. Kịch bản trả lời khi thầy hỏi “mỗi thành viên làm gì?”

### Thành viên 1

> Em phụ trách phần phân tích CSDL: xác định yêu cầu dữ liệu, thực thể, quan hệ, chuẩn hóa và data dictionary. Em cũng tổng hợp tài liệu để đảm bảo phần thiết kế logic khớp với schema PostgreSQL.

### Thành viên 2

> Em phụ trách thiết kế vật lý và vận hành PostgreSQL: schema, khóa, index, trigger, migration, seed dữ liệu, backup/restore và Docker DB. Em kiểm chứng bằng migration smoke test, seed demo/benchmark và backup/restore test.

### Thành viên 3

> Em phụ trách bảo mật và kiểm soát truy cập dữ liệu: RBAC, RLS, permission theo repository membership, audit log và regression test cho quyền dữ liệu. Em đảm bảo user chỉ xem/sửa đúng dữ liệu được phép.

### Thành viên 4

> Em phụ trách khai thác dữ liệu: query phục vụ history, issue, pull request, analytics và minh chứng giao diện. Em dùng UI/screenshot để chứng minh dữ liệu PostgreSQL được truy vấn và hiển thị đúng.

---

## 18. Cách học nhanh trước buổi bảo vệ

1. Mỗi thành viên đọc kỹ phần của mình trong tài liệu này.
2. Cả nhóm đọc chung mục 1 đến mục 11.
3. Mỗi người tập trả lời 5 câu hỏi chính thuộc phần mình.
4. Chạy lại app demo và chỉ rõ mỗi màn hình liên quan bảng nào.
5. Không học thuộc máy móc; cần hiểu logic: dữ liệu được lưu ở đâu, quan hệ thế nào, kiểm soát quyền ra sao, tối ưu và backup bằng cách nào.
