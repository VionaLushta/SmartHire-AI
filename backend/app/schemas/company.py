from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.validation import clean_text, validate_http_url


class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    industry: str = Field(min_length=1, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    logo: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)

    @field_validator("name", "industry")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        return clean_text(value, "Value", max_length=255)

    @field_validator("website", "logo")
    @classmethod
    def validate_urls(cls, value: str | None, info) -> str | None:
        return validate_http_url(value, info.field_name or "URL")

    @field_validator("location")
    @classmethod
    def validate_location(cls, value: str | None) -> str | None:
        return clean_text(value, "Location", max_length=255) if value is not None else None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    industry: str | None = Field(default=None, min_length=1, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    logo: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)

    @field_validator("name", "industry")
    @classmethod
    def validate_required_text(cls, value: str | None) -> str | None:
        return clean_text(value, "Value", max_length=255) if value is not None else None

    @field_validator("website", "logo")
    @classmethod
    def validate_urls(cls, value: str | None, info) -> str | None:
        return validate_http_url(value, info.field_name or "URL")

    @field_validator("location")
    @classmethod
    def validate_location(cls, value: str | None) -> str | None:
        return clean_text(value, "Location", max_length=255) if value is not None else None


class CompanyRead(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    company_id: int
