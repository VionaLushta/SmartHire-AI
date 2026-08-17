from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.ai_resume import (
    CandidateRankingRequest,
    CandidateRankingResponse,
    JobMatchResponse,
    ParsedResumeResponse,
    RecommendationResponse,
    SkillExtractionResponse,
)
from app.schemas.auth import CurrentUserResponse
from app.services.resume_ai_service import ResumeAIService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post(
    "/parse-resume", response_model=ParsedResumeResponse, status_code=status.HTTP_200_OK
)
def parse_resume(file: UploadFile = File(...)) -> ParsedResumeResponse:
    service = ResumeAIService()
    return service.parse_resume(file)


@router.post(
    "/extract-skills",
    response_model=SkillExtractionResponse,
    status_code=status.HTTP_200_OK,
)
def extract_skills(text: str = Form(...)) -> SkillExtractionResponse:
    service = ResumeAIService()
    return service.extract_skills(text)


@router.post(
    "/job-match", response_model=JobMatchResponse, status_code=status.HTTP_200_OK
)
def job_match(
    job_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    service = ResumeAIService(db)
    return service.job_match(file, job_id)


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
)
def recommendations(
    job_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    return ResumeAIService(db).recommendations(file, job_id)


@router.post(
    "/rank-candidates",
    response_model=CandidateRankingResponse,
    status_code=status.HTTP_200_OK,
)
def rank_candidates(
    payload: CandidateRankingRequest,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CandidateRankingResponse:
    return ResumeAIService(db).rank_candidates(payload, current_user)
