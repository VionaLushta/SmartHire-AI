from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


class CandidateDashboardResume(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    resume_id: int
    user_id: uuid.UUID
    file_path: str
    parsed_text: str | None = None


class CandidateDashboardRecommendedJob(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: int
    title: str
    company_id: int
    company_name: str
    department_id: int | None = None
    department_name: str | None = None
    location: str | None = None
    remote_option: bool
    deadline: date | None = None
    status: str | None = None


class CandidateDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    profile_completion_percent: int
    uploaded_resume: CandidateDashboardResume | None
    certificates_count: int
    applications_count: int
    interviews_count: int
    saved_jobs_count: int
    recommended_jobs: list[CandidateDashboardRecommendedJob]
    training_enrollments_count: int
