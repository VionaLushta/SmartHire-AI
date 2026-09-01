from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import require_candidate
from app.core.pagination import CollectionQuery, Page, paginate
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.resume import ResumeRead
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/upload", response_model=ResumeRead, status_code=status.HTTP_201_CREATED)
def upload_resume(
    current_user: CurrentUserResponse = Depends(require_candidate),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ResumeRead:
    service = ResumeService(db)
    return service.upload_resume(current_user.user_id, file)


@router.get("", response_model=Page[ResumeRead])
def list_resumes(
    query: CollectionQuery = Depends(),
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> Page[ResumeRead]:
    service = ResumeService(db)
    return paginate(service.list_resumes(current_user.user_id), query)


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: int,
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> None:
    service = ResumeService(db)
    service.delete_resume(current_user.user_id, resume_id)


@router.get("/{resume_id}/download")
def download_resume(
    resume_id: int,
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> FileResponse:
    path = ResumeService(db).get_download_path(current_user.user_id, resume_id)
    return FileResponse(path, filename=path.name, media_type="application/octet-stream")
