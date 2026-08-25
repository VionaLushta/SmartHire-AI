from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.validation import clean_optional_text, clean_text


class EducationBase(BaseModel):
    resume_id: int = Field(gt=0)
    institution: str = Field(min_length=1, max_length=255)
    degree: str | None = Field(default=None, max_length=255)
    field_of_study: str | None = Field(default=None, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "EducationBase":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be greater than or equal to start_date")
        return self

    @field_validator("institution")
    @classmethod
    def validate_institution(cls, value: str) -> str:
        return clean_text(value, "Institution", max_length=255)

    @field_validator("degree", "field_of_study", "description")
    @classmethod
    def validate_optional_text(cls, value: str | None, info) -> str | None:
        return (
            clean_optional_text(value, info.field_name or "Value", max_length=255)
            if value is not None
            else None
        )


class EducationCreate(EducationBase):
    pass


class EducationUpdate(BaseModel):
    resume_id: int | None = Field(default=None, gt=0)
    institution: str | None = Field(default=None, min_length=1, max_length=255)
    degree: str | None = Field(default=None, max_length=255)
    field_of_study: str | None = Field(default=None, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "EducationUpdate":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be greater than or equal to start_date")
        return self

    @field_validator("institution")
    @classmethod
    def validate_institution(cls, value: str | None) -> str | None:
        return clean_text(value, "Institution", max_length=255) if value is not None else None

    @field_validator("degree", "field_of_study", "description")
    @classmethod
    def validate_optional_text(cls, value: str | None, info) -> str | None:
        return (
            clean_optional_text(value, info.field_name or "Value", max_length=255)
            if value is not None
            else None
        )


class EducationRead(EducationBase):
    model_config = ConfigDict(from_attributes=True)

    education_id: int
