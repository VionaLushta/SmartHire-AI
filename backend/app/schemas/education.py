from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EducationBase(BaseModel):
    resume_id: int
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


class EducationCreate(EducationBase):
    pass


class EducationUpdate(BaseModel):
    resume_id: int | None = None
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


class EducationRead(EducationBase):
    model_config = ConfigDict(from_attributes=True)

    education_id: int
