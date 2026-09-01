from __future__ import annotations

import logging
import uuid
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.validation import validate_document_upload
from app.repositories.certificate_repository import CertificateRepository
from app.schemas.certificate import CertificateRead
from app.services.audit_log_service import record_audit_event

MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024
logger = logging.getLogger("smarthire.uploads")


class CertificateService:
    def __init__(self, db: Session) -> None:
        self.repo = CertificateRepository(db)
        settings = get_settings()
        self.upload_dir = Path(settings.upload_folder) / "certificates"
        if not self.upload_dir.is_absolute():
            self.upload_dir = Path(__file__).resolve().parents[1] / self.upload_dir
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def _validate_file(self, file: UploadFile) -> None:
        try:
            validate_document_upload(file, max_size_bytes=MAX_CERTIFICATE_SIZE)
        except ValueError as exc:
            raise self._upload_exception(str(exc)) from exc

    @staticmethod
    def _upload_exception(message: str) -> HTTPException:
        lower = message.lower()
        if "size" in lower:
            return HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="File exceeds the maximum allowed size.",
            )
        if "signature" in lower or "extension" in lower or "unsupported" in lower:
            return HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Only PDF, PNG, JPG, and JPEG files are allowed.",
            )
        if "filename" in lower:
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename is invalid.",
            )
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file upload."
        )

    def upload_certificate(
        self,
        user_id: uuid.UUID,
        title: str,
        issuer: str | None,
        issue_date,
        file: UploadFile,
    ) -> CertificateRead:
        if self.repo.get_user(user_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found."
            )
        try:
            self._validate_file(file)
        except HTTPException as exc:
            logger.warning(
                "security_event type=upload_rejected user_id=%s filename=%s status=%s detail=%s",
                user_id,
                getattr(file, "filename", None),
                exc.status_code,
                exc.detail,
            )
            raise

        ext = Path(file.filename or "").suffix.lower()
        if file.content_type == "image/jpeg":
            ext = ".jpg" if ext not in {".jpg", ".jpeg"} else ext
        elif file.content_type == "image/jpg":
            ext = ".jpg" if ext not in {".jpg", ".jpeg"} else ext
        elif file.content_type == "image/png":
            ext = ".png"
        else:
            ext = ".pdf"

        filename = f"{user_id}_{uuid4().hex}{ext}"
        file_path = self.upload_dir / filename
        with file_path.open("wb") as buffer:
            buffer.write(file.file.read())

        cert = self.repo.create(user_id, title, issuer, issue_date, str(file_path))
        record_audit_event(
            self.repo.db,
            user_id=user_id,
            user_role="Candidate",
            action="Certificate Upload",
            entity_type="Certificate",
            entity_id=str(cert["cert_id"]),
            description="Candidate uploaded a certificate.",
            status="Success",
        )
        return CertificateRead.model_validate(cert)

    def list_certificates(
        self, user_id: uuid.UUID | None = None
    ) -> list[CertificateRead]:
        return [
            CertificateRead.model_validate(cert) for cert in self.repo.list(user_id)
        ]

    def delete_certificate(self, user_id: uuid.UUID, cert_id: int) -> None:
        cert = self.repo.get_by_id(cert_id)
        if cert is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found."
            )
        if cert["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Certificate does not belong to this candidate.",
            )
        path = Path(cert["file_path"])
        if path.exists():
            path.unlink()
        if not self.repo.delete(cert_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found."
            )

    def get_download_path(self, user_id: uuid.UUID, cert_id: int) -> Path:
        cert = self.repo.get_by_id(cert_id)
        if cert is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found.")
        if cert["user_id"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Certificate does not belong to this candidate.")
        path = Path(cert["file_path"])
        if not path.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate file not found.")
        return path
