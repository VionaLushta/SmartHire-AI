from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class JobDashboardRequiredSkill(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    skill_id: int
    name: str
    category: str | None = None


class JobDashboardCompany(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_id: int
    name: str
    industry: str | None = None
    website: str | None = None
    logo: str | None = None
    location: str | None = None


class JobDashboardDepartment(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    department_id: int
    company_id: int
    name: str
    description: str | None = None


class JobDashboardJob(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: int
    title: str
    description: str | None = None
    employment_type: str | None = None
    experience_level: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    location: str | None = None
    remote_option: bool
    deadline: date | None = None
    status: str | None = None


class JobDashboardApplicant(BaseModel):
    application_id: int
    user_id: uuid.UUID
    user_name: str
    resume_id: int | None = None
    status: str | None = None
    overall_score: float | None = None
    created_at: datetime


class JobDashboardRecentApplication(BaseModel):
    application_id: int
    user_id: uuid.UUID
    user_name: str
    status: str | None = None
    created_at: datetime


class JobDashboardResponse(BaseModel):
    job: JobDashboardJob
    company: JobDashboardCompany
    department: JobDashboardDepartment | None
    required_skills: list[JobDashboardRequiredSkill]
    applicants_count: int
    ai_average_score: float | None
    top_candidates: list[JobDashboardApplicant]
    interview_count: int
    hiring_status: str
    recent_applications: list[JobDashboardRecentApplication]
