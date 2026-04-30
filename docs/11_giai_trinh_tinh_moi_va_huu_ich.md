# GitMini — Giải trình tính mới và tính hữu ích

## 1. GitMini có phải bản sao GitHub/GitLab không?

Không. GitMini không được xây dựng để cạnh tranh trực tiếp hoặc thay thế GitHub/GitLab.

GitHub và GitLab là các nền tảng công nghiệp rất lớn, bao gồm quản lý mã nguồn, CI/CD, DevSecOps, security scanning, package registry, automation, enterprise policy và nhiều tính năng cộng tác nâng cao. GitMini chỉ chọn một phần lõi của bài toán quản lý mã nguồn để mô hình hóa và triển khai trên PostgreSQL.

Cách định vị đúng của GitMini là:

> GitMini là một hệ thống quản lý mã nguồn tối giản theo hướng SQL-first, dùng để minh họa cách thiết kế, tối ưu, bảo mật, phân tích và vận hành dữ liệu của một nền tảng quản lý mã nguồn bằng PostgreSQL.

## 2. Tại sao không dùng GitHub/GitLab luôn?

Nếu mục tiêu là dùng sản phẩm thật trong doanh nghiệp, GitHub/GitLab là lựa chọn tốt hơn. Nhưng mục tiêu của đề tài là học và chứng minh kỹ thuật quản trị cơ sở dữ liệu nâng cao.

Khi dùng GitHub/GitLab, phần cơ sở dữ liệu bị ẩn đi. Người học không trực tiếp thấy:

- schema lưu repository, commit, issue, pull request;
- cách mô hình hóa commit graph;
- cách tối ưu truy vấn bằng index;
- cách dùng full-text search;
- cách dùng trigger để cập nhật thống kê;
- cách phân quyền ở tầng CSDL;
- cách backup/restore và benchmark truy vấn.

GitMini giúp các phần này trở nên rõ ràng, có thể chạy, có thể đo bằng `EXPLAIN ANALYZE` và có thể giải thích trong báo cáo.

## 3. Tính mới của GitMini

## 3.1. Mô hình commit graph dạng DAG trong PostgreSQL

Commit history của Git không phải danh sách tuyến tính đơn giản. Một commit có thể có nhiều parent trong trường hợp merge commit. GitMini mô hình hóa quan hệ này bằng bảng `commit_parents`, từ đó biểu diễn lịch sử commit như một đồ thị có hướng không chu trình.

Điểm đáng nói:

> GitMini dùng mô hình quan hệ để biểu diễn commit graph, sau đó dùng Recursive CTE để duyệt lịch sử commit ngay trong PostgreSQL.

## 3.2. Recursive CTE cho lịch sử commit

Thay vì chỉ lấy commit theo thời gian, GitMini có thể bắt đầu từ HEAD commit và đi ngược về parent commit bằng `WITH RECURSIVE`.

Điều này minh họa một kỹ thuật SQL nâng cao và phù hợp với bản chất dữ liệu Git.

## 3.3. Full-text search bằng GIN index

GitMini hỗ trợ tìm kiếm issue và commit message bằng PostgreSQL full-text search:

- `to_tsvector`
- `plainto_tsquery`
- GIN index

Tính năng này chứng minh hệ thống không chỉ CRUD dữ liệu, mà còn tối ưu truy vấn tìm kiếm trên dữ liệu văn bản.

## 3.4. Dashboard nhanh bằng `repo_stats`

Thay vì mỗi lần mở dashboard đều `COUNT(*)` trên nhiều bảng lớn, GitMini dùng bảng `repo_stats` để lưu thống kê đã phi chuẩn hóa có kiểm soát.

Trigger tự động cập nhật số lượng commit, branch, issue, pull request và latest commit.

Đây là một tradeoff thực tế trong thiết kế CSDL: chấp nhận dư thừa dữ liệu có kiểm soát để tăng tốc truy vấn đọc.

## 3.5. RBAC/RLS và bảo mật ở tầng CSDL

GitMini có thiết kế role và Row Level Security để minh họa cách bảo vệ dữ liệu repository ở tầng database, không chỉ ở tầng ứng dụng.

## 3.6. SQL Analytics

GitMini bổ sung nhóm truy vấn analytics để trả lời các câu hỏi quản trị:

- repository nào nhiều commit nhất;
- repository nào có nhiều issue đang mở;
- tỷ lệ issue đã đóng;
- tỷ lệ pull request đã merge;
- contributor nào hoạt động nhiều nhất;
- hoạt động gần đây nhất trong hệ thống;
- health score của repository.

