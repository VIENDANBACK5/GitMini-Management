# GitMini — Phân quyền người dùng và luồng làm việc nhóm

Tài liệu này giải thích Phase 8 của GitMini: chuyển ứng dụng từ demo một người dùng sang mô hình nhiều tài khoản, nhiều thành viên trong repository và kiểm soát quyền theo vai trò.

---

## 1. Vì sao demo một người dùng là chưa đủ?

Một hệ thống quản lý mã nguồn thực tế không chỉ có một người vừa tạo repository, vừa tạo issue, vừa merge pull request. Nếu chỉ dùng một tài khoản demo thì hệ thống chưa thể hiện rõ các bài toán cơ sở dữ liệu quan trọng:

1. Repository public/private cần được lọc theo người xem.
2. Mỗi repository có nhiều thành viên với vai trò khác nhau.
3. Quyền xem và quyền ghi không giống nhau.
4. Backend phải chặn hành động không hợp lệ, không chỉ ẩn nút ở frontend.
5. Admin cần có góc nhìn toàn hệ thống để phục vụ quản trị.

Vì vậy GitMini bổ sung bảng `repo_members`, nhiều user demo và permission workflow ở cả database, API và giao diện.

---

## 2. Mô hình user, role và membership

### 2.1. User demo

Các tài khoản demo dùng Basic Auth để giữ bài toán đơn giản, không đưa thêm JWT/OAuth ngoài phạm vi bài tập lớn.

| Username | Password | Vai trò demo |
|---|---|---|
| `admin` | `gitmini_password` | Admin xem toàn hệ thống |
| `alice` | `gitmini_password` | Owner một số repository |
| `bob` | `gitmini_password` | Maintainer xử lý issue/PR |
| `carol` | `gitmini_password` | Developer tạo issue/PR |
| `david` | `gitmini_password` | Viewer chỉ xem |

### 2.2. Membership theo repository

Bảng `repo_members` lưu vai trò theo từng repository:

```sql
repo_members (
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'maintainer', 'developer', 'reviewer', 'viewer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (repo_id, user_id)
)
```

Điểm quan trọng là role gắn với repository, không phải role toàn hệ thống. Một user có thể là owner ở repo A nhưng chỉ là viewer ở repo B.

---

## 3. Role matrix

| Role | Xem public repo | Xem private repo được mời | Tạo issue | Đóng/mở issue | Tạo PR | Đóng PR | Merge PR | Xem analytics |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `admin` | Có | Có | Có | Có | Có | Có | Có | Toàn hệ thống |
| `owner` | Có | Có | Có | Có | Có | Có | Có | Repo nhìn thấy |
| `maintainer` | Có | Có | Có | Có | Có | Có | Có | Repo nhìn thấy |
| `developer` | Có | Có | Có | Chỉ issue của mình hoặc bị chặn theo repo policy | Có | PR của mình | Không | Repo nhìn thấy |
| `reviewer` | Có | Có | Có | Tùy policy demo | Không | Không | Không | Repo nhìn thấy |
| `viewer` | Có | Có | Không | Không | Không | Không | Không | Repo nhìn thấy |

Trong bản demo hiện tại, backend enforce các điểm chính:

- `viewer` chỉ xem, không tạo issue/PR.
- `developer` tạo issue/PR nhưng không merge PR.
- `maintainer` và `owner` đóng issue, đóng PR và merge PR.
- `admin` xem toàn bộ repository và analytics toàn hệ thống.

---

## 4. Quyền theo từng action

### 4.1. Repository visibility

API chỉ trả repository nếu một trong các điều kiện đúng:

1. User là `admin`.
2. Repository là public.
3. User là owner của repository.
4. User có dòng membership trong `repo_members`.

Điều này làm private repository không xuất hiện với user không có quyền.

### 4.2. Issue workflow

| Action | Role được phép |
|---|---|
| Xem issue | User xem được repository |
| Tạo issue | `admin`, `owner`, `maintainer`, `developer`, `reviewer` |
| Đóng/mở issue | `admin`, `owner`, `maintainer`, hoặc tác giả issue |

### 4.3. Pull request workflow

