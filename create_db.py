import sqlite3
from werkzeug.security import generate_password_hash

# ---------- Config ----------
DB_NAME = "users.db"
ADMIN_DEFAULT_USER = "admin"
ADMIN_DEFAULT_PASS = "adminpass"  # change this for production

# ---------- Connect to DB ----------
conn = sqlite3.connect(DB_NAME)
c = conn.cursor()

# ---------- Create Users Table ----------
c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        profile_pic TEXT,
        is_admin INTEGER DEFAULT 0 NOT NULL
    )
""")

# ---------- Insert Admin User ----------
c.execute("SELECT * FROM users WHERE username=?", (ADMIN_DEFAULT_USER,))
if not c.fetchone():
    c.execute(
        "INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, 1)",
        (ADMIN_DEFAULT_USER, "admin@example.local", generate_password_hash(ADMIN_DEFAULT_PASS))
    )

conn.commit()
conn.close()

print(f"Database '{DB_NAME}' created successfully with admin user '{ADMIN_DEFAULT_USER}'")
