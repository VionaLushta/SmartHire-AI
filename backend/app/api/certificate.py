from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import require_candidate
from app.core.pagination import CollectionQuery, Page, paginate
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.certificate import CertificateRead
from app.services.certificate_service import CertificateService

router = APIRouter(prefix="/certificates", tags=["certificates"])


@router.post("", response_model=CertificateRead, status_code=status.HTTP_201_CREATED)
def upload_certificate(
    title: str = Form(...),
    issuer: str | None = Form(default=None),
    issue_date: date | None = Form(default=None),
    file: UploadFile = File(...),
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CertificateRead:
    service = CertificateService(db)
    return service.upload_certificate(
        current_user.user_id, title, issuer, issue_date, file
    )


@router.get("", response_model=Page[CertificateRead])
def list_certificates(
    query: CollectionQuery = Depends(),
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> Page[CertificateRead]:
    service = CertificateService(db)
    return paginate(service.list_certificates(current_user.user_id), query)


@router.delete("/{cert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certificate(
    cert_id: int,
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> None:
    service = CertificateService(db)
    service.delete_certificate(current_user.user_id, cert_id)


@router.get("/{cert_id}/download")
def download_certificate(
    cert_id: int,
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> FileResponse:
    path = CertificateService(db).get_download_path(current_user.user_id, cert_id)
    return FileResponse(path, filename=path.name, media_type="application/octet-stream")
