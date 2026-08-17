from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)


class AuthenticationService:
    def __init__(self, db: Session) -> None:
        self.repo = AuthRepository(db)
        self.logger = logging.getLogger("smarthire.auth")

    def register(self, payload: RegisterRequest) -> TokenResponse:
        if self.repo.get_user_by_email(payload.email) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Email already exists."
            )

        role = self.repo.get_role_by_name(payload.role_name)
        if role is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role."
            )

        user = self.repo.create_user(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            role_id=role["role_id"],
        )
        claims = {"role_name": payload.role_name}
        access = create_access_token(str(user["user_id"]), additional_claims=claims)
        refresh = self._issue_refresh_token(user["user_id"], claims)
        self.logger.info(
            "register success email=%s role=%s", payload.email, payload.role_name
        )
        return TokenResponse(
            access_token=access, refresh_token=refresh, expires_in=30 * 60
        )

    def login(self, payload: LoginRequest) -> TokenResponse:
        user = self.repo.get_user_by_email(payload.email)
        if user is None or not verify_password(payload.password, user["password_hash"]):
            self.logger.warning("login failed email=%s", payload.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials."
            )

        claims = {"role_name": user["role_name"]}
        access = create_access_token(str(user["user_id"]), additional_claims=claims)
        refresh = self._issue_refresh_token(user["user_id"], claims)
        self.logger.info("login success email=%s", payload.email)
        return TokenResponse(
            access_token=access, refresh_token=refresh, expires_in=30 * 60
        )

    def refresh(self, payload: RefreshRequest) -> TokenResponse:
        try:
            decoded = decode_token(payload.refresh_token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
            )

        if decoded.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type."
            )
        token = self.repo.get_active_refresh_token(decoded.get("jti", ""))
        if token is None or str(token["user_id"]) != str(decoded.get("sub")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked."
            )

        user = self.repo.get_user_by_id(uuid.UUID(str(decoded["sub"])))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found."
            )

        # Rotate refresh tokens so a consumed token cannot be replayed.
        self.repo.revoke_refresh_token(decoded.get("jti", ""))
        claims = {"role_name": user["role_name"]}
        access = create_access_token(str(user["user_id"]), additional_claims=claims)
        refresh = self._issue_refresh_token(user["user_id"], claims)
        return TokenResponse(
            access_token=access, refresh_token=refresh, expires_in=30 * 60
        )

    def logout(self, payload: RefreshRequest) -> None:
        try:
            decoded = decode_token(payload.refresh_token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
            )
        if decoded.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type."
            )
        self.repo.revoke_refresh_token(decoded.get("jti", ""))
        self.repo.cleanup_expired_refresh_tokens()
        self.logger.info("logout success sub=%s", decoded.get("sub"))

    def me(self, current_user: CurrentUserResponse) -> CurrentUserResponse:
        return current_user

    def _issue_refresh_token(self, user_id: uuid.UUID, claims: dict[str, str]) -> str:
        self.repo.cleanup_expired_refresh_tokens()
        refresh = create_refresh_token(str(user_id), additional_claims=claims)
        payload = decode_token(refresh)
        self.repo.issue_refresh_token(
            user_id,
            payload["jti"],
            datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
        return refresh
