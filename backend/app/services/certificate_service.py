from __future__ import annotations

import uuid
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.repositories.certificate_repository import CertificateRepository
from app.schemas.certificate import CertificateRead

MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024
ALLOWED_CERTIFICATE_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}


class CertificateService:
    def __init__(self, db: Session) -> None:
        self.repo = CertificateRepository(db)
        self.upload_dir = (
            Path(__file__).resolve().parents[1] / "uploads" / "certificates"
        )
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def _validate_file(self, file: UploadFile) -> None:
        if file.content_type not in ALLOWED_CERTIFICATE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="PDF or image files only.",
            )
        signature = file.file.read(12)
        file.file.seek(0)
        valid_signature = (
            (file.content_type == "application/pdf" and signature.startswith(b"%PDF-"))
            or (
                file.content_type == "image/png"
                and signature.startswith(b"\x89PNG\r\n\x1a\n")
            )
            or (
                file.content_type in {"image/jpeg", "image/jpg"}
                and signature.startswith(b"\xff\xd8\xff")
            )
            or (
                file.content_type == "image/webp"
                and signature.startswith(b"RIFF")
                and signature[8:12] == b"WEBP"
            )
        )
        if not valid_signature:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Invalid certificate file.",
            )
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > MAX_CERTIFICATE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="File too large."
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
        self._validate_file(file)

        ext = Path(file.filename or "").suffix.lower()
        if file.content_type == "application/pdf" and ext not in {".pdf"}:
            ext = ".pdf"
        elif (
            file.content_type in {"image/png", "image/jpeg", "image/jpg", "image/webp"}
            and ext == ""
        ):
            ext = ".png" if file.content_type == "image/png" else ".jpg"

        filename = f"{user_id}_{uuid4().hex}{ext}"
        file_path = self.upload_dir / filename
        with file_path.open("wb") as buffer:
            buffer.write(file.file.read())

        cert = self.repo.create(user_id, title, issuer, issue_date, str(file_path))
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
