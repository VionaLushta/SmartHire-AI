from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.company_dashboard import CompanyDashboardResponse
from app.services.company_dashboard_service import CompanyDashboardService

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/{company_id}/dashboard", response_model=CompanyDashboardResponse)
def get_company_dashboard(
    company_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompanyDashboardResponse:
    service = CompanyDashboardService(db)
    return service.get_dashboard(company_id, current_user)
