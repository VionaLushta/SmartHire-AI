from __future__ import annotations

import uuid
import logging
from typing import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose.exceptions import ExpiredSignatureError, JWTError
from sqlalchemy.orm import Session

from app.core.security import ACCESS_TOKEN_COOKIE_NAME
from app.core.security import decode_token
from app.database.database import get_db
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import CurrentUserResponse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
logger = logging.getLogger("smarthire.security")


def get_current_user(
    request: Request, token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> CurrentUserResponse:
    token = token or request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        logger.warning("security_event type=auth missing_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(token)
    except ExpiredSignatureError:
        logger.warning("security_event type=auth expired_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        logger.warning("security_event type=auth invalid_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        logger.warning("security_event type=auth invalid_token_type token_type=%s", payload.get("type"))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type."
        )

    user_id = payload.get("sub")
    if not user_id:
        logger.warning("security_event type=auth missing_subject")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject."
        )

    try:
        user_uuid = uuid.UUID(str(user_id))
    except ValueError:
        logger.warning("security_event type=auth malformed_subject subject=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject."
        )

    repo = AuthRepository(db)
    user = repo.get_user_by_id(user_uuid)
    if user is None:
        logger.warning("security_event type=auth user_not_found user_id=%s", user_uuid)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found."
        )
    if "email_verified_at" in user:
        user["is_verified"] = user["email_verified_at"] is not None

    return CurrentUserResponse.model_validate(user)


def get_current_active_user(
    current_user: CurrentUserResponse = Depends(get_current_user),
) -> CurrentUserResponse:
    return current_user


def require_role(*roles: str) -> Callable:
    normalized_roles = {role.lower() for role in roles}

    def dependency(
        current_user: CurrentUserResponse = Depends(get_current_user),
    ) -> CurrentUserResponse:
        role_name = str(current_user.role_name or "").lower()
        if role_name == "admin":
            return current_user
        if normalized_roles and role_name not in normalized_roles:
            logger.warning(
                "security_event type=permission_denied user_id=%s role=%s allowed=%s",
                current_user.user_id,
                current_user.role_name,
                sorted(normalized_roles),
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        return current_user

    return dependency
