# GitMini — Hướng dẫn Migration SQL

## Thứ tự chạy Migration UP

Chạy các file theo đúng thứ tự sau. Mỗi file phụ thuộc vào file trước đó.

| Bước | File | Nội dung |
|------|------|----------|
| 1 | `01_schema.sql` | Tạo 11 bảng cốt lõi, generated column search_vector, cập nhật constraints |
| 2 | `02_indexes.sql` | Tạo toàn bộ index (B-tree, composite, GIN full-text search) |
| 3 | `03_triggers.sql` | Tạo 5 trigger tự động cập nhật repo_stats + trigger ngăn self-review |
| 4 | `04_security_roles.sql` | Tạo 3 role RBAC: git_admin, git_developer, git_reviewer |
| 5 | `05_security_rls.sql` | Bật RLS và tạo policy trên 5 bảng, áp dụng FORCE RLS |
| 6 | `08_phase4_pr_governance.sql` | Thêm required_approvals, trigger enforce approval trước khi merge |
| 7 | `09_extend_to_20_tables.sql` | Tạo 9 bảng mở rộng + index + phân quyền bổ sung |

## Migration DOWN (Reset toàn bộ)

```sql
-- Chạy file rollback (xóa toàn bộ bảng, trigger, role, extension)
\i sql/00_down.sql
```

> **Cảnh báo:** Không chạy trên production khi chưa backup dữ liệu.

## Seed dữ liệu mẫu

```bash
# Demo (100 users, 20 repos, 1000 commits, 300 issues, 80 PRs)
python scripts/seed_data.py --profile demo

# Benchmark (1000 users, 1000 repos, 100000 commits, 10000 issues, 2000 PRs)
python scripts/seed_data.py --profile benchmark
```

## Lệnh Docker đầy đủ

### Khởi động database

```bash
docker compose up -d postgres
```

### Chạy migration qua Docker (không cần psql local)

```bash
# Bước 1: Schema
docker compose exec postgres psql -U gitmini -d gitmini_db -f /sql/01_schema.sql

# Bước 2–7: Chạy tự động bằng script
docker compose exec postgres bash /scripts/run_migrations.sh
```

### Kết nối vào PostgreSQL

```bash
docker compose exec postgres psql -U gitmini -d gitmini_db
```

### Xem log container

```bash
docker compose logs -f postgres
```

### Chạy rollback

```bash
docker compose exec postgres psql -U gitmini -d gitmini_db -f /sql/00_down.sql
```

### Chạy seed từ host (cần .env)

```bash
# Tạo .env từ mẫu nếu chưa có
cp .env.example .env

# Chạy seed
python scripts/seed_data.py --profile demo
```

### Chạy benchmark queries

```bash
docker compose exec postgres psql -U gitmini -d gitmini_db -f /sql/06_benchmark_queries.sql
```

## Cấu trúc file SQL

```
sql/
├── 00_down.sql               # Migration DOWN — rollback toàn bộ
├── 01_schema.sql             # Schema 20 bảng + constraints
├── 02_indexes.sql            # Index tối ưu truy vấn
├── 03_triggers.sql           # Trigger tự động hóa
├── 04_security_roles.sql     # RBAC roles và GRANT
├── 05_security_rls.sql       # Row-Level Security policies
├── 06_benchmark_queries.sql  # EXPLAIN ANALYZE queries minh chứng
├── 07_analytics_queries.sql  # Truy vấn phân tích nghiệp vụ
├── 08_phase4_pr_governance.sql  # PR governance: required_approvals
└── 09_extend_to_20_tables.sql   # 9 bảng mở rộng
```

## Biến session RLS

Khi kết nối từ ứng dụng, cần set biến session trước khi truy vấn:

```sql
SET app.current_user_id = 'uuid-cua-nguoi-dung';
SET app.current_username = 'alice';
-- Dùng 'admin' để bypass RLS khi cần
-- SET app.current_username = 'admin';
```
