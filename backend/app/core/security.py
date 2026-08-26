from __future__ import annotations

import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 14
ACCESS_TOKEN_COOKIE_NAME = "smarthire_access_token"
REFRESH_TOKEN_COOKIE_NAME = "smarthire_refresh_token"


def _secret_key() -> str:
    settings = get_settings()
    if not settings.secret_key:
        raise RuntimeError("SECRET_KEY is not configured.")
    return settings.secret_key


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except ValueError:
        return False


def _token_payload(
    subject: str, token_type: str, expires_delta: timedelta
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    jti = uuid.uuid4().hex
    return {
        "sub": subject,
        "type": token_type,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }


def create_access_token(
    subject: str,
    expires_delta: timedelta | None = None,
    additional_claims: dict[str, Any] | None = None,
) -> str:
    payload = _token_payload(
        subject,
        "access",
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    if additional_claims:
        payload.update(additional_claims)
    return jwt.encode(payload, _secret_key(), algorithm=ALGORITHM)


def create_refresh_token(
    subject: str,
    expires_delta: timedelta | None = None,
    additional_claims: dict[str, Any] | None = None,
) -> str:
    payload = _token_payload(
        subject, "refresh", expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    if additional_claims:
        payload.update(additional_claims)
    return jwt.encode(payload, _secret_key(), algorithm=ALGORITHM)


def create_signed_token(
    subject: str,
    *,
    token_type: str,
    expires_delta: timedelta,
    additional_claims: dict[str, Any] | None = None,
) -> str:
    payload = _token_payload(subject, token_type, expires_delta)
    if additional_claims:
        payload.update(additional_claims)
    return jwt.encode(payload, _secret_key(), algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, _secret_key(), algorithms=[ALGORITHM])


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def cookie_max_age_from_expiry(expiry: datetime | None) -> int | None:
    if expiry is None:
        return None
    now = datetime.now(timezone.utc)
    delta = int((expiry - now).total_seconds())
    return max(delta, 0)
