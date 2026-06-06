# Thông tin kết nối Database — GitMini

## Tài khoản đang dùng

| Thông số | Giá trị |
|---|---|
| **User** | `gitmini_user` |
| **Password** | `gitmini_password` |
| **Database** | `gitmini_db` |
| **Host (từ máy host)** | `localhost` |
| **Port (từ máy host)** | `5435` |
| **Port (trong container)** | `5432` |
| **Container name** | `gitmini_db_container` |

## Quyền của tài khoản gitmini_user

| Quyền | Giá trị |
|---|---|
| Superuser | ✅ YES |
| Create DB | ✅ YES |
| Create Role | ✅ YES |
| Can Login | ✅ YES |

> ⚠️ `gitmini_user` là **superuser** — bypass hoàn toàn RLS kể cả khi có FORCE ROW LEVEL SECURITY.
> Để test RLS, phải chạy `SET ROLE git_developer;` trước khi query.

## Chuỗi kết nối

```
postgresql://gitmini_user:gitmini_password@localhost:5435/gitmini_db
```

## Kết nối bằng các công cụ

### psql (qua Docker)
```powershell
docker exec -it gitmini_db_container psql -U gitmini_user -d gitmini_db
```

### psql (trực tiếp từ máy host — cần cài psql)
```powershell
psql -h localhost -p 5435 -U gitmini_user -d gitmini_db
```

### DBeaver / pgAdmin
```
Host:     localhost
Port:     5435
Database: gitmini_db
User:     gitmini_user
Password: gitmini_password
```

### Python (psycopg2)
```python
import psycopg2
conn = psycopg2.connect(
    "postgresql://gitmini_user:gitmini_password@localhost:5435/gitmini_db"
)
```

### FastAPI / SQLAlchemy
```python
DATABASE_URL = "postgresql://gitmini_user:gitmini_password@localhost:5435/gitmini_db"
```

## Các role RBAC trong hệ thống

| Role | Mô tả | Superuser |
|---|---|---|
| `gitmini_user` | Tài khoản chính, dùng để quản trị | ✅ YES |
| `git_admin` | Admin ứng dụng, ALL PRIVILEGES | ❌ NO |
| `git_developer` | Developer, SELECT + INSERT/UPDATE giới hạn | ❌ NO |
| `git_reviewer` | Reviewer, kế thừa git_developer + UPDATE pull_requests | ❌ NO |

## Lưu ý quan trọng khi test RLS

Vì `gitmini_user` là superuser, khi test bảo mật **phải** switch role:

```sql
-- Test với quyền developer (chịu RLS)
SET ROLE git_developer;
SET app.current_user_id = '<uuid-nguoi-dung>';
SET app.current_username = 'alice';
SELECT * FROM repositories;
```

Hoặc dùng `set_config()` để set UUID từ subquery:

```sql
SET ROLE git_developer;
SELECT set_config('app.current_user_id', id::text, false),
       set_config('app.current_username', 'alice', false)
FROM users WHERE username = 'alice';
SELECT * FROM repositories;
```
