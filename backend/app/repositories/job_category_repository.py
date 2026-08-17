from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, insert, select, update
from sqlalchemy.orm import Session

from app.models.job import Category, JobCategory
from app.schemas.job_category import JobCategoryCreate, JobCategoryUpdate


class JobCategoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _table():
        return Category.__table__

    def create(self, payload: JobCategoryCreate) -> dict:
        statement = (
            insert(self._table())
            .values(name=payload.name, description=payload.description, deleted_at=None)
            .returning(*self._table().c)
        )
        row = self.db.execute(statement).mappings().one()
        self.db.commit()
        return dict(row)

    def list(self) -> list[dict]:
        statement = (
            select(self._table())
            .where(self._table().c.deleted_at.is_(None))
            .order_by(self._table().c.category_id)
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def get_by_id(self, category_id: int) -> dict | None:
        statement = select(self._table()).where(
            self._table().c.category_id == category_id,
            self._table().c.deleted_at.is_(None),
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    def get_by_name(self, name: str) -> dict | None:
        statement = select(self._table()).where(
            func.lower(self._table().c.name) == name.lower(),
            self._table().c.deleted_at.is_(None),
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    def is_referenced_by_jobs(self, category_id: int) -> bool:
        statement = (
            select(func.count())
            .select_from(JobCategory.__table__)
            .where(JobCategory.__table__.c.category_id == category_id)
        )
        return (self.db.scalar(statement) or 0) > 0

    def update(self, category_id: int, payload: JobCategoryUpdate) -> dict | None:
        values = payload.model_dump(exclude_unset=True)
        if not values:
            return self.get_by_id(category_id)
        statement = (
            update(self._table())
            .where(
                self._table().c.category_id == category_id,
                self._table().c.deleted_at.is_(None),
            )
            .values(**values)
            .returning(*self._table().c)
        )
        row = self.db.execute(statement).mappings().first()
        self.db.commit()
        return dict(row) if row is not None else None

    def soft_delete(self, category_id: int) -> bool:
        statement = (
            update(self._table())
            .where(
                self._table().c.category_id == category_id,
                self._table().c.deleted_at.is_(None),
            )
            .values(deleted_at=datetime.now(timezone.utc))
        )
        result = self.db.execute(statement)
        self.db.commit()
        return result.rowcount > 0
