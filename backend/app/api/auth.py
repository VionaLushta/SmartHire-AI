from __future__ import annotations

from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_user, require_candidate
from app.core.security import ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME
from app.database.database import get_db
from app.schemas.auth import (
    CurrentUserResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
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


def _frontend_url(path: str, **query: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    url = f"{base}{path}"
    if query:
        url = f"{url}?{urlencode(query)}"
    return url


def _backend_callback_url(request: Request, provider: str, *, action: str = "callback") -> str:
    backend_url = get_settings().backend_url.rstrip("/")
    if backend_url:
        if provider == "google" and action in {"login", "callback"}:
            return f"{backend_url}/auth/google/callback"
        return f"{backend_url}/auth/oauth/{provider}/{action}"
    if provider == "google" and action in {"login", "callback"}:
        return str(request.url_for("google_callback"))
    return str(request.url_for("oauth_callback", provider=provider))


def _oauth_error_message(provider: str, error_code: str, detail: str | None = None) -> str:
    label = provider.strip().capitalize() or "OAuth"
    if error_code == "cancelled":
        return f"{label} Sign-In was cancelled."
    if error_code == "network":
        return f"Network issue while connecting to {label}. Please try again."
    if detail:
        return detail
    return f"{label} Sign-In could not be completed. Please try again."


def _oauth_error_redirect(
    *,
    provider: str,
    source: str | None,
    error_code: str,
    detail: str | None = None,
) -> RedirectResponse:
    login_path = "/candidate/register" if source == "register" else "/candidate/login"
    return RedirectResponse(
        url=_frontend_url(
            login_path,
            oauth_error=error_code,
            oauth_provider=provider,
            oauth_message=_oauth_error_message(provider, error_code, detail),
        ),
        status_code=status.HTTP_302_FOUND,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a candidate or company",
    description="Creates a public account, sends email verification, and returns onboarding metadata.",
)
def register(
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> TokenResponse:
    return AuthenticationService(db, background_tasks=background_tasks).register(payload)


@router.post("/candidate/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def candidate_register(
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> TokenResponse:
    payload.role_name = "Candidate"
    return AuthenticationService(db, background_tasks=background_tasks).register(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate a user",
    description="Verifies credentials, rotates refresh tokens, and issues an authenticated session.",
)
def login(
    payload: LoginRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    client_ip = forwarded_for or (request.client.host if request.client else None)
    token = AuthenticationService(db, background_tasks=background_tasks).login(
        payload,
        login_metadata={
            "device": request.headers.get("user-agent") or "Unknown browser",
            "ip_address": client_ip,
        },
    )
    _set_auth_cookies(response, token, remember_me=payload.remember_me)
    return token


@router.post("/candidate/login", response_model=TokenResponse, summary="Authenticate a candidate")
def candidate_login(
    payload: LoginRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    token = AuthenticationService(db, background_tasks=background_tasks).candidate_login(
        payload,
        login_metadata={
            "device": request.headers.get("user-agent") or "Unknown browser",
            "ip_address": forwarded_for or (request.client.host if request.client else None),
            "login_method": "Email",
        },
    )
    _set_auth_cookies(response, token, remember_me=payload.remember_me)
    return token


@router.post("/admin/login", response_model=TokenResponse, summary="Authenticate an administrator")
def admin_login(
    payload: LoginRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    token = AuthenticationService(db, background_tasks=background_tasks).admin_login(
        payload,
        login_metadata={
            "device": request.headers.get("user-agent") or "Unknown browser",
            "ip_address": request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else None),
            "login_method": "Email",
        },
    )
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


@router.post("/candidate/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_candidate_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> None:
    AuthenticationService(db).change_password(current_user, payload)


@router.get(
    "/verify-email",
    response_model=CurrentUserResponse,
    summary="Verify a user email address",
)
def verify_email(
    token: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> CurrentUserResponse:
    service = AuthenticationService(db, background_tasks=background_tasks)
    return service.verify_email(token)


@router.get(
    "/google/login",
    summary="Start Google OAuth login",
)
def google_login(
    request: Request,
    role_name: str = "Candidate",
    source: str = "login",
    audience: str = "candidate",
    db: Session = Depends(get_db),
) -> RedirectResponse:
    service = AuthenticationService(db)
    redirect_uri = _backend_callback_url(request, "google")
    url = service.oauth_start_url("google", role_name="Candidate", redirect_uri=redirect_uri, source=source, audience=audience)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get(
    "/google/callback",
    summary="Finish Google OAuth login",
)
def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    return _oauth_callback_response(
        provider="google",
        request=request,
        code=code,
        state=state,
        error=error,
        error_description=error_description,
        db=db,
    )


def _oauth_callback_response(
    *,
    provider: str,
    request: Request,
    code: str | None,
    state: str | None,
    error: str | None,
    error_description: str | None,
    db: Session,
) -> RedirectResponse:
    service = AuthenticationService(db)
    source = service.oauth_source_from_state(state)

    if error:
        normalized_error = "cancelled" if error in {"access_denied", "user_cancelled", "cancelled"} else "failed"
        if error_description and "denied" in error_description.lower():
            normalized_error = "cancelled"
        return _oauth_error_redirect(
            provider=provider,
            source=source,
            error_code=normalized_error,
            detail=error_description,
        )

    if not code or not state:
        return _oauth_error_redirect(provider=provider, source=source, error_code="failed")

    redirect_uri = _backend_callback_url(request, provider)
    try:
        forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        token = service.oauth_callback(
            provider,
            code=code,
            state=state,
            redirect_uri=redirect_uri,
            login_metadata={
                "device": request.headers.get("user-agent") or "Unknown browser",
                "ip_address": forwarded_for or (request.client.host if request.client else None),
                "login_method": provider.capitalize(),
            },
        )
    except httpx.RequestError:
        return _oauth_error_redirect(provider=provider, source=source, error_code="network")
    except httpx.HTTPStatusError as exc:
        error_code = "network" if int(getattr(exc.response, "status_code", 0) or 0) >= 500 else "failed"
        return _oauth_error_redirect(
            provider=provider,
            source=source,
            error_code=error_code,
            detail=str(exc),
        )
    except HTTPException as exc:
        status_code = int(exc.status_code or 500)
        error_code = "network" if status_code >= 500 else "failed"
        return _oauth_error_redirect(
            provider=provider,
            source=source,
            error_code=error_code,
            detail=str(exc.detail),
        )
    except Exception:
        return _oauth_error_redirect(provider=provider, source=source, error_code="network")

    frontend_url = service.build_oauth_callback_redirect(token, remember_me=True)
    redirect_response = RedirectResponse(url=frontend_url, status_code=status.HTTP_302_FOUND)
    _set_auth_cookies(redirect_response, token, remember_me=True)
    return redirect_response


@router.get(
    "/oauth/{provider}/start",
    summary="Start an OAuth flow",
)
def oauth_start(
    provider: str,
    request: Request,
    role_name: str = "Candidate",
    source: str = "login",
    audience: str = "candidate",
    db: Session = Depends(get_db),
) -> RedirectResponse:
    service = AuthenticationService(db)
    redirect_uri = _backend_callback_url(request, provider)
    url = service.oauth_start_url(provider, role_name="Candidate", redirect_uri=redirect_uri, source=source, audience=audience)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get(
    "/oauth/{provider}/callback",
    summary="Finish an OAuth flow",
)
def oauth_callback(
    provider: str,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    return _oauth_callback_response(
        provider=provider,
        request=request,
        code=code,
        state=state,
        error=error,
        error_description=error_description,
        db=db,
    )
