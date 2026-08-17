from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    industry: str = Field(min_length=1, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    logo: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    industry: str | None = Field(default=None, min_length=1, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    logo: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)


class CompanyRead(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    company_id: int
