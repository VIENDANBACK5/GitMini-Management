import os
import uuid
import random
import time
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Load cấu hình từ file .env
load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

def get_connection():
    return psycopg2.connect(DB_URL)

def seed_data():
    conn = get_connection()
    cur = conn.cursor()
    
    print("--- Bắt đầu Seeding dữ liệu cho GitMini ---")
    start_time = time.time()

    # 1. Tạo Users mẫu
    print("Đang tạo Users...")
    users = []
    user_ids = []
    for i in range(100):
        u_id = str(uuid.uuid4())
        user_ids.append(u_id)
        users.append((u_id, f"user_{i}", f"user_{i}@example.com", "hashed_password", f"Full Name {i}"))
    
    execute_values(cur, "INSERT INTO users (id, username, email, password_hash, full_name) VALUES %s ON CONFLICT DO NOTHING", users)

    # 2. Tạo Repositories mẫu
    print("Đang tạo Repositories...")
    repos = []
    repo_ids = []
    for i in range(20):
        r_id = str(uuid.uuid4())
        repo_ids.append(r_id)
        repos.append((r_id, f"project_{i}", f"Description for project {i}", random.choice(user_ids), random.choice([True, False])))
    
    execute_values(cur, "INSERT INTO repositories (id, name, description, owner_id, is_private) VALUES %s ON CONFLICT DO NOTHING", repos)

    # 3. Tạo Commits (Demo Lịch sử)
    print("Đang tạo 1,000 Commits (Demo)...")
    target_repo = repo_ids[0]
    commits = []
    commit_hashes = []
    
    base_time = datetime.now()
    for i in range(1000):
        c_hash = f"{random.getrandbits(160):40x}"[:40]
        commit_hashes.append(c_hash)
        commits.append((
            c_hash, 
            target_repo, 
            random.choice(user_ids), 
            f"Thanh commit thu {i} - GitMini Demo", 
            base_time - timedelta(minutes=i)
        ))
        
        # Insert theo lô (batch)
        if len(commits) >= 500:
            execute_values(cur, "INSERT INTO commits (commit_hash, repo_id, author_id, message, created_at) VALUES %s", commits)
            commits = []
            print(f"Đã nạp {i+1} commits...")
    if commits:
        execute_values(cur, "INSERT INTO commits (commit_hash, repo_id, author_id, message, created_at) VALUES %s", commits)

    # 4. Tạo Commit Parents (Mô phỏng lịch sử nhánh)
    print("Đang tạo mối quan hệ cha-con cho Commits...")
    parents = []
    for i in range(1, len(commit_hashes)):
        # Mỗi commit trỏ tới commit trước đó làm cha
        parents.append((commit_hashes[i-1], commit_hashes[i], 0))
        if len(parents) >= 10000:
            execute_values(cur, "INSERT INTO commit_parents (commit_hash, parent_hash, ordinal) VALUES %s", parents)
            parents = []

    conn.commit()
    cur.close()
    conn.close()
    
    end_time = time.time()
    print(f"--- Hoàn tất Seeding trong {end_time - start_time:.2f} giây ---")

if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print(f"Lỗi: {e}")
