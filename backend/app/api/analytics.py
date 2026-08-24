from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi import Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.skills import SkillAnalyticsResponse
from app.services.job_skill_service import JobSkillService
from app.services.powerbi_service import PowerBIExportError, PowerBIService

router = APIRouter(prefix="/analytics", tags=["ai analytics"])


@router.get("/skills", response_model=SkillAnalyticsResponse)
def skills(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SkillAnalyticsResponse:
    return JobSkillService(db).analytics(current_user)


@router.get("/executive")
def executive(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PowerBIService(db).executive(current_user)


@router.get("/funnel")
def funnel(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PowerBIService(db).funnel(current_user)


@router.get("/jobs")
def jobs(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PowerBIService(db).jobs(current_user)


@router.get("/recruiters")
def recruiters(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PowerBIService(db).recruiters(current_user)


@router.get("/education")
def education(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PowerBIService(db).education(current_user)


@router.get("/ai")
def ai(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PowerBIService(db).ai(current_user)


@router.get("/workflow")
def workflow(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PowerBIService(db).workflow(current_user)


@router.get("/export")
def export(
    report_format: str = "json",
    dataset: str = "powerbi",
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    try:
        content, media_type, filename = PowerBIService(db).export(
            current_user, report_format=report_format, dataset=dataset
        )
    except PowerBIExportError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
