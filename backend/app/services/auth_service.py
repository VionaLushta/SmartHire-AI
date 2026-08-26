from __future__ import annotations

import hashlib
import logging
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from jose.exceptions import JWTError
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_signed_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import (
    CurrentUserResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.services.audit_log_service import record_audit_event
from app.services.email_service import EmailService


@dataclass(frozen=True)
class OAuthProfile:
    provider: str
    provider_subject: str
    email: str
    first_name: str
    last_name: str
    email_verified: bool


class AuthenticationService:
    def __init__(self, db: Session, email_service: EmailService | None = None) -> None:
        self.repo = AuthRepository(db)
        self.logger = logging.getLogger("smarthire.auth")
        self.settings = get_settings()
        self.email_service = email_service
        self._ensure_baseline()

    def register(self, payload: RegisterRequest) -> TokenResponse:
        if not payload.accept_terms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must accept the terms to continue.",
            )
        if self.repo.get_user_by_email(payload.email) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Email already exists."
            )

        role_name = payload.role_name
        role = self.repo.get_role_by_name(role_name)
        if role is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role."
            )

        user = self.repo.create_user(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
            role_id=role["role_id"],
        )

        if role_name == "Company":
            company_name = payload.company_name or "SmartHire Technologies"
            company = self.repo.get_company_by_name(company_name) or self.repo.create_company(
                name=company_name,
                industry="Technology",
                location="Remote",
            )
            self.repo.assign_user_to_company(
                company_id=company["company_id"],
                user_id=user["user_id"],
                position="Hiring Lead",
            )

        verification_raw = self._issue_email_verification_token(user["user_id"])
        verification_url = self._frontend_url(
            "/verify-email",
            token=verification_raw,
        )
        self._send_verification_email(user, verification_url)

        record_audit_event(
            self.repo.db,
            user_id=user["user_id"],
            user_role=role_name,
            action="Registration",
            entity_type="Authentication",
            entity_id=str(user["user_id"]),
            description=f"{role_name} registered successfully.",
            status="Success",
        )
        self.logger.info("register success email=%s role=%s", payload.email, role_name)
        return TokenResponse(
            user=CurrentUserResponse.model_validate(self.repo.get_user_by_id(user["user_id"])),
            requires_verification=True,
            redirect_to="/email-verification-success",
            expires_in=0,
        )

    def login(self, payload: LoginRequest) -> TokenResponse:
        user = self.repo.get_user_by_email(payload.email)
        if user is None or not verify_password(payload.password, user["password_hash"]):
            self.logger.warning("login failed email=%s", payload.email)
            record_audit_event(
                self.repo.db,
                user_id=None,
                user_role="Unknown",
                action="Failed Login",
                entity_type="Authentication",
                entity_id=payload.email,
                description="Invalid credentials.",
                status="Failed",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials."
            )

        if self.settings.require_verified_login and user.get("email_verified_at") is None:
            verification_raw = self._issue_email_verification_token(user["user_id"])
            verification_url = self._frontend_url("/verify-email", token=verification_raw)
            self._send_verification_email(user, verification_url)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email address before logging in.",
            )

        return self._issue_session(user, remember_me=payload.remember_me)

    def refresh(self, payload: RefreshRequest | None = None, refresh_token: str | None = None) -> TokenResponse:
        token_value = refresh_token or (payload.refresh_token if payload else None)
        if not token_value:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing refresh token.",
            )
        try:
            decoded = decode_token(token_value)
        except JWTError:
            self.logger.warning("refresh failed reason=invalid_token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
            )

        if decoded.get("type") != "refresh":
            self.logger.warning(
                "refresh failed reason=invalid_token_type token_type=%s", decoded.get("type")
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type."
            )
        jti = str(decoded.get("jti") or "")
        if not jti:
            self.logger.warning("refresh failed reason=missing_jti")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token."
            )
        token = self.repo.get_active_refresh_token(jti)
        if token is None or str(token["user_id"]) != str(decoded.get("sub")):
            self.logger.warning("refresh failed reason=token_revoked_or_mismatch")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked."
            )

        try:
            user_uuid = uuid.UUID(str(decoded["sub"]))
        except (TypeError, ValueError):
            self.logger.warning("refresh failed reason=invalid_subject")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject."
            )

        user = self.repo.get_user_by_id(user_uuid)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found."
            )

        self.repo.revoke_refresh_token(jti)
        remember_me = payload.remember_me if payload is not None else True
        return self._issue_session(user, remember_me=remember_me)

    def logout(self, payload: RefreshRequest | None = None, refresh_token: str | None = None) -> None:
        token_value = refresh_token or (payload.refresh_token if payload else None)
        if not token_value:
            return
        try:
            decoded = decode_token(token_value)
        except JWTError:
            self.logger.warning("logout failed reason=invalid_token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
            )
        if decoded.get("type") != "refresh":
            self.logger.warning(
                "logout failed reason=invalid_token_type token_type=%s", decoded.get("type")
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type."
            )
        jti = str(decoded.get("jti") or "")
        if not jti:
            self.logger.warning("logout failed reason=missing_jti")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token."
            )
        self.repo.revoke_refresh_token(jti)
        self.repo.cleanup_expired_refresh_tokens()
        record_audit_event(
            self.repo.db,
            user_id=None,
            user_role=str(decoded.get("role_name") or "Unknown"),
            action="Logout",
            entity_type="Authentication",
            entity_id=str(decoded.get("sub") or ""),
            description="User logged out successfully.",
            status="Success",
        )
        self.logger.info("logout success sub=%s", decoded.get("sub"))

    def me(self, current_user: CurrentUserResponse) -> CurrentUserResponse:
        return current_user

    def request_password_reset(self, payload: ForgotPasswordRequest) -> None:
        user = self.repo.get_user_by_email(payload.email)
        if user is None:
            return
        raw_token = self._issue_password_reset_token(user["user_id"])
        reset_url = self._frontend_url("/reset-password", token=raw_token)
        self._send_password_reset_email(user, reset_url)
        record_audit_event(
            self.repo.db,
            user_id=user["user_id"],
            user_role=user["role_name"],
            action="Password Reset Requested",
            entity_type="Authentication",
            entity_id=str(user["user_id"]),
            description="Password reset email sent.",
            status="Success",
        )

    def reset_password(self, payload: ResetPasswordRequest) -> None:
        token_hash = hash_token(payload.token)
        token = self.repo.get_password_reset_token(token_hash)
        if token is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token.",
            )
        user_uuid = uuid.UUID(str(token["user_id"]))
        user = self.repo.get_user_by_id(user_uuid)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
            )
        self.repo.update_user(user_uuid, password_hash=hash_password(payload.password))
        self.repo.mark_password_reset_token_used(token_hash)
        self._revoke_all_refresh_tokens_for_user(user_uuid)
        self._send_password_changed_email(user)
        record_audit_event(
            self.repo.db,
            user_id=user_uuid,
            user_role=user["role_name"],
            action="Password Reset Completed",
            entity_type="Authentication",
            entity_id=str(user_uuid),
            description="Password updated successfully.",
            status="Success",
        )

    def verify_email(self, token: str) -> CurrentUserResponse:
        token_hash = hash_token(token)
        record = self.repo.get_email_verification_token(token_hash)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token.",
            )
        user_uuid = uuid.UUID(str(record["user_id"]))
        updated = self.repo.update_user(user_uuid, email_verified_at=datetime.now(timezone.utc))
        self.repo.mark_email_verification_token_used(token_hash)
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
            )
        user = self.repo.get_user_by_id(user_uuid)
        self._send_welcome_email(user)
        record_audit_event(
            self.repo.db,
            user_id=user_uuid,
            user_role=user["role_name"],
            action="Email Verified",
            entity_type="Authentication",
            entity_id=str(user_uuid),
            description="Email verified successfully.",
            status="Success",
        )
        return CurrentUserResponse.model_validate(user)

    def oauth_start_url(self, provider: str, *, role_name: str = "Candidate", redirect_uri: str) -> str:
        provider_key = self._normalize_provider(provider)
        state = create_signed_token(
            provider_key,
            token_type="oauth_state",
            expires_delta=timedelta(minutes=10),
            additional_claims={"provider": provider_key, "role_name": role_name},
        )
        if provider_key == "google":
            client_id = self.settings.oauth_google_client_id
            scope = "openid email profile"
            base = "https://accounts.google.com/o/oauth2/v2/auth"
        elif provider_key == "github":
            client_id = self.settings.oauth_github_client_id
            scope = "read:user user:email"
            base = "https://github.com/login/oauth/authorize"
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported OAuth provider.")
        if not client_id:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="OAuth is not configured.")
        query = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": scope,
            "state": state,
        }
        if provider_key == "google":
            query["access_type"] = "offline"
            query["prompt"] = "consent"
        return self._build_url(base, query)

    def oauth_callback(
        self,
        provider: str,
        *,
        code: str,
        state: str,
        redirect_uri: str,
    ) -> TokenResponse:
        provider_key = self._normalize_provider(provider)
        state_payload = self._decode_oauth_state(state)
        if state_payload.get("provider") != provider_key:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth state mismatch.")

        profile = self._fetch_oauth_profile(provider_key, code=code, redirect_uri=redirect_uri)
        user = self.repo.get_user_by_oauth(provider_key, profile.provider_subject)
        if user is None:
            user = self.repo.get_user_by_email(profile.email)

        role_name = str(state_payload.get("role_name") or "Candidate")
        role = self.repo.get_role_by_name(role_name) or self.repo.ensure_role(role_name, f"{role_name} user")
        if user is None:
            first_name, last_name = self._split_name(profile.first_name, profile.last_name)
            user = self.repo.create_user(
                first_name=first_name,
                last_name=last_name,
                email=profile.email,
                phone=None,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                role_id=role["role_id"],
                email_verified_at=datetime.now(timezone.utc) if profile.email_verified else None,
                auth_provider=provider_key,
                auth_provider_subject=profile.provider_subject,
            )
            if role_name == "Company":
                company_name = "SmartHire Technologies"
                company = self.repo.get_company_by_name(company_name) or self.repo.create_company(
                    name=company_name,
                    industry="Technology",
                    location="Remote",
                )
                self.repo.assign_user_to_company(
                    company_id=company["company_id"],
                    user_id=user["user_id"],
                    position="Hiring Lead",
                )
        else:
            updates: dict[str, Any] = {}
            if user.get("auth_provider") is None:
                updates["auth_provider"] = provider_key
            if user.get("auth_provider_subject") is None:
                updates["auth_provider_subject"] = profile.provider_subject
            if profile.email_verified and user.get("email_verified_at") is None:
                updates["email_verified_at"] = datetime.now(timezone.utc)
            if updates:
                self.repo.update_user(user["user_id"], **updates)
            self.repo.upsert_oauth_account(
                user_id=user["user_id"],
                provider=provider_key,
                provider_subject=profile.provider_subject,
                provider_email=profile.email,
            )

        refreshed_user = self.repo.get_user_by_id(uuid.UUID(str(user["user_id"])))
        return self._issue_session(refreshed_user, remember_me=True)

    def build_oauth_callback_redirect(self, user: CurrentUserResponse) -> str:
        return self._frontend_url(self._dashboard_path_for_role(user.role_name))

    def _issue_session(self, user: dict, *, remember_me: bool) -> TokenResponse:
        claims = {"role_name": user["role_name"]}
        access_expires = timedelta(minutes=self.settings.access_token_expire_minutes)
        refresh_days = (
            self.settings.remember_me_refresh_token_expire_days if remember_me else self.settings.refresh_token_expire_days
        )
        access = create_access_token(str(user["user_id"]), expires_delta=access_expires, additional_claims=claims)
        refresh = self._issue_refresh_token(user["user_id"], claims, expires_days=refresh_days)
        current_user = CurrentUserResponse.model_validate(user)
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            expires_in=int(access_expires.total_seconds()),
            user=current_user,
            redirect_to=self._dashboard_path_for_role(current_user.role_name),
        )

    def _issue_refresh_token(
        self, user_id: uuid.UUID, claims: dict[str, str], *, expires_days: int | None = None
    ) -> str:
        self.repo.cleanup_expired_refresh_tokens()
        refresh = create_refresh_token(
            str(user_id),
            expires_delta=timedelta(days=expires_days or self.settings.refresh_token_expire_days),
            additional_claims=claims,
        )
        payload = decode_token(refresh)
        self.repo.issue_refresh_token(
            user_id,
            payload["jti"],
            datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
        return refresh

    def _issue_email_verification_token(self, user_id: uuid.UUID) -> str:
        self.repo.cleanup_expired_auth_tokens()
        raw_token = secrets.token_urlsafe(48)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=self.settings.email_verification_token_expire_minutes
        )
        self.repo.issue_email_verification_token(user_id, token_hash, expires_at)
        return raw_token

    def _issue_password_reset_token(self, user_id: uuid.UUID) -> str:
        self.repo.cleanup_expired_auth_tokens()
        raw_token = secrets.token_urlsafe(48)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=self.settings.password_reset_token_expire_minutes
        )
        self.repo.issue_password_reset_token(user_id, token_hash, expires_at)
        return raw_token

    def _revoke_all_refresh_tokens_for_user(self, user_id: uuid.UUID) -> None:
        self.repo.db.execute(
            update(RefreshToken.__table__)
            .where(
                RefreshToken.__table__.c.user_id == user_id,
                RefreshToken.__table__.c.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        self.repo.db.commit()

    def _send_verification_email(self, user: dict, verification_url: str) -> None:
        display_name = f"{user['first_name']} {user['last_name']}".strip()
        self._mailer().send_verification_email(user["email"], verification_url, display_name=display_name)

    def _send_password_reset_email(self, user: dict, reset_url: str) -> None:
        display_name = f"{user['first_name']} {user['last_name']}".strip()
        self._mailer().send_password_reset_email(user["email"], reset_url, display_name=display_name)

    def _send_password_changed_email(self, user: dict) -> None:
        display_name = f"{user['first_name']} {user['last_name']}".strip()
        self._mailer().send_password_changed_email(user["email"], display_name=display_name)

    def _send_welcome_email(self, user: dict) -> None:
        display_name = f"{user['first_name']} {user['last_name']}".strip()
        self._mailer().send_welcome_email(user["email"], display_name=display_name)

    def _mailer(self) -> EmailService:
        if self.email_service is None:
            self.email_service = EmailService()
        return self.email_service

    def _ensure_baseline(self) -> None:
        for role_name in ("Candidate", "Recruiter", "Company", "Admin"):
            self.repo.ensure_role(role_name, f"{role_name} user")
        # Seed the requested company demo account if it is absent.
        demo_password_hash = hash_password("VIO123.")
        try:
            self.repo.ensure_demo_company_account(password_hash=demo_password_hash)
        except Exception as exc:  # pragma: no cover - baseline seeding should not block auth usage
            self.logger.warning("auth baseline seeding failed: %s", exc)

    def _normalize_provider(self, provider: str) -> str:
        normalized = provider.strip().lower()
        if normalized not in {"google", "github"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported OAuth provider.")
        return normalized

    def _decode_oauth_state(self, state: str) -> dict[str, Any]:
        try:
            payload = decode_token(state)
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state.") from exc
        if payload.get("type") != "oauth_state":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state.")
        return payload

    def _fetch_oauth_profile(self, provider: str, *, code: str, redirect_uri: str) -> OAuthProfile:
        if provider == "google":
            return self._fetch_google_profile(code=code, redirect_uri=redirect_uri)
        return self._fetch_github_profile(code=code, redirect_uri=redirect_uri)

    def _fetch_google_profile(self, *, code: str, redirect_uri: str) -> OAuthProfile:
        token_response = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": self.settings.oauth_google_client_id,
                "client_secret": self.settings.oauth_google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=20,
        )
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        profile_response = httpx.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=20,
        )
        profile_response.raise_for_status()
        data = profile_response.json()
        email = str(data.get("email") or "")
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google account email is missing.")
        names = self._split_name(str(data.get("given_name") or ""), str(data.get("family_name") or ""))
        return OAuthProfile(
            provider="google",
            provider_subject=str(data.get("sub") or ""),
            email=email,
            first_name=names[0],
            last_name=names[1],
            email_verified=bool(data.get("email_verified", False)),
        )

    def _fetch_github_profile(self, *, code: str, redirect_uri: str) -> OAuthProfile:
        token_response = httpx.post(
            "https://github.com/login/oauth/access_token",
            data={
                "code": code,
                "client_id": self.settings.oauth_github_client_id,
                "client_secret": self.settings.oauth_github_client_secret,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
            timeout=20,
        )
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        profile_response = httpx.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
            timeout=20,
        )
        profile_response.raise_for_status()
        data = profile_response.json()
        emails_response = httpx.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
            timeout=20,
        )
        emails_response.raise_for_status()
        primary_email = next(
            (
                item.get("email")
                for item in emails_response.json()
                if item.get("primary") and item.get("verified")
            ),
            None,
        )
        email = str(primary_email or data.get("email") or "")
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub account email is missing.")
        name = str(data.get("name") or data.get("login") or "GitHub User")
        first_name, last_name = self._split_name(*name.split(" ", 1)) if " " in name else (name, "User")
        return OAuthProfile(
            provider="github",
            provider_subject=str(data.get("id") or ""),
            email=email,
            first_name=first_name,
            last_name=last_name,
            email_verified=True,
        )

    def _dashboard_path_for_role(self, role_name: str) -> str:
        normalized = str(role_name or "").strip().lower()
        if normalized in {"admin", "administrator"}:
            return "/admin/dashboard"
        if normalized in {"company", "recruiter"}:
            return "/company/dashboard"
        return "/candidate/dashboard"

    def _frontend_url(self, path: str, **query: str) -> str:
        base = self.settings.frontend_base_url.rstrip("/")
        url = f"{base}{path}"
        if query:
            url = f"{url}?{urlencode(query)}"
        return url

    def _build_url(self, base: str, query: dict[str, str]) -> str:
        return str(httpx.URL(base).copy_merge_params(query))

    def _split_name(self, first: str, last: str) -> tuple[str, str]:
        first_name = (first or "").strip() or "User"
        last_name = (last or "").strip() or "Account"
        return first_name, last_name
