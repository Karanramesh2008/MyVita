from datetime import datetime, timezone
from typing import Optional
import hashlib
import hmac
import os
import secrets

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv
from ai import generate_health_insight

load_dotenv()

SECRET_KEY = os.getenv("MYVITA_SECRET_KEY", "myvita-hackathon-secret-change-me").encode()

app = FastAPI(title="MyVita API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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

accounts: dict[str, dict] = {
    "ananya.sharma@myvita.health": {
        "id": "MV-PT-8829", "name": "Ananya Sharma", "role": "patient",
        "email": "ananya.sharma@myvita.health", "password": "demo123",
        "phone": "+91-9876543210", "isDemo": True
    },
    "dr.sharma@cardiology.stjude.org": {
        "id": "MV-DR-1094", "name": "Dr. A. Sharma, MD", "role": "doctor",
        "email": "dr.sharma@cardiology.stjude.org", "password": "doctor123",
        "specialty": "Cardiology", "licenseNumber": "MD-99482-CA", "isDemo": True
    }
}
readings: dict[str, dict] = {}
consents: dict[str, dict] = {}
audit: list[dict] = []


def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def sign_token(payload: str) -> str:
    return hmac.new(SECRET_KEY, payload.encode(), hashlib.sha256).hexdigest()


@app.get("/")
def root():
    return {"name": "MyVita API", "status": "running", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "myvita-backend", "timestamp": now_ms()}


@app.post("/api/auth/login")
def login(data: LoginRequest):
    account = accounts.get(str(data.email).lower().strip())
    if not account or not hmac.compare_digest(account["password"], data.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = {k: v for k, v in account.items() if k != "password"}
    token = secrets.token_urlsafe(32)
    return {"success": True, "token": token, "user": user}


@app.post("/api/auth/register")
def register(data: RegisterRequest):
    email = str(data.email).lower().strip()
    if email in accounts:
        raise HTTPException(status_code=409, detail="Account already exists")
    prefix = "MV-PT-" if data.role == "patient" else "MV-DR-"
    account = {
        "id": prefix + str(secrets.randbelow(9000) + 1000),
        "name": data.name.strip(), "email": email, "role": data.role,
        "password": data.password, "phone": data.phone, "specialty": data.specialty,
        "licenseNumber": data.licenseNumber, "isDemo": False
    }
    accounts[email] = account
    user = {k: v for k, v in account.items() if k != "password"}
    return {"success": True, "user": user}


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
    duration_ms = {"1 hour": 3600000, "24 hours": 86400000, "7 days": 604800000, "30 days": 2592000000}.get(data.duration, 604800000)
    expires = created + duration_ms
    selected = [readings[rid] for rid in data.readingIds if rid in readings]
    payload = f"{consent_id}|{data.recipient}|{data.scope}|{data.purpose}|{expires}"
    signature = sign_token(payload)
    token = f"{secrets.token_urlsafe(12)}.{secrets.token_urlsafe(24)}.{signature}"
    consent = {
        "id": consent_id, "readingIds": data.readingIds, "recipient": data.recipient,
        "scope": data.scope, "purpose": data.purpose, "duration": data.duration,
        "expiresAt": expires, "revoked": False, "token": token,
        "createdAt": created, "readingsData": selected
    }
    consents[consent_id] = consent
    audit.append({"id": secrets.token_hex(8), "type": "CONSENT_CREATED", "consentId": consent_id, "recipient": data.recipient, "timestamp": created})
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
    audit.append({"id": secrets.token_hex(8), "type": "CONSENT_REVOKED", "consentId": consent_id, "recipient": consent["recipient"], "timestamp": now_ms()})
    return {"success": True, "consent": consent}


@app.get("/api/consents/token/{token}")
def access_consent(token: str):
    consent = next((c for c in consents.values() if c["token"] == token), None)
    if not consent:
        raise HTTPException(status_code=404, detail="Invalid consent token")
    if consent["revoked"]:
        raise HTTPException(status_code=403, detail="Consent has been revoked")
    if now_ms() >= consent["expiresAt"]:
        raise HTTPException(status_code=403, detail="Consent has expired")
    audit.append({"id": secrets.token_hex(8), "type": "CONSENT_ACCESSED", "consentId": consent["id"], "recipient": consent["recipient"], "timestamp": now_ms()})
    return {"consent": consent, "readings": consent["readingsData"]}


@app.get("/api/audit")
def get_audit():
    return sorted(audit, key=lambda x: x["timestamp"], reverse=True)
