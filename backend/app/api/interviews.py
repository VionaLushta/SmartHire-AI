from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.interview import (
    ExportFormat,
    InterviewListResponse,
    InterviewResponse,
    InterviewScheduleRequest,
    InterviewUpdateRequest,
)
from app.services.interview_scheduler_service import InterviewSchedulerService

router = APIRouter(prefix="/interviews", tags=["interviews"])


def get_interview_scheduler_service(db: Session = Depends(get_db)) -> InterviewSchedulerService:
    return InterviewSchedulerService(db)


@router.get("", response_model=list[InterviewResponse])
def list_interviews(
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: InterviewSchedulerService = Depends(get_interview_scheduler_service),
) -> list[InterviewResponse]:
    return service.list_interviews(current_user)


@router.get("/upcoming", response_model=list[InterviewResponse])
def upcoming_interviews(
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: InterviewSchedulerService = Depends(get_interview_scheduler_service),
) -> list[InterviewResponse]:
    return service.upcoming_interviews(current_user)


@router.get("/today", response_model=list[InterviewResponse])
def today_interviews(
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: InterviewSchedulerService = Depends(get_interview_scheduler_service),
) -> list[InterviewResponse]:
    return service.today_interviews(current_user)


@router.get("/candidate/{id}", response_model=list[InterviewResponse])
def candidate_interviews(
    id: UUID,
    current_user: CurrentUserResponse = Depends(get_current_user),
    service: InterviewSchedulerService = Depends(get_interview_scheduler_service),
) -> list[InterviewResponse]:
    return service.candidate_interviews(id, current_user)


@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def schedule_interview(
    payload: InterviewScheduleRequest,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: InterviewSchedulerService = Depends(get_interview_scheduler_service),
) -> InterviewResponse:
    return service.schedule_interview(payload, current_user)


@router.put("/{id}", response_model=InterviewResponse)
def update_interview(
    id: int,
    payload: InterviewUpdateRequest,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: InterviewSchedulerService = Depends(get_interview_scheduler_service),
) -> InterviewResponse:
    return service.update_interview(id, payload, current_user)


@router.delete("/{id}", response_model=InterviewResponse)
def cancel_interview(
    id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: InterviewSchedulerService = Depends(get_interview_scheduler_service),
) -> InterviewResponse:
    return service.cancel_interview(id, current_user)


@router.get("/export")
def export_interviews(
    report_format: ExportFormat = Query("json", alias="format"),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: InterviewSchedulerService = Depends(get_interview_scheduler_service),
) -> Response:
    content, media_type, filename = service.export_interviews(current_user, report_format=report_format)
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