| Action | Role được phép |
|---|---|
| Xem PR | User xem được repository |
| Tạo PR | `admin`, `owner`, `maintainer`, `developer` |
| Đóng PR | `admin`, `owner`, `maintainer`, hoặc tác giả PR |
| Approve PR | `admin`, `owner`, `maintainer`, `reviewer`; tác giả PR không tự approve PR của mình |
| Merge PR vào branch thường | `admin`, `owner`, `maintainer` |
| Merge PR vào protected branch | `admin`, `owner`, `maintainer` và PR phải có ít nhất một approval hợp lệ |

### 4.4. Protected branch và reviewer approval

Branch `main` được coi là branch bảo vệ trong demo. Với protected branch, backend không cho merge PR nếu thiếu approval từ reviewer hợp lệ. UI chỉ hiển thị badge **Protected**, số approval và lý do merge bị khóa; backend mới là lớp enforce thật.

Luồng demo Phase 4:

1. Alice/owner tạo PR vào `main`.
2. Nút merge bị disable với lý do `protected branch requires reviewer approval`.
3. Alice là tác giả PR nên không tự approve được.
4. Bob maintainer hoặc reviewer hợp lệ approve PR.
5. Owner/maintainer merge được sau khi có approval.
6. Developer vẫn không merge được dù PR đã approved.

---

## 5. Cách demo trước giảng viên

1. Chọn `admin` trong user switcher:
   - Thấy toàn bộ repository.
   - Tab Analytics hiển thị scope toàn hệ thống.

2. Chọn `alice`:
   - Alice là owner một số repo demo.
   - Role badge hiển thị `owner`.
   - Nút tạo issue/PR và merge PR được bật ở repo Alice có quyền.

3. Chọn `bob`:
   - Bob là `maintainer` trong các repo demo chính.
   - Có thể xử lý issue và merge pull request.

4. Chọn `carol`:
   - Carol là `developer`.
   - Có thể tạo pull request.
   - Nút merge bị disable và backend vẫn trả 403 nếu gọi API merge trực tiếp.

5. Chọn `david`:
   - David là `viewer`.
   - Vẫn xem được repo được cấp quyền.
   - Nút tạo issue/PR/merge bị disable, API ghi bị chặn.

---

## 6. Liên hệ RBAC, RLS và app-level permission

GitMini dùng 3 lớp kiểm soát quyền:

1. **RBAC PostgreSQL (`sql/04_security_roles.sql`)**
   - Minh họa cách chia nhóm quyền ở mức database role: admin, developer, reviewer.

2. **RLS PostgreSQL (`sql/05_security_rls.sql`)**
   - Minh họa lọc hàng theo `app.current_user_id` và `app.current_username`.
   - Private repo chỉ admin, owner hoặc member xem được.

3. **App-level permission trong FastAPI**
   - Đây là lớp enforce trực tiếp cho demo web.
   - Backend kiểm tra quyền trước khi tạo issue, tạo PR, đóng issue, đóng PR hoặc merge PR.
   - Frontend chỉ là lớp hiển thị capability, không phải lớp bảo mật duy nhất.

Cách thiết kế này giúp bài tập thể hiện rõ: bảo mật không chỉ nằm ở giao diện, mà phải có ràng buộc từ database đến backend API.

---

## 7. Workflow quản lý thành viên repository

Phase 1 của roadmap production-readiness bổ sung workflow quản lý member thật qua API và UI.

### 7.1. API quản lý members

| Endpoint | Mục đích | Quyền |
|---|---|---|
| `GET /repos/{repo_name}/members` | Xem danh sách thành viên repo | `admin`, `owner`, `maintainer` |
| `POST /repos/{repo_name}/members` | Thêm hoặc cập nhật member bằng username + role | `admin`, `owner` |
| `PATCH /repos/{repo_name}/members/{username}` | Đổi role member | `admin`, `owner` |
| `DELETE /repos/{repo_name}/members/{username}` | Xóa member khỏi repo | `admin`, `owner` |

Backend luôn kiểm tra quyền trước khi ghi dữ liệu. Frontend chỉ dùng role/capability để hiển thị nút phù hợp, không thay thế bảo mật backend.

