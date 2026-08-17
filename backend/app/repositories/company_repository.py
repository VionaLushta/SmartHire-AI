from __future__ import annotations

from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_user import CompanyUser
from app.schemas.company import CompanyCreate, CompanyUpdate


class CompanyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _table():
        return Company.__table__

    def create(self, payload: CompanyCreate) -> dict:
        statement = (
            insert(self._table())
            .values(
                name=payload.name,
                industry=payload.industry,
                website=payload.website,
                logo=payload.logo,
                location=payload.location,
            )
            .returning(*self._table().c)
        )
        row = self.db.execute(statement).mappings().one()
        self.db.commit()
        return dict(row)

    def list(self) -> list[dict]:
        statement = select(self._table()).order_by(self._table().c.company_id)
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def get_by_id(self, company_id: int) -> dict | None:
        statement = select(self._table()).where(
            self._table().c.company_id == company_id
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    def get_by_name(self, name: str) -> dict | None:
        statement = select(self._table()).where(self._table().c.name == name)
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    def get_company_for_user(self, company_id, user_id):
        statement = select(CompanyUser.__table__).where(
            CompanyUser.__table__.c.company_id == company_id,
            CompanyUser.__table__.c.user_id == user_id,
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def update(self, company_id: int, payload: CompanyUpdate) -> dict | None:
        values = payload.model_dump(exclude_unset=True)
        if not values:
            return self.get_by_id(company_id)
        statement = (
            update(self._table())
            .where(self._table().c.company_id == company_id)
            .values(**values)
            .returning(*self._table().c)
        )
        row = self.db.execute(statement).mappings().first()
        self.db.commit()
        return dict(row) if row is not None else None

    def delete(self, company_id: int) -> bool:
        statement = delete(self._table()).where(
            self._table().c.company_id == company_id
        )
        result = self.db.execute(statement)
        self.db.commit()
        return result.rowcount > 0
