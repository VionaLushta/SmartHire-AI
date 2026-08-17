from __future__ import annotations

import uuid

from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session

from app.models.job import Job, SavedJob
from app.models.user import User
from app.schemas.saved_job import SavedJobCreate


class SavedJobRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _table():
        return SavedJob.__table__

    def get_user(self, user_id: uuid.UUID) -> dict | None:
        statement = select(User.__table__).where(User.__table__.c.user_id == user_id)
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def get_job(self, job_id: int) -> dict | None:
        statement = select(Job.__table__).where(Job.__table__.c.job_id == job_id)
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def get_saved_job(self, user_id: uuid.UUID, job_id: int) -> dict | None:
        statement = select(self._table()).where(
            self._table().c.user_id == user_id,
            self._table().c.job_id == job_id,
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def create(self, payload: SavedJobCreate) -> dict:
        statement = (
            insert(self._table())
            .values(user_id=payload.user_id, job_id=payload.job_id)
            .returning(*self._table().c)
        )
        row = self.db.execute(statement).mappings().one()
        self.db.commit()
        return dict(row)

    def list(self, user_id: uuid.UUID | None = None) -> list[dict]:
        statement = select(self._table()).order_by(self._table().c.saved_at.desc())
        if user_id is not None:
            statement = statement.where(self._table().c.user_id == user_id)
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def delete(self, user_id: uuid.UUID, job_id: int) -> bool:
        statement = delete(self._table()).where(
            self._table().c.user_id == user_id,
            self._table().c.job_id == job_id,
        )
        result = self.db.execute(statement)
        self.db.commit()
        return result.rowcount > 0
