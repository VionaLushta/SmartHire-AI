from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.skills import SkillAnalyticsResponse
from app.services.job_skill_service import JobSkillService

router = APIRouter(prefix="/analytics", tags=["ai analytics"])


@router.get("/skills", response_model=SkillAnalyticsResponse)
def skills(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SkillAnalyticsResponse:
    return JobSkillService(db).analytics(current_user)
