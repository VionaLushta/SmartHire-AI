from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.pagination import CollectionQuery, Page, paginate
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.saved_job import SavedJobCreate, SavedJobRead
from app.services.saved_job_service import SavedJobService

router = APIRouter(prefix="/saved-jobs", tags=["saved-jobs"])


@router.post("", response_model=SavedJobRead, status_code=status.HTTP_201_CREATED)
def create_saved_job(
    payload: SavedJobCreate,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedJobRead:
    service = SavedJobService(db)
    payload.user_id = current_user.user_id
    return service.create_saved_job(payload)


@router.get("", response_model=Page[SavedJobRead])
def list_saved_jobs(
    query: CollectionQuery = Depends(),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[SavedJobRead]:
    service = SavedJobService(db)
    return paginate(service.list_saved_jobs(current_user.user_id), query)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_job(
    job_id: int,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    service = SavedJobService(db)
    service.delete_saved_job(current_user.user_id, job_id)
