from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CompanyDashboardRecentApplication(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    application_id: int
    job_id: int
    status: str | None
    created_at: datetime


class CompanyDashboardResponse(BaseModel):
    company_id: int
    company_name: str
    industry: str | None
    website: str | None
    logo: str | None
    location: str | None
    total_jobs: int
    active_jobs: int
    closed_jobs: int
    departments_count: int
    applications_count: int
    interviews_count: int
    pending_applications: int
    ai_average_score: float | None
    recent_applications: list[CompanyDashboardRecentApplication]
