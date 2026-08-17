from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.analytics import AnalyticsDashboardResponse
from app.schemas.auth import CurrentUserResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/ai/dashboard", tags=["ai analytics"])


@router.get("/overview", response_model=AnalyticsDashboardResponse)
def overview(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalyticsDashboardResponse:
    return AnalyticsService(db).overview(current_user)


@router.get("/company/{company_id}", response_model=AnalyticsDashboardResponse)
def company(
    company_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalyticsDashboardResponse:
    return AnalyticsService(db).company(company_id, current_user)


@router.get("/job/{job_id}", response_model=AnalyticsDashboardResponse)
def job(
    job_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalyticsDashboardResponse:
    return AnalyticsService(db).job(job_id, current_user)


@router.get("/candidate/{candidate_id}", response_model=AnalyticsDashboardResponse)
def candidate(
    candidate_id: uuid.UUID,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalyticsDashboardResponse:
    return AnalyticsService(db).candidate(candidate_id, current_user)


@router.get("/trends", response_model=AnalyticsDashboardResponse)
def trends(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalyticsDashboardResponse:
    return AnalyticsService(db).trends(current_user)


@router.get("/skills", response_model=AnalyticsDashboardResponse)
def skills(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalyticsDashboardResponse:
    return AnalyticsService(db).skills(current_user)


@router.get("/export/{report_format}")
def export_overview(
    report_format: str,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    content, media_type, filename = AnalyticsService(db).export_overview(
        report_format, current_user
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
