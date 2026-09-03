from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.validation import (
    clean_text,
    validate_http_url,
    validate_phone_number,
)


class CandidateBase(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    profile_picture_url: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    linkedin_url: str | None = Field(default=None, max_length=255)
    github_url: str | None = Field(default=None, max_length=255)
    portfolio_url: str | None = Field(default=None, max_length=255)
    about_me: str | None = Field(default=None, max_length=4000)

    @field_validator("first_name", "last_name", "city", "country")
    @classmethod
    def validate_optional_text(cls, value: str | None, info) -> str | None:
        return (
            clean_text(value, info.field_name or "Value", max_length=100)
            if value is not None
            else None
        )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        return validate_phone_number(value)

    @field_validator("profile_picture_url", "linkedin_url", "github_url", "portfolio_url")
    @classmethod
    def validate_urls(cls, value: str | None, info) -> str | None:
        return validate_http_url(value, info.field_name or "URL")


class CandidateUpdate(CandidateBase):
    pass


class CandidateRead(CandidateBase):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    role_id: int
    created_at: datetime
    updated_at: datetime
    resumes: list[dict] = Field(default_factory=list)
    certificates: list[dict] = Field(default_factory=list)
    education: list[dict] = Field(default_factory=list)
    experience: list[dict] = Field(default_factory=list)
