from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.pagination import CollectionQuery, Page, paginate
from app.database.database import get_db
from app.schemas.job_category import (
    JobCategoryCreate,
    JobCategoryRead,
    JobCategoryUpdate,
)
from app.services.job_category_service import JobCategoryService

router = APIRouter(prefix="/job-categories", tags=["job-categories"])


@router.post("", response_model=JobCategoryRead, status_code=status.HTTP_201_CREATED)
def create_job_category(
    payload: JobCategoryCreate, db: Session = Depends(get_db)
) -> JobCategoryRead:
    service = JobCategoryService(db)
    return service.create_category(payload)


@router.get("", response_model=Page[JobCategoryRead])
def list_job_categories(
    query: CollectionQuery = Depends(), db: Session = Depends(get_db)
) -> Page[JobCategoryRead]:
    service = JobCategoryService(db)
    return paginate(service.list_categories(), query)


@router.get("/{category_id}", response_model=JobCategoryRead)
def get_job_category(
    category_id: int, db: Session = Depends(get_db)
) -> JobCategoryRead:
    service = JobCategoryService(db)
    return service.get_category(category_id)


@router.put("/{category_id}", response_model=JobCategoryRead)
def update_job_category(
    category_id: int,
    payload: JobCategoryUpdate,
    db: Session = Depends(get_db),
) -> JobCategoryRead:
    service = JobCategoryService(db)
    return service.update_category(category_id, payload)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_category(category_id: int, db: Session = Depends(get_db)) -> None:
    service = JobCategoryService(db)
    service.delete_category(category_id)
