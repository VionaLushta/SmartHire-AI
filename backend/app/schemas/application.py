from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class ApplicationCreate(BaseModel):
    job_id: int
    resume_id: int | None = None

class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    application_id: int
    user_id: UUID
    job_id: int
    resume_id: int | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    candidate_name: str | None = None
    candidate_email: str | None = None
    job_title: str | None = None
    company_name: str | None = None
    department_id: int | None = None
    department_name: str | None = None
    resume_file_path: str | None = None
    overall_score: float | None = None
    resume_score: float | None = None
    skills_score: float | None = None
    experience_score: float | None = None
    education_score: float | None = None
    language_score: float | None = None
    missing_skills: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    ai_recommendation: str | None = None
    cover_letter: str | None = None

class ApplicationListResponse(BaseModel):
    total_items: int
    items: list[ApplicationRead]
