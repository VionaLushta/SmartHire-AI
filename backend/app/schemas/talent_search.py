from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.validation import clean_optional_text, clean_text, validate_phone_number

ExportFormat = Literal["csv", "json", "powerbi"]
TalentSearchSort = Literal[
    "highest_match",
    "lowest_match",
    "newest",
    "oldest",
    "experience",
    "education",
    "recruiter_rating",
    "interview_readiness",
]
TalentQuickFilter = Literal[
    "top_ranked",
    "recently_applied",
    "interview_scheduled",
    "high_match",
    "needs_review",
    "rejected",
    "accepted",
    "most_experienced",
]
EducationLevel = Literal["High School", "Associate", "Bachelor", "Master", "Doctorate", "Other"]


class TalentSearchFilters(BaseModel):
    query: str | None = Field(default=None, max_length=500)
    smart_filter: TalentQuickFilter | None = None
    sort_by: TalentSearchSort = "highest_match"
    limit: int = Field(default=50, ge=1, le=200)
    min_ai_match_score: float | None = Field(default=None, ge=0, le=100)
    min_recruiter_rating: float | None = Field(default=None, ge=0, le=100)
    min_years_of_experience: float | None = Field(default=None, ge=0)
    education_level: EducationLevel | None = None
    certificate_count: int | None = Field(default=None, ge=0)
    language: str | None = Field(default=None, max_length=120)
    required_skills: list[str] = []
    missing_skills: list[str] = []
    applied_position: str | None = Field(default=None, max_length=255)
    interview_status: str | None = Field(default=None, max_length=50)
    application_status: str | None = Field(default=None, max_length=50)
    recruiter_status: str | None = Field(default=None, max_length=50)
    application_date_from: date | None = None
    application_date_to: date | None = None

    @field_validator("query", "language", "applied_position", "interview_status", "application_status", "recruiter_status")
    @classmethod
    def _clean_optional_text(cls, value: str | None, info) -> str | None:
        return clean_optional_text(value, info.field_name or "Filter", max_length=500)

    @field_validator("required_skills", "missing_skills")
    @classmethod
    def _clean_skill_list(cls, value: list[str]) -> list[str]:
        return [clean_text(item, "Skill filter", max_length=120) for item in value if str(item or "").strip()]


class TalentSearchItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    candidate_id: UUID
    candidate_name: str
    email: EmailStr
    phone: str | None = None
    university: str | None = None
    degree: str | None = None
    education_level: EducationLevel = "Other"
    skills: list[str]
    missing_skills: list[str]
    certificates: list[str]
    languages: list[str]
    applied_positions: list[str]
    job_position: str | None = None
    experience_level: str | None = None
    recruiter_status: str | None = None
    interview_status: str | None = None
    application_status: str | None = None
    ai_match_score: float = Field(ge=0, le=100)
    talent_score: int = Field(ge=0, le=100)
    recruiter_rating: float | None = Field(default=None, ge=0, le=100)
    years_of_experience: float = Field(ge=0)
    application_date: datetime | None = None
    interview_readiness: int = Field(ge=0, le=100)
    relevance_score: int = Field(ge=0, le=100)
    favorite_list_ids: list[UUID] = Field(default_factory=list)
    favorite_list_names: list[str] = Field(default_factory=list)
    is_bookmarked: bool = False
    search_reasons: list[str] = Field(default_factory=list)

    @field_validator(
        "candidate_name",
        "phone",
        "university",
        "degree",
        "job_position",
        "experience_level",
        "recruiter_status",
        "interview_status",
        "application_status",
    )
    @classmethod
    def _clean_optional_fields(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        return clean_text(value, info.field_name or "Talent search field", max_length=255)

    @field_validator("skills", "missing_skills", "certificates", "languages", "applied_positions", "favorite_list_names", "search_reasons")
    @classmethod
    def _clean_lists(cls, value: list[str]) -> list[str]:
        return [clean_optional_text(item, "Talent search item", max_length=255) or "" for item in value if str(item or "").strip()]

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        return validate_phone_number(value)


class TalentSearchResponse(BaseModel):
    generated_at: datetime
    total_candidates: int
    query: str | None = None
    smart_filter: TalentQuickFilter | None = None
    sort_by: TalentSearchSort
    items: list[TalentSearchItem]


class TalentPoolFavoriteCreate(BaseModel):
    list_name: str = Field(min_length=1, max_length=120)
    candidate_ids: list[UUID] = Field(min_length=1)
    notes: str | None = Field(default=None, max_length=1000)
    move_from_favorite_id: UUID | None = None

    @field_validator("list_name", "notes")
    @classmethod
    def _clean_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        return clean_text(value, info.field_name or "Favorite field", max_length=1000)


class TalentPoolFavorite(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    favorite_id: UUID
    owner_user_id: UUID
    list_name: str
    candidate_ids: list[UUID]
    candidate_names: list[str]
    candidate_count: int
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("list_name", "notes")
    @classmethod
    def _clean_optional_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        return clean_text(value, info.field_name or "Favorite field", max_length=1000)

    @field_validator("candidate_names")
    @classmethod
    def _clean_candidate_names(cls, value: list[str]) -> list[str]:
        return [clean_optional_text(item, "Candidate name", max_length=255) or "" for item in value if str(item or "").strip()]


class TalentSearchExportResponse(BaseModel):
    format: ExportFormat
    generated_at: datetime
    dataset: str
    columns: list[str]
    rows: list[dict[str, Any]]
    total_candidates: int
