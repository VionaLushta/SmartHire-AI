from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.validation import clean_text, validate_password_strength


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    remember_me: bool = True


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    city: str | None = Field(default=None, max_length=100)
    password: str = Field(min_length=8)
    confirm_password: str | None = Field(default=None, min_length=8)
    # Public registration must never grant a privileged role unless the backend allows it.
    role_name: Literal["Candidate", "Company", "Admin"] = "Candidate"
    company_name: str | None = Field(default=None, max_length=255)
    accept_terms: bool = True

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return clean_text(value, "Name", max_length=100)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return clean_text(value, "Phone number", max_length=30)

    @field_validator("city")
    @classmethod
    def validate_city(cls, value: str | None) -> str | None:
        return clean_text(value, "City", max_length=100) if value is not None else None

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, value: str | None) -> str | None:
        return clean_text(value, "Organization name", max_length=255) if value is not None else None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("confirm_password")
    @classmethod
    def validate_confirm_password(cls, value: str | None, info) -> str | None:
        password = info.data.get("password") if info.data else None
        if value is not None and password and value != password:
            raise ValueError("Passwords do not match.")
        return value

class RefreshRequest(BaseModel):
    refresh_token: str | None = Field(default=None, min_length=1)
    remember_me: bool = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("confirm_password")
    @classmethod
    def validate_confirm_password(cls, value: str, info) -> str:
        password = info.data.get("password") if info.data else None
        if password and value != password:
            raise ValueError("Passwords do not match.")
        return value


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8)
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("confirm_password")
    @classmethod
    def validate_confirm_password(cls, value: str, info) -> str:
        if info.data.get("password") and value != info.data["password"]:
            raise ValueError("Passwords do not match.")
        return value


class TokenResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int = 0
    requires_verification: bool = False
    redirect_to: str | None = None
    user: "CurrentUserResponse | None" = None


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    role_id: int
    role_name: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    email_verified_at: datetime | None = None
    last_login_at: datetime | None = None
    auth_provider: str | None = None
    auth_provider_subject: str | None = None
    company_id: int | None = None
    company_name: str | None = None
    company_position: str | None = None
    is_verified: bool | None = None
    profile_picture_url: str | None = None
    city: str | None = None
    country: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None
    about_me: str | None = None
    created_at: datetime
    updated_at: datetime


TokenResponse.model_rebuild()
CurrentUserResponse.model_rebuild()
