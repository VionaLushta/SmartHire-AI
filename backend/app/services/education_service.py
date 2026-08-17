from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.education_repository import EducationRepository
from app.schemas.education import EducationCreate, EducationRead, EducationUpdate


class EducationService:
    def __init__(self, db: Session) -> None:
        self.repo = EducationRepository(db)

    def _ensure_ownership(self, resume_id: int, user_id: uuid.UUID) -> None:
        if self.repo.get_resume_for_user(resume_id, user_id) is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Resume does not belong to this candidate.",
            )

    def create_education(
        self, user_id: uuid.UUID, payload: EducationCreate
    ) -> EducationRead:
        self._ensure_ownership(payload.resume_id, user_id)
        return EducationRead.model_validate(self.repo.create(payload))

    def list_educations(
        self, user_id: uuid.UUID, resume_id: int | None = None
    ) -> list[EducationRead]:
        if resume_id is not None:
            self._ensure_ownership(resume_id, user_id)
        return [
            EducationRead.model_validate(education)
            for education in self.repo.list(resume_id)
        ]

    def get_education(self, user_id: uuid.UUID, education_id: int) -> EducationRead:
        education = self.repo.get_by_id(education_id)
        if education is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Education not found."
            )
        self._ensure_ownership(education["resume_id"], user_id)
        return EducationRead.model_validate(education)

    def update_education(
        self, user_id: uuid.UUID, education_id: int, payload: EducationUpdate
    ) -> EducationRead:
        current = self.repo.get_by_id(education_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Education not found."
            )

        target_resume_id = (
            payload.resume_id if payload.resume_id is not None else current["resume_id"]
        )
        self._ensure_ownership(target_resume_id, user_id)
        updated = self.repo.update(education_id, payload)
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Education not found."
            )
        return EducationRead.model_validate(updated)

    def delete_education(self, user_id: uuid.UUID, education_id: int) -> None:
        current = self.repo.get_by_id(education_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Education not found."
            )
        self._ensure_ownership(current["resume_id"], user_id)
        if not self.repo.delete(education_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Education not found."
            )
