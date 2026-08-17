from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken
from app.models.role import Role
from app.models.user import User


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_user_by_email(self, email: str):
        row = (
            self.db.execute(
                select(User.__table__, Role.__table__.c.name.label("role_name"))
                .select_from(
                    User.__table__.join(
                        Role.__table__,
                        Role.__table__.c.role_id == User.__table__.c.role_id,
                    )
                )
                .where(User.__table__.c.email == email)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def get_user_by_id(self, user_id: uuid.UUID):
        row = (
            self.db.execute(
                select(User.__table__, Role.__table__.c.name.label("role_name"))
                .select_from(
                    User.__table__.join(
                        Role.__table__,
                        Role.__table__.c.role_id == User.__table__.c.role_id,
                    )
                )
                .where(User.__table__.c.user_id == user_id)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def get_role_by_name(self, role_name: str):
        row = (
            self.db.execute(
                select(Role.__table__).where(Role.__table__.c.name == role_name)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def create_user(
        self,
        *,
        first_name: str,
        last_name: str,
        email: str,
        password_hash: str,
        role_id: int,
    ):
        row = (
            self.db.execute(
                User.__table__.insert()
                .values(
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    password_hash=password_hash,
                    role_id=role_id,
                )
                .returning(*User.__table__.c)
            )
            .mappings()
            .one()
        )
        self.db.commit()
        return dict(row)

    def issue_refresh_token(
        self, user_id: uuid.UUID, jti: str, expires_at: datetime
    ) -> None:
        self.db.execute(
            RefreshToken.__table__.insert().values(
                user_id=user_id, jti=jti, expires_at=expires_at
            )
        )
        self.db.commit()

    def get_active_refresh_token(self, jti: str):
        row = (
            self.db.execute(
                select(RefreshToken.__table__).where(
                    RefreshToken.__table__.c.jti == jti,
                    RefreshToken.__table__.c.revoked_at.is_(None),
                    RefreshToken.__table__.c.expires_at > datetime.now(timezone.utc),
                )
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def revoke_refresh_token(self, jti: str) -> bool:
        result = self.db.execute(
            update(RefreshToken.__table__)
            .where(
                RefreshToken.__table__.c.jti == jti,
                RefreshToken.__table__.c.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        self.db.commit()
        return result.rowcount > 0

    def cleanup_expired_refresh_tokens(self) -> None:
        self.db.execute(
            delete(RefreshToken.__table__).where(
                RefreshToken.__table__.c.expires_at <= datetime.now(timezone.utc)
            )
        )
        self.db.commit()
