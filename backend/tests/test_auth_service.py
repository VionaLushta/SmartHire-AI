from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi import HTTPException

from app.core.security import hash_password
from app.models.role import Role
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.services.auth_service import AuthenticationService


class FakeMailer:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, str]] = []

    def send_verification_email(self, recipient: str, verification_url: str, *, display_name: str | None = None):
        self.calls.append(("verification", recipient, verification_url))
        return {"status": "sent"}

    def send_password_reset_email(self, recipient: str, reset_url: str, *, display_name: str | None = None):
        self.calls.append(("reset", recipient, reset_url))
        return {"status": "sent"}

    def send_password_changed_email(self, recipient: str, *, display_name: str | None = None):
        self.calls.append(("changed", recipient, display_name or ""))
        return {"status": "sent"}

    def send_welcome_email(self, recipient: str, *, display_name: str | None = None):
        self.calls.append(("welcome", recipient, display_name or ""))
        return {"status": "sent"}


class FakeResponse:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


def build_service(test_db):
    mailer = FakeMailer()
    service = AuthenticationService(test_db, email_service=mailer)
    return service, mailer


def _seed_verified_user(test_db, *, email: str, password: str, role_name: str = "Candidate"):
    service, _ = build_service(test_db)
    role = service.repo.get_role_by_name(role_name) or service.repo.ensure_role(role_name, f"{role_name} user")
    service.repo.create_user(
        first_name="Test",
        last_name="User",
        email=email,
        phone="+1 555 013 2048",
        password_hash=hash_password(password),
        role_id=role["role_id"],
        email_verified_at=datetime.now(timezone.utc),
    )
    return service.repo.get_user_by_email(email)


def test_register_login_verify_and_refresh_flow(test_db):
    service, mailer = build_service(test_db)

    register = RegisterRequest(
        first_name="Ava",
        last_name="Stone",
        phone="+1 555 013 2048",
        email="ava.stone@example.com",
        password="Password1",
        role_name="Candidate",
        accept_terms=True,
    )
    result = service.register(register)
    assert result.requires_verification is True
    assert result.user is not None
    assert result.user.email == "ava.stone@example.com"
    assert mailer.calls and mailer.calls[0][0] == "verification"

    with pytest.raises(HTTPException) as exc:
        service.login(
            LoginRequest(
                email="ava.stone@example.com",
                password="Password1",
                remember_me=True,
            )
        )
    assert exc.value.status_code == 403

    verification_url = mailer.calls[0][2]
    verification_token = parse_qs(urlparse(verification_url).query)["token"][0]
    verified = service.verify_email(verification_token)
    assert verified.email == "ava.stone@example.com"
    assert verified.is_verified is True

    login = service.login(
        LoginRequest(
            email="ava.stone@example.com",
            password="Password1",
            remember_me=False,
        )
    )
    assert login.access_token
    assert login.refresh_token
    assert login.redirect_to == "/candidate/dashboard"
    assert login.user is not None

    rotated = service.refresh(
        RefreshRequest(refresh_token=login.refresh_token, remember_me=False)
    )
    assert rotated.access_token
    assert rotated.refresh_token
    assert rotated.redirect_to == "/candidate/dashboard"


def test_password_reset_flow(test_db):
    service, mailer = build_service(test_db)
    user = _seed_verified_user(test_db, email="noah.patel@example.com", password="Password1")

    service.request_password_reset(ForgotPasswordRequest(email="noah.patel@example.com"))
    assert mailer.calls and mailer.calls[0][0] == "reset"
    reset_token = parse_qs(urlparse(mailer.calls[0][2]).query)["token"][0]

    service.reset_password(
        ResetPasswordRequest(
            token=reset_token,
            password="Password2",
            confirm_password="Password2",
        )
    )

    assert any(call[0] == "changed" for call in mailer.calls)
    with pytest.raises(HTTPException):
        service.reset_password(
            ResetPasswordRequest(
                token=reset_token,
                password="Password3",
                confirm_password="Password3",
            )
        )

    with pytest.raises(HTTPException):
        service.login(
            LoginRequest(email="noah.patel@example.com", password="Password1", remember_me=True)
        )
    login = service.login(
        LoginRequest(email="noah.patel@example.com", password="Password2", remember_me=True)
    )
    assert login.access_token
    assert user["email"] == "noah.patel@example.com"


