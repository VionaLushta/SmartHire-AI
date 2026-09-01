from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.certificate import Certificate
from app.models.resume import Education, Resume, WorkExperience
from app.repositories.candidate_repository import CandidateRepository
from app.schemas.candidate import CandidateRead, CandidateUpdate


class CandidateService:
    def __init__(self, db: Session) -> None:
        self.repo = CandidateRepository(db)

    def get_profile(self, user_id: uuid.UUID) -> CandidateRead:
        candidate = self.repo.get_by_id(user_id)
        if candidate is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found."
            )
        return CandidateRead.model_validate(self._with_documents(candidate, user_id))

    def update_profile(
        self, user_id: uuid.UUID, payload: CandidateUpdate
    ) -> CandidateRead:
        current = self.repo.get_by_id(user_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found."
            )
        if payload.email is not None and payload.email != current["email"]:
            existing = self.repo.get_by_email(payload.email)
            if existing is not None and existing["user_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail="Email already exists."
                )
        updated = self.repo.update(user_id, payload)
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found."
            )
        return CandidateRead.model_validate(self._with_documents(updated, user_id))

    def _with_documents(self, candidate: dict, user_id: uuid.UUID) -> dict:
        db = self.repo.db
        def rows(table):
            return [dict(row) for row in db.execute(select(table).where(table.c.user_id == user_id)).mappings().all()]
        resumes = rows(Resume.__table__)
        education = [dict(row) for row in db.execute(select(Education.__table__).join(Resume.__table__).where(Resume.__table__.c.user_id == user_id)).mappings().all()]
        experience = [dict(row) for row in db.execute(select(WorkExperience.__table__).join(Resume.__table__).where(Resume.__table__.c.user_id == user_id)).mappings().all()]
        return {**candidate, "resumes": resumes, "certificates": rows(Certificate.__table__), "education": education, "experience": experience}
