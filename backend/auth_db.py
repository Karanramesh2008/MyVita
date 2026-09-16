import hashlib
import hmac
import secrets
import sqlite3
from pathlib import Path
from typing import Optional


DB_PATH = Path(__file__).parent / "myvita_users.db"
PBKDF2_ITERATIONS = 310_000


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


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a per-password salt."""
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${derived.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a hash produced by hash_password."""
    try:
        algorithm, iterations_text, salt_hex, digest_hex = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


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


def get_user_by_user_id(user_id: str):
    conn = get_connection()

    row = conn.execute(
        "SELECT * FROM users WHERE user_id = ?",
        (user_id,),
    ).fetchone()

    conn.close()
    return dict(row) if row else None
