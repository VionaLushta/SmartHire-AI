from __future__ import annotations

import logging
import uuid
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.validation import validate_document_upload
from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import ResumeRead

MAX_RESUME_SIZE = 10 * 1024 * 1024
logger = logging.getLogger("smarthire.uploads")


class ResumeService:
    def __init__(self, db: Session) -> None:
        self.repo = ResumeRepository(db)
        settings = get_settings()
        self.upload_dir = Path(settings.upload_folder)
        if not self.upload_dir.is_absolute():
            self.upload_dir = Path(__file__).resolve().parents[1] / self.upload_dir
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def _validate_pdf(self, file: UploadFile) -> None:
        try:
            validate_document_upload(
                file,
                allowed_mime_types={"application/pdf": {".pdf"}},
                max_size_bytes=MAX_RESUME_SIZE,
            )
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
                detail="Invalid or unsupported file type.",
            )
        if "filename" in lower:
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename is invalid.",
            )
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file upload."
        )

    def upload_resume(self, user_id: uuid.UUID, file: UploadFile) -> ResumeRead:
        if self.repo.get_user(user_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
            )
        try:
            self._validate_pdf(file)
        except HTTPException as exc:
            logger.warning(
                "security_event type=upload_rejected user_id=%s filename=%s status=%s detail=%s",
                user_id,
                getattr(file, "filename", None),
                exc.status_code,
                exc.detail,
            )
            raise
        if self.repo.get_by_user(user_id) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Resume already uploaded."
            )

        filename = f"{user_id}_{uuid4().hex}.pdf"
        file_path = self.upload_dir / filename
        with file_path.open("wb") as buffer:
            buffer.write(file.file.read())

        resume = self.repo.create(user_id, str(file_path))
        return ResumeRead.model_validate(resume)

    def list_resumes(self, user_id: uuid.UUID | None = None) -> list[ResumeRead]:
        return [ResumeRead.model_validate(resume) for resume in self.repo.list(user_id)]

    def delete_resume(self, user_id: uuid.UUID, resume_id: int) -> None:
        resume = self.repo.get_by_id(resume_id)
        if resume is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found."
            )
        if resume["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Resume does not belong to this candidate.",
            )
        path = Path(resume["file_path"])
        if path.exists():
            path.unlink()
        if not self.repo.delete(resume_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found."
            )
