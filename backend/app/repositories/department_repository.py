from __future__ import annotations

from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import Session

from app.models.company_user import CompanyUser
from app.models.job import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate


class DepartmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _table():
        return Department.__table__

    def create(self, payload: DepartmentCreate) -> dict:
        statement = (
            insert(self._table())
            .values(
                company_id=payload.company_id,
                name=payload.name,
                description=payload.description,
            )
            .returning(*self._table().c)
        )
        row = self.db.execute(statement).mappings().one()
        self.db.commit()
        return dict(row)

    def list(self) -> list[dict]:
        statement = select(self._table()).order_by(self._table().c.department_id)
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def get_by_id(self, department_id: int) -> dict | None:
        statement = select(self._table()).where(
            self._table().c.department_id == department_id
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    def get_by_name_and_company(self, company_id: int, name: str) -> dict | None:
        statement = select(self._table()).where(
            self._table().c.company_id == company_id,
            self._table().c.name == name,
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    def get_company_for_user(self, company_id, user_id):
        statement = select(CompanyUser.__table__).where(
            CompanyUser.__table__.c.company_id == company_id,
            CompanyUser.__table__.c.user_id == user_id,
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def update(self, department_id: int, payload: DepartmentUpdate) -> dict | None:
        values = payload.model_dump(exclude_unset=True)
        if not values:
            return self.get_by_id(department_id)
        statement = (
            update(self._table())
            .where(self._table().c.department_id == department_id)
            .values(**values)
            .returning(*self._table().c)
        )
        row = self.db.execute(statement).mappings().first()
        self.db.commit()
        return dict(row) if row is not None else None

    def delete(self, department_id: int) -> bool:
        statement = delete(self._table()).where(
            self._table().c.department_id == department_id
        )
        result = self.db.execute(statement)
        self.db.commit()
        return result.rowcount > 0
