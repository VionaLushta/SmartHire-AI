from __future__ import annotations

import uuid

from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import Session

from app.models.resume import Education, Resume
from app.schemas.education import EducationCreate, EducationUpdate


class EducationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _table():
        return Education.__table__

    def get_resume(self, resume_id: int) -> dict | None:
        row = (
            self.db.execute(
                select(Resume.__table__).where(
                    Resume.__table__.c.resume_id == resume_id
                )
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def get_resume_for_user(self, resume_id: int, user_id: uuid.UUID) -> dict | None:
        row = (
            self.db.execute(
                select(Resume.__table__).where(
                    Resume.__table__.c.resume_id == resume_id,
                    Resume.__table__.c.user_id == user_id,
                )
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def get_by_id(self, education_id: int) -> dict | None:
        row = (
            self.db.execute(
                select(self._table()).where(
                    self._table().c.education_id == education_id
                )
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def create(self, payload: EducationCreate) -> dict:
        row = (
            self.db.execute(
                insert(self._table())
                .values(
                    resume_id=payload.resume_id,
                    institution=payload.institution,
                    degree=payload.degree,
                    field_of_study=payload.field_of_study,
                    start_date=payload.start_date,
                    end_date=payload.end_date,
                    description=payload.description,
                )
                .returning(*self._table().c)
            )
            .mappings()
            .one()
        )
        self.db.commit()
        return dict(row)

    def list(self, resume_id: int | None = None) -> list[dict]:
        statement = select(self._table()).order_by(self._table().c.education_id.desc())
        if resume_id is not None:
            statement = statement.where(self._table().c.resume_id == resume_id)
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def update(self, education_id: int, payload: EducationUpdate) -> dict | None:
        values = payload.model_dump(exclude_unset=True)
        if not values:
            return self.get_by_id(education_id)
        row = (
            self.db.execute(
                update(self._table())
                .where(self._table().c.education_id == education_id)
                .values(**values)
                .returning(*self._table().c)
            )
            .mappings()
            .first()
        )
        self.db.commit()
        return dict(row) if row else None

    def delete(self, education_id: int) -> bool:
        rowcount = self.db.execute(
            delete(self._table()).where(self._table().c.education_id == education_id)
        ).rowcount
        self.db.commit()
        return rowcount > 0
