from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.pagination import CollectionQuery, Page, paginate
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.job import JobCreate, JobRead, JobUpdate
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobRead:
    service = JobService(db)
    return service.create_job(payload, current_user)


@router.get("", response_model=Page[JobRead])
def list_jobs(
    query: CollectionQuery = Depends(),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[JobRead]:
    service = JobService(db)
    return paginate(service.list_jobs(current_user), query)


@router.get("/{job_id}", response_model=JobRead)
def get_job(
    job_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobRead:
    service = JobService(db)
    return service.get_job(job_id, current_user)


@router.put("/{job_id}", response_model=JobRead)
def update_job(
    job_id: int,
    payload: JobUpdate,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobRead:
    service = JobService(db)
    return service.update_job(job_id, payload, current_user)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    service = JobService(db)
    service.delete_job(job_id, current_user)