Đây là điểm giúp GitMini có giá trị riêng: dữ liệu không chỉ được lưu, mà còn được phân tích trực tiếp bằng SQL.

## 4. Tính hữu ích của GitMini

## 4.1. Hữu ích trong môi trường học tập

GitMini phù hợp cho môn Cơ sở dữ liệu nâng cao vì nó gom nhiều kỹ thuật vào một bài toán thực tế:

- thiết kế schema quan hệ;
- khóa chính, khóa ngoại, ràng buộc;
- index B-tree và GIN;
- recursive query;
- trigger;
- denormalization;
- phân quyền;
- backup/restore;
- benchmark bằng EXPLAIN.

## 4.2. Hữu ích cho phòng lab hoặc nhóm nhỏ

GitMini có thể chạy bằng Docker và PostgreSQL, phù hợp để demo trong phòng lab hoặc nhóm nhỏ cần một hệ thống self-hosted đơn giản.

Nó không có đầy đủ sức mạnh của GitHub/GitLab, nhưng đủ để minh họa repository, commit history, issue, pull request, search và analytics.

## 4.3. Hữu ích cho quản trị dữ liệu mã nguồn

Tab Analytics giúp người quản trị nhìn nhanh:

- tổng repository;
- tổng commit;
- số issue đang mở;
- số PR đã merge;
- top repository;
- top contributor;
- recent activity.

Nhờ đó GitMini không chỉ là giao diện CRUD, mà còn là công cụ quan sát tình trạng dữ liệu mã nguồn.

## 5. Câu trả lời ngắn khi thầy hỏi

> Dạ, GitMini không nhằm thay thế GitHub hay GitLab. Em xây GitMini để chứng minh cách một hệ quản trị CSDL quan hệ như PostgreSQL có thể mô hình hóa và vận hành phần dữ liệu lõi của một hệ thống quản lý mã nguồn. Điểm chính của đề tài là commit graph dạng DAG, truy vấn đệ quy Recursive CTE, full-text search bằng GIN index, bảng thống kê `repo_stats`, trigger, RBAC/RLS, backup/restore và analytics. Vì vậy tính mới của đề tài nằm ở góc nhìn SQL-first và quản trị cơ sở dữ liệu, không phải ở việc clone toàn bộ GitHub.

## 6. Câu trả lời dài hơn

> GitHub/GitLab là các nền tảng DevOps hoàn chỉnh, nhưng khi sử dụng chúng thì phần thiết kế và vận hành cơ sở dữ liệu bị ẩn đi. Trong đề tài này, em muốn bóc tách phần lõi dữ liệu của một hệ thống quản lý mã nguồn và triển khai lại bằng PostgreSQL. Hệ thống có repository, branch, commit, issue, pull request và search, nhưng trọng tâm là cách lưu trữ, ràng buộc, tối ưu và phân tích dữ liệu.
>
> Điểm nổi bật là commit history được mô hình hóa như một DAG thông qua bảng `commit_parents`, từ đó có thể dùng Recursive CTE để duyệt lịch sử commit. Ngoài ra, hệ thống dùng GIN index để tìm kiếm toàn văn trên issue và commit message, dùng trigger để cập nhật bảng `repo_stats`, dùng RBAC/RLS để minh họa bảo mật và có các truy vấn analytics để đánh giá tình trạng repository. Do đó GitMini có ích trong môi trường học tập, phòng lab hoặc nhóm nhỏ, nơi cần hiểu rõ cách một hệ thống quản lý mã nguồn có thể được thiết kế và vận hành ở tầng CSDL.

## 7. Cách demo để thuyết phục

Khi demo, nên đi theo thứ tự:

1. Mở dashboard repository để cho thấy dữ liệu thật từ PostgreSQL.
2. Mở commit history để nói về DAG và Recursive CTE.
3. Tìm kiếm issue/commit để nói về GIN full-text search.
4. Mở Pull Requests để cho thấy workflow quản lý mã nguồn.
5. Mở Analytics để nói về giá trị quản trị: top repository, top contributor, issue/PR status và recent activity.
6. Mở tài liệu EXPLAIN để chứng minh tối ưu truy vấn bằng số liệu thật.

Câu chốt:

> GitMini không mạnh hơn GitHub/GitLab, nhưng nó hữu ích vì giúp nhìn rõ và kiểm chứng các kỹ thuật CSDL đứng sau một hệ thống quản lý mã nguồn.
