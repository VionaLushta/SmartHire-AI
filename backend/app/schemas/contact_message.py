from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.validation import clean_optional_text, clean_text


class ContactMessageCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    company: str | None = Field(default=None, max_length=150)
    subject: str = Field(min_length=2, max_length=255)
    message: str = Field(min_length=3, max_length=5000)

    @field_validator("full_name", "subject", "message")
    @classmethod
    def clean_required(cls, value: str, info) -> str:
        return clean_text(value, info.field_name, max_length=5000)

    @field_validator("company")
    @classmethod
    def clean_company(cls, value: str | None) -> str | None:
        return clean_optional_text(value, "Company", max_length=150)


class ContactMessageStatusUpdate(BaseModel):
    status: Literal["unread", "read", "replied"]


class ContactMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message_id: int
    full_name: str
    email: EmailStr
    company: str | None
    subject: str
    message: str
    status: str
    created_at: datetime
    read_at: datetime | None


class ContactMessageListResponse(BaseModel):
    items: list[ContactMessageRead]
    total: int
    unread_count: int
