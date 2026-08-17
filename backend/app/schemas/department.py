from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class DepartmentBase(BaseModel):
    company_id: int
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=255)


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    company_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=255)


class DepartmentRead(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    department_id: int
