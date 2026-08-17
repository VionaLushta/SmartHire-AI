from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class JobBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    employment_type: str | None = Field(default=None, max_length=100)
    experience_level: str | None = Field(default=None, max_length=100)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=255)
    remote_option: bool = False
    company_id: int
    department_id: int | None = None
    category_ids: list[int] = Field(default_factory=list)
    deadline: date | None = None
    status: str | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def validate_salary(self) -> "JobBase":
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValueError("salary_min must be less than or equal to salary_max")
        return self

    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("deadline cannot be in the past")
        return value


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    employment_type: str | None = Field(default=None, max_length=100)
    experience_level: str | None = Field(default=None, max_length=100)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=255)
    remote_option: bool | None = None
    company_id: int | None = None
    department_id: int | None = None
    category_ids: list[int] | None = None
    deadline: date | None = None
    status: str | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def validate_salary(self) -> "JobUpdate":
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValueError("salary_min must be less than or equal to salary_max")
        return self

    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("deadline cannot be in the past")
        return value


class JobRead(JobBase):
    model_config = ConfigDict(from_attributes=True)

    job_id: int
    created_at: datetime
    updated_at: datetime
    category_ids: list[int] = Field(default_factory=list)
