from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.validation import clean_optional_text, clean_text

ExportFormat = Literal["pdf", "json"]


class ResumeAdvisorRoadmapItem(BaseModel):
    week: int = Field(ge=1, le=12)
    focus: str
    goals: list[str]

    @field_validator("focus")
    @classmethod
    def validate_focus(cls, value: str) -> str:
        return clean_text(value, "Roadmap focus", max_length=255)

    @field_validator("goals")
    @classmethod
    def validate_goals(cls, value: list[str]) -> list[str]:
        return [
            clean_text(item, "Roadmap goal", max_length=255)
            for item in value
            if str(item or "").strip()
        ]


class ResumeAdvisorQualityCheck(BaseModel):
    formatting_score: int = Field(ge=0, le=100)
    readability_score: int = Field(ge=0, le=100)
    completeness_score: int = Field(ge=0, le=100)
    technical_skills_score: int = Field(ge=0, le=100)
    soft_skills_score: int = Field(ge=0, le=100)
    projects_score: int = Field(ge=0, le=100)
    certificates_score: int = Field(ge=0, le=100)
    languages_score: int = Field(ge=0, le=100)
    overall_quality_score: int = Field(ge=0, le=100)
    notes: list[str]

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, value: list[str]) -> list[str]:
        return [
            clean_text(item, "Quality check note", max_length=255)
            for item in value
            if str(item or "").strip()
        ]


class ResumeAdvisorReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_id: UUID
    candidate_id: UUID
    candidate_name: str
    resume_id: int
    source_resume_file: str | None = None
    generated_at: datetime
    resume_score: int = Field(ge=0, le=100)
    cv_summary: str
    strengths: list[str]
    weaknesses: list[str]
    missing_skills: list[str]
    suggested_skills: list[str]
    suggested_certificates: list[str]
    suggested_technologies: list[str]
    suggested_projects: list[str]
    career_advice: list[str]
    learning_roadmap: list[ResumeAdvisorRoadmapItem]
    quality_check: ResumeAdvisorQualityCheck
    detected_skills: list[str]
    education: list[str]
    certificates: list[str]
    languages: list[str]
    years_of_experience: float = Field(ge=0)

    @field_validator(
        "strengths",
        "weaknesses",
        "missing_skills",
        "suggested_skills",
        "suggested_certificates",
        "suggested_technologies",
        "suggested_projects",
        "career_advice",
        "detected_skills",
        "education",
        "certificates",
        "languages",
    )
    @classmethod
    def validate_text_list(cls, value: list[str]) -> list[str]:
        return [
            clean_optional_text(item, "Resume advisor item", max_length=255) or ""
            for item in value
            if str(item or "").strip()
        ]


class ResumeAdvisorExportResponse(BaseModel):
    format: ExportFormat
    file_path: str
    generated_at: datetime
    document_type: str = "Resume Advisor Report"


class ResumeAdvisorExportRequest(BaseModel):
    format: ExportFormat = "json"


class ResumeAdvisorViewResponse(ResumeAdvisorReport):
    export_formats: list[ExportFormat] = Field(default_factory=lambda: ["pdf", "json"])
    last_generated_export_path: str | None = None
    summary: str | None = None
