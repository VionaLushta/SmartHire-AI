from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.saved_job_repository import SavedJobRepository
from app.schemas.saved_job import SavedJobCreate, SavedJobRead


class SavedJobService:
    def __init__(self, db: Session) -> None:
        self.repo = SavedJobRepository(db)

    def create_saved_job(self, payload: SavedJobCreate) -> SavedJobRead:
        if self.repo.get_user(payload.user_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
            )
        if self.repo.get_job(payload.job_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )
        if self.repo.get_saved_job(payload.user_id, payload.job_id) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Job already saved for this user.",
            )
        return SavedJobRead.model_validate(self.repo.create(payload))

    def list_saved_jobs(self, user_id: uuid.UUID | None = None) -> list[SavedJobRead]:
        return [
            SavedJobRead.model_validate(saved_job)
            for saved_job in self.repo.list(user_id)
        ]

    def delete_saved_job(self, user_id: uuid.UUID, job_id: int) -> None:
        if self.repo.get_saved_job(user_id, job_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Saved job not found."
            )
        if not self.repo.delete(user_id, job_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Saved job not found."
            )
