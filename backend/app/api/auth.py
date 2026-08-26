from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.core.security import ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME
from app.database.database import get_db
from app.schemas.auth import (
    CurrentUserResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.services.auth_service import AuthenticationService

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, token: TokenResponse, *, remember_me: bool = True) -> None:
    settings = get_settings()
    access_max_age = int(token.expires_in) if (remember_me and token.expires_in) else None
    refresh_max_age = (
        (settings.remember_me_refresh_token_expire_days if remember_me else settings.refresh_token_expire_days)
        * 24
        * 60
        * 60
        if remember_me
        else None
    )
    if token.access_token:
        response.set_cookie(
            ACCESS_TOKEN_COOKIE_NAME,
            token.access_token,
            max_age=access_max_age,
            httponly=True,
            secure=settings.cookie_secure,
            samesite=settings.cookie_same_site,
            path="/",
        )
    if token.refresh_token:
        response.set_cookie(
            REFRESH_TOKEN_COOKIE_NAME,
            token.refresh_token,
            max_age=refresh_max_age,
            httponly=True,
            secure=settings.cookie_secure,
            samesite=settings.cookie_same_site,
            path="/",
        )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_TOKEN_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_TOKEN_COOKIE_NAME, path="/")


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a candidate or company",
    description="Creates a public account, sends email verification, and returns onboarding metadata.",
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return AuthenticationService(db).register(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate a user",
    description="Verifies credentials, rotates refresh tokens, and issues an authenticated session.",
)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    token = AuthenticationService(db).login(payload)
    _set_auth_cookies(response, token, remember_me=payload.remember_me)
    return token


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate a refresh token",
    description="Revokes the submitted refresh token and issues a new token pair.",
)
def refresh(
    request: Request,
    response: Response,
    payload: RefreshRequest | None = None,
    db: Session = Depends(get_db),
) -> TokenResponse:
    token_value = (payload.refresh_token if payload else None) or (request.cookies.get(REFRESH_TOKEN_COOKIE_NAME) if request else None)
    remember_me = payload.remember_me if payload else True
    token = AuthenticationService(db).refresh(payload, refresh_token=token_value)
    if response is not None:
        _set_auth_cookies(response, token, remember_me=remember_me)
    return token


@router.post(
    "/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke a refresh token"
)
def logout(
    request: Request,
    response: Response,
    payload: RefreshRequest | None = None,
    db: Session = Depends(get_db),
) -> None:
    token_value = (payload.refresh_token if payload else None) or (request.cookies.get(REFRESH_TOKEN_COOKIE_NAME) if request else None)
    AuthenticationService(db).logout(payload, refresh_token=token_value)
    if response is not None:
        _clear_auth_cookies(response)


@router.get(
    "/me", response_model=CurrentUserResponse, summary="Get the authenticated user"
)
def me(
    current_user: CurrentUserResponse = Depends(get_current_user),
) -> CurrentUserResponse:
    return current_user


@router.post(
    "/forgot-password",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request a password reset",
)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    AuthenticationService(db).request_password_reset(payload)
    return {"message": "If the account exists, a password reset email has been sent."}


@router.post(
    "/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reset a password",
)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> None:
    AuthenticationService(db).reset_password(payload)


@router.get(
    "/verify-email",
    summary="Verify a user email address",
)
def verify_email(token: str, db: Session = Depends(get_db)) -> RedirectResponse:
    service = AuthenticationService(db)
    user = service.verify_email(token)
    redirect_url = get_settings().frontend_base_url.rstrip("/") + "/email-verification-success"
    if user.role_name == "Company":
        redirect_url += "?role=company"
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.get(
    "/oauth/{provider}/start",
    summary="Start an OAuth flow",
)
def oauth_start(
    provider: str,
    request: Request,
    role_name: str = "Candidate",
    db: Session = Depends(get_db),
) -> RedirectResponse:
    service = AuthenticationService(db)
    redirect_uri = str(request.url_for("oauth_callback", provider=provider))
    url = service.oauth_start_url(provider, role_name=role_name, redirect_uri=redirect_uri)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get(
    "/oauth/{provider}/callback",
    summary="Finish an OAuth flow",
)
def oauth_callback(
    provider: str,
    code: str,
    state: str,
    request: Request,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    service = AuthenticationService(db)
    redirect_uri = str(request.url_for("oauth_callback", provider=provider))
    token = service.oauth_callback(provider, code=code, state=state, redirect_uri=redirect_uri)
    frontend_url = get_settings().frontend_base_url.rstrip("/") + token.redirect_to
    redirect_response = RedirectResponse(url=frontend_url, status_code=status.HTTP_302_FOUND)
    _set_auth_cookies(redirect_response, token, remember_me=True)
    return redirect_response
