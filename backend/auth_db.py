import sqlite3
from pathlib import Path
from typing import Optional


DB_PATH = Path(__file__).parent / "myvita_users.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            phone TEXT,
            specialty TEXT,
            license_number TEXT,
            created_at INTEGER NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def create_user(
    user_id: str,
    name: str,
    email: str,
    password_hash: str,
    role: str,
    phone: Optional[str] = None,
    specialty: Optional[str] = None,
    license_number: Optional[str] = None,
    created_at: int = 0,
):
    conn = get_connection()

    try:
        cursor = conn.execute(
            """
            INSERT INTO users (
                user_id,
                name,
                email,
                password_hash,
                role,
                phone,
                specialty,
                license_number,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                name,
                email,
                password_hash,
                role,
                phone,
                specialty,
                license_number,
                created_at,
            ),
        )

        conn.commit()

        return get_user_by_id(cursor.lastrowid)

    except sqlite3.IntegrityError:
        return None

    finally:
        conn.close()


def get_user_by_email(email: str):
    conn = get_connection()

    row = conn.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,),
    ).fetchone()

    conn.close()

    return dict(row) if row else None


def get_user_by_id(user_id: int):
    conn = get_connection()

    row = conn.execute(
        "SELECT * FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()

    conn.close()

    return dict(row) if row else None