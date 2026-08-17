from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ParsedResumeResponse(BaseModel):
    pages: int
    language: str
    text: str
    characters: int


class SkillExtractionRequest(BaseModel):
    text: str = Field(min_length=1)


class SkillExtractionResponse(BaseModel):
    skills: list[str]
    total_skills: int
    categories: dict[str, list[str]] | None = None


class JobMatchResponse(BaseModel):
    overall_match: int
    required_skill_match: int
    preferred_skill_match: int
    experience_match: int
    education_match: int
    certification_match: int
    matched_skills: list[str]
    missing_skills: list[str]


class CandidateRankingRequest(BaseModel):
    job_id: int = Field(gt=0)
    min_ai_score: float | None = Field(default=None, ge=0, le=100)
    min_experience: float | None = Field(default=None, ge=0)
    required_certification: str | None = Field(
        default=None, min_length=1, max_length=255
    )
    required_degree: str | None = Field(default=None, min_length=1, max_length=255)
    sort_by: Literal[
        "overall_score", "experience", "application_date", "candidate_name"
    ] = "overall_score"


class CandidateRankingItem(BaseModel):
    rank: int
    candidate_id: str
    candidate_name: str
    overall_score: int
    matched_skills: int
    missing_skills: int


class CandidateRankingResponse(BaseModel):
    job_id: int
    total_candidates: int
    ranking: list[CandidateRankingItem]


class RecommendationItem(BaseModel):
    priority: Literal["High", "Medium", "Low"]
    title: str
    learning_type: str
    reason: str
    estimated_score_gain: int = Field(ge=1, le=15)
    estimated_time_months: int = Field(ge=1, le=12)


class SimilarJobRecommendation(BaseModel):
    job_id: int
    title: str
    compatibility: int = Field(ge=0, le=100)
    reason: str


class CareerInsights(BaseModel):
    career_readiness_level: Literal[
        "Beginner", "Junior", "Mid-Level", "Senior", "Expert"
    ]
    hiring_probability: Literal["Very High", "High", "Medium", "Low"]
    explanation: str


class ScoreImprovement(BaseModel):
    current_score: int = Field(ge=0, le=100)
    potential_score: int = Field(ge=0, le=100)
    improvement_percentage: int = Field(ge=0, le=100)
    estimated_time_months: int = Field(ge=0, le=12)


class RecommendationResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    summary: str
    strengths: list[str]
    weaknesses: list[str]
    missing_skills: list[str]
    missing_required_skills: list[str]
    missing_preferred_skills: list[str]
    language_gaps: list[str]
    recommendations: list[RecommendationItem]
    career_insights: CareerInsights
    score_improvement: ScoreImprovement
    similar_jobs: list[SimilarJobRecommendation]
