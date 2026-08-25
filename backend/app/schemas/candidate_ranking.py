from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

RankingRiskLevel = Literal["Low", "Medium", "High", "Critical"]
HiringRecommendation = Literal["Hire", "Interview", "Manual Review", "Hold", "Reject"]
ExportFormat = Literal["csv", "json", "powerbi"]


class CandidateRankingItem(BaseModel):
    application_id: int
    candidate_id: UUID
    candidate_name: str
    job_id: int
    job_title: str | None = None
    ranking_position: int = Field(ge=1)
    overall_score: int = Field(ge=0, le=100)
    confidence_score: int = Field(ge=0, le=100)
    ai_match_score: float = Field(ge=0, le=100)
    detected_skills: list[str]
    missing_skills: list[str]
    experience_years: float = Field(ge=0)
    education: list[str]
    certificates: list[str]
    languages: list[str]
    interview_readiness: int = Field(ge=0, le=100)
    recruiter_rating: float | None = Field(default=None, ge=0, le=100)
    ranking_explanation: str
    strengths: list[str]
    weaknesses: list[str]
    risk_level: RankingRiskLevel
    hiring_recommendation: HiringRecommendation

    @field_validator(
        "detected_skills",
        "missing_skills",
        "education",
        "certificates",
        "languages",
        "strengths",
        "weaknesses",
    )
    @classmethod
    def _strip_items(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if str(item or "").strip()]


class CandidateComparisonItem(BaseModel):
    candidate_id: UUID
    candidate_name: str
    ranking_position: int
    overall_score: int
    ai_match_score: float
    experience_years: float
    education: list[str]
    certificates: list[str]
    languages: list[str]
    interview_readiness: int
    recruiter_rating: float | None = None
    strengths: list[str]
    weaknesses: list[str]
    risk_level: RankingRiskLevel
    hiring_recommendation: HiringRecommendation


class CandidateRankingShortlist(BaseModel):
    top_5: list[CandidateRankingItem]
    top_10: list[CandidateRankingItem]
    top_20: list[CandidateRankingItem]
    best_junior_candidate: CandidateRankingItem | None = None
    best_senior_candidate: CandidateRankingItem | None = None
    best_overall_candidate: CandidateRankingItem | None = None


class CandidateRankingSupport(BaseModel):
    recommended_interview_order: list[CandidateRankingItem]
    recommended_hiring_order: list[CandidateRankingItem]
    candidates_requiring_manual_review: list[CandidateRankingItem]
    candidates_requiring_additional_interview: list[CandidateRankingItem]


class CandidateRankingResponse(BaseModel):
    job_id: int
    job_title: str | None = None
    total_candidates: int
    generated_at: datetime
    ranking: list[CandidateRankingItem]
    shortlist: CandidateRankingShortlist
    support: CandidateRankingSupport
    comparison: list[CandidateComparisonItem] = Field(default_factory=list)


class CandidateRankingExportResponse(BaseModel):
    format: ExportFormat
    job_id: int
    job_title: str | None = None
    generated_at: datetime
    dataset: str
    columns: list[str]
    rows: list[dict[str, Any]]
