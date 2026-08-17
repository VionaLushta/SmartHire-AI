from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.auth_service import AuthenticationService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a candidate",
    description="Creates a candidate account and returns an access token with a persisted refresh token.",
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return AuthenticationService(db).register(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate a user",
    description="Verifies credentials and issues access and refresh tokens.",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return AuthenticationService(db).login(payload)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate a refresh token",
    description="Revokes the submitted refresh token and issues a new token pair.",
)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return AuthenticationService(db).refresh(payload)


@router.post(
    "/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke a refresh token"
)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)) -> None:
    AuthenticationService(db).logout(payload)


@router.get(
    "/me", response_model=CurrentUserResponse, summary="Get the authenticated user"
)
def me(
    current_user: CurrentUserResponse = Depends(get_current_user),
) -> CurrentUserResponse:
    return current_user
