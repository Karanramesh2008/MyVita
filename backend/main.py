from datetime import datetime, timezone
from typing import Optional
import base64
import hashlib
import hmac
import json
import os
import secrets

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv
from ai import generate_health_insight
from auth_db import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    hash_password,
    init_db,
    verify_password,
)

load_dotenv()

SECRET_KEY = os.getenv("MYVITA_SECRET_KEY", "myvita-hackathon-secret-change-me").encode()

app = FastAPI(title="MyVita API", version="1.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "patient"
    phone: Optional[str] = None
    specialty: Optional[str] = None
    licenseNumber: Optional[str] = None


class ReadingRequest(BaseModel):
    systolic: int = Field(ge=60, le=260)
    diastolic: int = Field(ge=30, le=160)
    pulse: Optional[int] = Field(default=None, ge=30, le=220)
    source: str = "Manual"
    notes: Optional[str] = None


class ConsentRequest(BaseModel):
    recipient: str
    scope: str
    purpose: str
    duration: str
    readingIds: list[str] = []


class AIInsightRequest(BaseModel):
    readings: list[ReadingRequest] = Field(min_length=1, max_length=50)


# Short-lived server-side session registry. The client stores only the opaque token.
sessions: dict[str, dict] = {}
readings: dict[str, dict] = {}
consents: dict[str, dict] = {}
audit: list[dict] = []
SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000


def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def public_user(account: dict) -> dict:
    """Convert a DB row into the frontend UserSession shape."""
    return {
        "id": account["user_id"],
        "name": account["name"],
        "email": account["email"],
        "role": account["role"],
        "phone": account.get("phone"),
        "specialty": account.get("specialty"),
        "licenseNumber": account.get("license_number"),
        "isDemo": account.get("email") in {
            "ananya.sharma@myvita.health",
            "dr.sharma@cardiology.stjude.org",
        },
    }


def create_session(account: dict) -> tuple[str, dict]:
    token = secrets.token_urlsafe(32)
    sessions[token] = {
        "user_db_id": account["id"],
        "expires_at": now_ms() + SESSION_TTL_MS,
    }
    return token, public_user(account)


def get_authenticated_account(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = authorization.split(" ", 1)[1].strip()
    session = sessions.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    if now_ms() >= session["expires_at"]:
        sessions.pop(token, None)
        raise HTTPException(status_code=401, detail="Session expired")

    account = get_user_by_id(session["user_db_id"])
    if not account:
        sessions.pop(token, None)
        raise HTTPException(status_code=401, detail="User account no longer exists")

    return account


def seed_demo_users() -> None:
    """Create the existing demo accounts in SQLite if they do not exist."""
    demo_users = [
        {
            "user_id": "MV-PT-8829",
            "name": "Ananya Sharma",
            "email": "ananya.sharma@myvita.health",
            "password": "demo123",
            "role": "patient",
            "phone": "+91-9876543210",
        },
        {
            "user_id": "MV-DR-1094",
            "name": "Dr. A. Sharma, MD",
            "email": "dr.sharma@cardiology.stjude.org",
            "password": "doctor123",
            "role": "doctor",
            "specialty": "Cardiology",
            "license_number": "MD-99482-CA",
        },
    ]

    for demo in demo_users:
        if get_user_by_email(demo["email"]):
            continue
        create_user(
            user_id=demo["user_id"],
            name=demo["name"],
            email=demo["email"],
            password_hash=hash_password(demo["password"]),
            role=demo["role"],
            phone=demo.get("phone"),
            specialty=demo.get("specialty"),
            license_number=demo.get("license_number"),
            created_at=now_ms(),
        )


# Initialize persistent auth storage when the API module loads.
init_db()
seed_demo_users()


def create_consent_token(
    consent_id: str,
    recipient: str,
    scope: str,
    purpose: str,
    expires: int,
) -> str:
    payload = {
        "consent_id": consent_id,
        "recipient": recipient,
        "scope": scope,
        "purpose": purpose,
        "expires": expires,
    }
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    payload_encoded = base64.urlsafe_b64encode(payload_json.encode()).decode().rstrip("=")
    signature = hmac.new(
        SECRET_KEY,
        payload_encoded.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_encoded}.{signature}"


def verify_consent_token(token: str):
    try:
        payload_encoded, signature = token.split(".", 1)
        expected_signature = hmac.new(
            SECRET_KEY,
            payload_encoded.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected_signature):
            return None
        padding = "=" * (-len(payload_encoded) % 4)
        payload_json = base64.urlsafe_b64decode(payload_encoded + padding).decode()
        return json.loads(payload_json)
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None


@app.get("/")
def root():
    return {"name": "MyVita API", "status": "running", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "myvita-backend", "timestamp": now_ms()}


@app.post("/api/auth/login")
def login(data: LoginRequest):
    email = str(data.email).lower().strip()
    account = get_user_by_email(email)
    if not account or not verify_password(data.password, account["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token, user = create_session(account)
    audit.append({
        "id": secrets.token_hex(8),
        "type": "LOGIN",
        "userId": account["user_id"],
        "timestamp": now_ms(),
    })
    return {"success": True, "token": token, "user": user}


@app.post("/api/auth/register")
def register(data: RegisterRequest):
    email = str(data.email).lower().strip()
    role = data.role.lower().strip()
    if role not in {"patient", "doctor"}:
        raise HTTPException(status_code=400, detail="Role must be patient or doctor")
    if get_user_by_email(email):
        raise HTTPException(status_code=409, detail="Account already exists")

    prefix = "MV-PT-" if role == "patient" else "MV-DR-"
    account = create_user(
        user_id=prefix + str(secrets.randbelow(9000) + 1000),
        name=data.name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        role=role,
        phone=data.phone,
        specialty=data.specialty,
        license_number=data.licenseNumber,
        created_at=now_ms(),
    )
    if not account:
        raise HTTPException(status_code=409, detail="Account already exists")

    token, user = create_session(account)
    audit.append({
        "id": secrets.token_hex(8),
        "type": "REGISTER",
        "userId": account["user_id"],
        "timestamp": now_ms(),
    })
    return {"success": True, "token": token, "user": user}


@app.get("/api/auth/me")
def me(authorization: Optional[str] = Header(default=None)):
    account = get_authenticated_account(authorization)
    return {"success": True, "user": public_user(account)}


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        session = sessions.pop(token, None)
        if session:
            audit.append({
                "id": secrets.token_hex(8),
                "type": "LOGOUT",
                "userId": str(session["user_db_id"]),
                "timestamp": now_ms(),
            })
    return {"success": True}


@app.get("/api/readings")
def get_readings():
    return list(readings.values())


@app.post("/api/readings")
def add_reading(data: ReadingRequest):
    reading_id = "bp_" + secrets.token_hex(8)
    reading = {"id": reading_id, "type": "BP", **data.model_dump(), "timestamp": now_ms()}
    readings[reading_id] = reading
    return reading


@app.delete("/api/readings/{reading_id}")
def delete_reading(reading_id: str):
    if reading_id not in readings:
        raise HTTPException(status_code=404, detail="Reading not found")
    del readings[reading_id]
    return {"success": True}


@app.post("/api/ai/health-insight")
def ai_health_insight(data: AIInsightRequest):
    try:
        insight = generate_health_insight([r.model_dump() for r in data.readings])
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "success": True,
        "insight": insight,
        "disclaimer": "Informational only; not a diagnosis or a substitute for professional medical advice.",
    }


@app.post("/api/consents")
def create_consent(data: ConsentRequest):
    consent_id = "CV-" + secrets.token_hex(6).upper()
    created = now_ms()
    duration_ms = {
        "1 hour": 3600000,
        "24 hours": 86400000,
        "7 days": 604800000,
        "30 days": 2592000000,
    }.get(data.duration, 604800000)
    expires = created + duration_ms
    selected = [readings[rid] for rid in data.readingIds if rid in readings]
    token = create_consent_token(
        consent_id=consent_id,
        recipient=data.recipient,
        scope=data.scope,
        purpose=data.purpose,
        expires=expires,
    )
    consent = {
        "id": consent_id,
        "readingIds": data.readingIds,
        "recipient": data.recipient,
        "scope": data.scope,
        "purpose": data.purpose,
        "duration": data.duration,
        "expiresAt": expires,
        "revoked": False,
        "token": token,
        "createdAt": created,
        "readingsData": selected,
    }
    consents[consent_id] = consent
    audit.append({
        "id": secrets.token_hex(8),
        "type": "CONSENT_CREATED",
        "consentId": consent_id,
        "recipient": data.recipient,
        "timestamp": created,
    })
    return consent


@app.get("/api/consents")
def get_consents():
    return list(consents.values())


@app.post("/api/consents/{consent_id}/revoke")
def revoke_consent(consent_id: str):
    consent = consents.get(consent_id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    consent["revoked"] = True
    audit.append({
        "id": secrets.token_hex(8),
        "type": "CONSENT_REVOKED",
        "consentId": consent_id,
        "recipient": consent["recipient"],
        "timestamp": now_ms(),
    })
    return {"success": True, "consent": consent}


@app.get("/api/consents/token/{token}")
def access_consent(token: str):
    payload = verify_consent_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token signature")

    consent_id = payload.get("consent_id")
    consent = consents.get(consent_id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    if consent["revoked"]:
        raise HTTPException(status_code=403, detail="Consent has been revoked")
    if now_ms() >= consent["expiresAt"]:
        raise HTTPException(status_code=403, detail="Consent has expired")

    audit.append({
        "id": secrets.token_hex(8),
        "type": "CONSENT_ACCESSED",
        "consentId": consent["id"],
        "recipient": consent["recipient"],
        "timestamp": now_ms(),
    })
    return {
        "verified": True,
        "consent": consent,
        "readings": consent["readingsData"],
    }


@app.get("/api/audit")
def get_audit():
    return sorted(audit, key=lambda x: x["timestamp"], reverse=True)