def test_login_role_routing(test_db):
    service, _ = build_service(test_db)
    password = "Password1"
    roles = {
        "Candidate": "/candidate/dashboard",
        "Recruiter": "/company/dashboard",
        "Company": "/company/dashboard",
        "Admin": "/admin/dashboard",
    }

    for role_name, expected_redirect in roles.items():
        role = service.repo.get_role_by_name(role_name) or service.repo.ensure_role(role_name, f"{role_name} user")
        service.repo.create_user(
            first_name=role_name,
            last_name="User",
            email=f"{role_name.lower()}@example.com",
            phone="+1 555 013 2048",
            password_hash=hash_password(password),
            role_id=role["role_id"],
            email_verified_at=datetime.now(timezone.utc),
        )
        login = service.login(
            LoginRequest(
                email=f"{role_name.lower()}@example.com",
                password=password,
                remember_me=True,
            )
        )
        assert login.redirect_to == expected_redirect


def test_google_and_github_oauth_flow(test_db, monkeypatch):
    service, _ = build_service(test_db)
    service.settings.oauth_google_client_id = "google-client"
    service.settings.oauth_google_client_secret = "google-secret"
    service.settings.oauth_github_client_id = "github-client"
    service.settings.oauth_github_client_secret = "github-secret"

    def fake_post(url, *args, **kwargs):
        if "oauth2.googleapis.com/token" in url:
            return FakeResponse({"access_token": "google-access"})
        if "github.com/login/oauth/access_token" in url:
            return FakeResponse({"access_token": "github-access"})
        raise AssertionError(f"Unexpected POST {url}")

    def fake_get(url, *args, **kwargs):
        if "openidconnect.googleapis.com/v1/userinfo" in url:
            return FakeResponse(
                {
                    "sub": "google-subject",
                    "email": "google.user@example.com",
                    "given_name": "Google",
                    "family_name": "User",
                    "email_verified": True,
                }
            )
        if "api.github.com/user/emails" in url:
            return FakeResponse([
                {"email": "github.user@example.com", "primary": True, "verified": True},
            ])
        if "api.github.com/user" in url:
            return FakeResponse(
                {
                    "id": 98765,
                    "login": "github-user",
                    "name": "Git Hub",
                }
            )
        raise AssertionError(f"Unexpected GET {url}")

    monkeypatch.setattr("app.services.auth_service.httpx.post", fake_post)
    monkeypatch.setattr("app.services.auth_service.httpx.get", fake_get)

    google_start = service.oauth_start_url(
        "google", role_name="Candidate", redirect_uri="http://localhost/callback/google"
    )
    google_state = parse_qs(urlparse(google_start).query)["state"][0]
    google_token = service.oauth_callback(
        "google",
        code="google-code",
        state=google_state,
        redirect_uri="http://localhost/callback/google",
    )
    assert google_token.user is not None
    assert google_token.user.email == "google.user@example.com"
    assert google_token.redirect_to == "/candidate/dashboard"

    github_start = service.oauth_start_url(
        "github", role_name="Company", redirect_uri="http://localhost/callback/github"
    )
    github_state = parse_qs(urlparse(github_start).query)["state"][0]
    github_token = service.oauth_callback(
        "github",
        code="github-code",
        state=github_state,
        redirect_uri="http://localhost/callback/github",
    )
    assert github_token.user is not None
    assert github_token.user.email == "github.user@example.com"
    assert github_token.redirect_to == "/company/dashboard"
