from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobCategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=255)


class JobCategoryCreate(JobCategoryBase):
    pass


class JobCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=255)


class JobCategoryRead(JobCategoryBase):
    model_config = ConfigDict(from_attributes=True)

    category_id: int
    deleted_at: datetime | None = None
