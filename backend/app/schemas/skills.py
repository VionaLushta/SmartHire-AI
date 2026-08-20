from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class JobSkillRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    skill_id: int
    name: str
    category: str | None = None
    is_required: bool = True
    required_level: int | None = None


class JobSkillGroupResponse(BaseModel):
    job_id: int
    required_skills: list[JobSkillRead]
    optional_skills: list[JobSkillRead]


class JobSkillUpsertRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str | None = Field(default=None, max_length=120)
    is_required: bool = True
    required_level: int | None = Field(default=None, ge=0)


class JobSkillUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    category: str | None = Field(default=None, max_length=120)
    is_required: bool | None = None
    required_level: int | None = Field(default=None, ge=0)


class SkillEvaluationItem(BaseModel):
    skill_id: int | None = None
    name: str
    category: str | None = None
    is_required: bool = True
    status: Literal["Detected", "Missing", "Partial Match"]
    match_score: float = Field(ge=0, le=100)


class CandidateSkillReportResponse(BaseModel):
    candidate_id: uuid.UUID
    candidate_name: str
    job_id: int | None = None
    job_title: str | None = None
    resume_similarity: float = Field(ge=0, le=100)
    required_skill_coverage: float = Field(ge=0, le=100)
    optional_skill_coverage: float = Field(ge=0, le=100)
    final_skill_match: float = Field(ge=0, le=100)
    strengths: list[str]
    gaps: list[str]
    report: list[SkillEvaluationItem]


class SkillStatPoint(BaseModel):
    label: str
    value: float = Field(ge=0)


class JobSkillCoverageStat(BaseModel):
    job_id: int
    job_title: str
    average_skill_match: float = Field(ge=0, le=100)
    required_skills_coverage: float = Field(ge=0, le=100)
    optional_skills_coverage: float = Field(ge=0, le=100)


class SkillAnalyticsResponse(BaseModel):
    scope: str = "skills"
    most_common_skills: list[SkillStatPoint]
    most_missing_skills: list[SkillStatPoint]
    top_skills_across_candidates: list[SkillStatPoint]
    average_skill_match_per_job: list[JobSkillCoverageStat]
    required_skills_coverage: list[SkillStatPoint]
    optional_skills_coverage: list[SkillStatPoint]
