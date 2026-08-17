from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.pagination import CollectionQuery, Page, paginate
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.education import EducationCreate, EducationRead, EducationUpdate
from app.services.education_service import EducationService

router = APIRouter(prefix="/education", tags=["education"])


@router.post("", response_model=EducationRead, status_code=status.HTTP_201_CREATED)
def create_education(
    payload: EducationCreate,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EducationRead:
    service = EducationService(db)
    return service.create_education(current_user.user_id, payload)


@router.get("", response_model=Page[EducationRead])
def list_educations(
    resume_id: int | None = Query(default=None),
    query: CollectionQuery = Depends(),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[EducationRead]:
    service = EducationService(db)
    return paginate(service.list_educations(current_user.user_id, resume_id), query)


@router.get("/{education_id}", response_model=EducationRead)
def get_education(
    education_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EducationRead:
    service = EducationService(db)
    return service.get_education(current_user.user_id, education_id)


@router.put("/{education_id}", response_model=EducationRead)
def update_education(
    education_id: int,
    payload: EducationUpdate,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EducationRead:
    service = EducationService(db)
    return service.update_education(current_user.user_id, education_id, payload)


@router.delete("/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(
    education_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    service = EducationService(db)
    service.delete_education(current_user.user_id, education_id)
