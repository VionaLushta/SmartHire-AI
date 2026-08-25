from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.resume_advisor import ExportFormat, ResumeAdvisorReport
from app.services.resume_advisor_service import ResumeAdvisorService

router = APIRouter(prefix="/resume-advisor", tags=["resume advisor"])


def get_resume_advisor_service(db: Session = Depends(get_db)) -> ResumeAdvisorService:
    return ResumeAdvisorService(db)


@router.get("/report", response_model=ResumeAdvisorReport)
def get_resume_advisor_report(
    current_user: CurrentUserResponse = Depends(get_current_user),
    service: ResumeAdvisorService = Depends(get_resume_advisor_service),
) -> ResumeAdvisorReport:
    return service.generate_report(current_user)


@router.post("/regenerate", response_model=ResumeAdvisorReport)
def regenerate_resume_advisor_report(
    current_user: CurrentUserResponse = Depends(get_current_user),
    service: ResumeAdvisorService = Depends(get_resume_advisor_service),
) -> ResumeAdvisorReport:
    return service.regenerate_report(current_user)


@router.get("/export")
def export_resume_advisor_report(
    report_format: ExportFormat = Query("json", alias="format"),
    current_user: CurrentUserResponse = Depends(get_current_user),
    service: ResumeAdvisorService = Depends(get_resume_advisor_service),
) -> Response:
    export_result = service.export_report(current_user, report_format=report_format)
    media_type = "application/pdf" if export_result.format == "pdf" else "application/json"
    file_name = Path(export_result.file_path).name
    with open(export_result.file_path, "rb") as handle:
        content = handle.read()
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )
