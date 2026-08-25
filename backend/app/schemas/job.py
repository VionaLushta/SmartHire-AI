from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.validation import clean_optional_text, clean_text


class JobBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    employment_type: str | None = Field(default=None, max_length=100)
    experience_level: str | None = Field(default=None, max_length=100)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=255)
    remote_option: bool = False
    company_id: int = Field(gt=0)
    department_id: int | None = Field(default=None, gt=0)
    category_ids: list[int] = Field(default_factory=list)
    deadline: date | None = None
    status: str | None = Field(default=None, max_length=50)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        return clean_text(value, "Job title", max_length=255)

    @field_validator("employment_type", "experience_level", "location", "status")
    @classmethod
    def validate_optional_text(cls, value: str | None, info) -> str | None:
        return (
            clean_optional_text(value, info.field_name or "Value", max_length=255)
            if value is not None
            else None
        )

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        return clean_optional_text(value, "Description", max_length=5000)

    @field_validator("category_ids")
    @classmethod
    def validate_category_ids(cls, value: list[int]) -> list[int]:
        unique_ids = []
        for category_id in value:
            if category_id <= 0:
                raise ValueError("category_ids must contain positive integers.")
            if category_id not in unique_ids:
                unique_ids.append(category_id)
        return unique_ids

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
    company_id: int | None = Field(default=None, gt=0)
    department_id: int | None = Field(default=None, gt=0)
    category_ids: list[int] | None = None
    deadline: date | None = None
    status: str | None = Field(default=None, max_length=50)

    @field_validator("title", "employment_type", "experience_level", "location", "status")
    @classmethod
    def validate_optional_text(cls, value: str | None, info) -> str | None:
        return (
            clean_optional_text(value, info.field_name or "Value", max_length=255)
            if value is not None
            else None
        )

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        return clean_optional_text(value, "Description", max_length=5000)

    @field_validator("category_ids")
    @classmethod
    def validate_category_ids(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return None
        unique_ids = []
        for category_id in value:
            if category_id <= 0:
                raise ValueError("category_ids must contain positive integers.")
            if category_id not in unique_ids:
                unique_ids.append(category_id)
        return unique_ids

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