### 7.2. Ràng buộc owner cuối cùng

Repository phải luôn còn ít nhất một owner. Vì vậy backend chặn hai trường hợp:

1. Xóa member owner cuối cùng khỏi repo.
2. Hạ role owner cuối cùng xuống role khác.

Nếu vi phạm, API trả `400 Repository must keep at least one owner`.

### 7.3. Luồng demo UI

1. Chọn `alice` và mở repo mà Alice là `owner`:
   - UI hiển thị panel **Repository members**.
   - Alice thêm member bằng username + role.
   - Alice đổi role hoặc remove member được.
2. Chọn `bob` ở repo Bob là `maintainer`:
   - Bob xem được danh sách member.
   - UI hiển thị Bob chỉ có quyền xem, không quản lý role.
   - Nếu gọi API ghi trực tiếp, backend trả 403.
3. Chọn `david` ở repo David là `viewer`:
   - David không xem được danh sách member.
   - Backend trả 403 nếu gọi endpoint members trực tiếp.

---

## 8. Login/session baseline

Phase 2 thay cơ chế user switcher + Basic Auth demo bằng login/session phù hợp browser hơn.

### 8.1. Luồng đăng nhập

- Frontend hiển thị màn hình login thay vì tự chọn user trong sidebar.
- User đăng nhập bằng demo account: `admin`, `alice`, `bob`, `carol`, `david`.
- Password demo vẫn là `gitmini_password` để phục vụ bảo vệ bài, nhưng không còn lưu plaintext password trong bundle frontend.
- Backend kiểm tra username/password và cấp cookie `gitmini_session` với `HttpOnly`, `SameSite=lax`, `Max-Age=28800`.
- Các API sau đó nhận diện current user từ session cookie qua `/auth/me`.

### 8.2. Logout và API không đăng nhập

- `POST /auth/logout` xóa session phía server và clear cookie.
- API nghiệp vụ như `/repos`, `/issues`, `/pulls`, `/analytics` trả 401 nếu không có session hợp lệ.
- Refresh trang vẫn giữ phiên đăng nhập cho tới khi logout hoặc session hết hạn.

### 8.3. Giới hạn scope

Đây là baseline tối thiểu cho môi trường demo/nội bộ nhỏ. SSO/OAuth/LDAP và quản lý password thật thuộc phạm vi v2, không triển khai trong v1 để tránh vượt scope bài tập.

---

## 9. Audit log và trách nhiệm quản trị

Phase 3 bổ sung audit log để trả lời câu hỏi: **ai làm gì, lúc nào, ở repository nào?**

### 9.1. Bảng `audit_logs`

Bảng `audit_logs` lưu các hành động nhạy cảm:

```sql
audit_logs (
    id UUID PRIMARY KEY,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    repo_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
)
```

Các index chính hỗ trợ xem log mới nhất và lọc theo actor/repo/action:

- `idx_audit_logs_created_at`
- `idx_audit_logs_actor_created`
- `idx_audit_logs_repo_created`
- `idx_audit_logs_action_created`

### 9.2. Action được ghi log

Backend ghi audit log sau khi thao tác thành công:

| Action | Khi nào được ghi |
|---|---|
| `member.add` | Owner/admin thêm hoặc upsert member vào repository |
| `member.change` | Owner/admin đổi role member và role thật sự thay đổi |
| `member.remove` | Owner/admin xóa member khỏi repository |
| `issue.close` | Issue chuyển từ `open` sang `closed` |
| `issue.reopen` | Issue chuyển từ `closed` sang `open` |
| `pull.close` | Pull request chuyển sang `closed` |
| `pull.merge` | Pull request chuyển sang `merged` |

### 9.3. API và UI quản trị

Endpoint quản trị:

```text
GET /admin/audit-logs
```

Chỉ user `admin` được truy cập. Endpoint hỗ trợ filter:

- `actor`
- `repo`
- `action`
- `target_type`
- `limit`

Frontend chỉ hiển thị tab **Audit Logs** khi `/auth/me` trả `system_role = admin`. Non-admin không thấy tab này và nếu gọi API trực tiếp vẫn bị backend trả `403`.
