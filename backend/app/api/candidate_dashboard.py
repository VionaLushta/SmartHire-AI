from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_candidate
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.candidate_dashboard import CandidateDashboardResponse
from app.services.candidate_dashboard_service import CandidateDashboardService

router = APIRouter(prefix="/candidate", tags=["candidate"])


@router.get("/dashboard", response_model=CandidateDashboardResponse)
def get_candidate_dashboard(
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateDashboardResponse:
    service = CandidateDashboardService(db)
    return service.get_dashboard(current_user.user_id)
