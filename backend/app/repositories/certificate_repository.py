from __future__ import annotations

import uuid

from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session

from app.models.certificate import Certificate


class CertificateRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _table():
        return Certificate.__table__

    def get_user(self, user_id: uuid.UUID) -> dict | None:
        from app.models.user import User

        row = (
            self.db.execute(
                select(User.__table__).where(User.__table__.c.user_id == user_id)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def get_by_id(self, cert_id: int) -> dict | None:
        row = (
            self.db.execute(
                select(self._table()).where(self._table().c.cert_id == cert_id)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def create(
        self,
        user_id: uuid.UUID,
        title: str,
        issuer: str | None,
        issue_date,
        file_path: str,
    ) -> dict:
        row = (
            self.db.execute(
                insert(self._table())
                .values(
                    user_id=user_id,
                    title=title,
                    issuer=issuer,
                    issue_date=issue_date,
                    file_path=file_path,
                )
                .returning(*self._table().c)
            )
            .mappings()
            .one()
        )
        self.db.commit()
        return dict(row)

    def list(self, user_id: uuid.UUID | None = None) -> list[dict]:
        statement = select(self._table()).order_by(self._table().c.created_at.desc())
        if user_id is not None:
            statement = statement.where(self._table().c.user_id == user_id)
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def delete(self, cert_id: int) -> bool:
        rowcount = self.db.execute(
            delete(self._table()).where(self._table().c.cert_id == cert_id)
        ).rowcount
        self.db.commit()
        return rowcount > 0
