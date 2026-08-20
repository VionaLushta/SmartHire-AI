from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.skills import CandidateSkillReportResponse
from app.services.job_skill_service import JobSkillService

router = APIRouter(prefix="/candidates", tags=["candidate"])


@router.get("/{candidate_id}/skills", response_model=CandidateSkillReportResponse)
def candidate_skills(
    candidate_id: uuid.UUID,
    job_id: int | None = None,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CandidateSkillReportResponse:
    return JobSkillService(db).evaluate_candidate_skills(
        candidate_id, current_user, job_id=job_id
    )
