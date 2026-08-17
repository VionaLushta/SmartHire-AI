from __future__ import annotations

import uuid

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.candidate import CandidateUpdate


class CandidateRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _table():
        return User.__table__

    def get_by_id(self, candidate_id: uuid.UUID) -> dict | None:
        row = (
            self.db.execute(
                select(self._table()).where(self._table().c.user_id == candidate_id)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def get_by_email(self, email: str) -> dict | None:
        row = (
            self.db.execute(select(self._table()).where(self._table().c.email == email))
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def update(self, candidate_id: uuid.UUID, payload: CandidateUpdate) -> dict | None:
        values = payload.model_dump(exclude_unset=True)
        if not values:
            return self.get_by_id(candidate_id)
        row = (
            self.db.execute(
                update(self._table())
                .where(self._table().c.user_id == candidate_id)
                .values(**values)
                .returning(*self._table().c)
            )
            .mappings()
            .first()
        )
        self.db.commit()
        return dict(row) if row else None
