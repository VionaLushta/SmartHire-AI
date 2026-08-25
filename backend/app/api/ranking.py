from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.candidate_ranking import (
    CandidateComparisonItem,
    CandidateRankingResponse,
    ExportFormat,
)
from app.services.candidate_ranking_service import CandidateRankingService

router = APIRouter(prefix="/ranking", tags=["candidate ranking"])


@router.get("", response_model=CandidateRankingResponse)
def ranking(
    job_id: int = Query(..., gt=0),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    db: Session = Depends(get_db),
) -> CandidateRankingResponse:
    return CandidateRankingService(db).ranking(job_id, current_user)


@router.get("/top5", response_model=CandidateRankingResponse)
def top5(
    job_id: int = Query(..., gt=0),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    db: Session = Depends(get_db),
) -> CandidateRankingResponse:
    return CandidateRankingService(db).ranking(job_id, current_user, limit=5)


@router.get("/top10", response_model=CandidateRankingResponse)
def top10(
    job_id: int = Query(..., gt=0),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    db: Session = Depends(get_db),
) -> CandidateRankingResponse:
    return CandidateRankingService(db).ranking(job_id, current_user, limit=10)


@router.get("/top20", response_model=CandidateRankingResponse)
def top20(
    job_id: int = Query(..., gt=0),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    db: Session = Depends(get_db),
) -> CandidateRankingResponse:
    return CandidateRankingService(db).ranking(job_id, current_user, limit=20)


@router.get("/job/{job_id}", response_model=CandidateRankingResponse)
def ranking_for_job(
    job_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    db: Session = Depends(get_db),
) -> CandidateRankingResponse:
    return CandidateRankingService(db).ranking(job_id, current_user)


@router.get("/compare", response_model=list[CandidateComparisonItem])
def compare(
    job_id: int = Query(..., gt=0),
    candidate_ids: list[UUID] = Query(...),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    db: Session = Depends(get_db),
) -> list[CandidateComparisonItem]:
    return CandidateRankingService(db).compare_candidates(job_id, candidate_ids, current_user)


@router.get("/export")
def export(
    job_id: int = Query(..., gt=0),
    report_format: ExportFormat = Query("json", alias="format"),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    db: Session = Depends(get_db),
) -> Response:
    try:
        content, media_type, filename = CandidateRankingService(db).export(
            job_id, current_user, report_format=report_format
        )
    except HTTPException:
        raise
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
