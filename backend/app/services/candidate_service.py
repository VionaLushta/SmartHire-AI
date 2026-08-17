from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

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
        return CandidateRead.model_validate(candidate)

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
        return CandidateRead.model_validate(updated)
