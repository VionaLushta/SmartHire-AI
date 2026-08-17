from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.job_dashboard import JobDashboardResponse
from app.services.job_dashboard_service import JobDashboardService

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}/dashboard", response_model=JobDashboardResponse)
def get_job_dashboard(
    job_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobDashboardResponse:
    service = JobDashboardService(db)
    return service.get_dashboard(job_id, current_user)
