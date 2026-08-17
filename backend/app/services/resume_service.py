from __future__ import annotations

import uuid
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import ResumeRead

MAX_RESUME_SIZE = 10 * 1024 * 1024


class ResumeService:
    def __init__(self, db: Session) -> None:
        self.repo = ResumeRepository(db)
        self.upload_dir = Path(__file__).resolve().parents[1] / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def _validate_pdf(self, file: UploadFile) -> None:
        if file.content_type != "application/pdf":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="PDF files only.",
            )
        signature = file.file.read(5)
        file.file.seek(0)
        if signature != b"%PDF-":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Invalid PDF file.",
            )

    def _validate_size(self, file: UploadFile) -> None:
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > MAX_RESUME_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="File too large."
            )

    def upload_resume(self, user_id: uuid.UUID, file: UploadFile) -> ResumeRead:
        if self.repo.get_user(user_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
            )
        self._validate_pdf(file)
        self._validate_size(file)
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
