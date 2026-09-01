from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_user import CompanyUser
from app.models.email_verification_token import EmailVerificationToken
from app.models.oauth_account import OAuthAccount
from app.models.password_reset_token import PasswordResetToken
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
        return self._decorate_user_row(row)

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
        return self._decorate_user_row(row)

    def get_user_by_oauth(self, provider: str, provider_subject: str):
        row = (
            self.db.execute(
                select(User.__table__, Role.__table__.c.name.label("role_name"))
                .select_from(
                    User.__table__.join(
                        Role.__table__,
                        Role.__table__.c.role_id == User.__table__.c.role_id,
                    ).join(
                        OAuthAccount.__table__,
                        OAuthAccount.__table__.c.user_id == User.__table__.c.user_id,
                    )
                )
                .where(
                    OAuthAccount.__table__.c.provider == provider,
                    OAuthAccount.__table__.c.provider_subject == provider_subject,
                )
            )
            .mappings()
            .first()
        )
        return self._decorate_user_row(row)

    def get_oauth_account(self, provider: str, provider_subject: str):
        row = (
            self.db.execute(
                select(OAuthAccount.__table__).where(
                    OAuthAccount.__table__.c.provider == provider,
                    OAuthAccount.__table__.c.provider_subject == provider_subject,
                )
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

    def list_roles(self) -> list[dict]:
        rows = self.db.execute(select(Role.__table__)).mappings().all()
        return [dict(row) for row in rows]

    def ensure_role(self, name: str, description: str | None = None) -> dict:
        existing = self.get_role_by_name(name)
        if existing is not None:
            return existing
        row = (
            self.db.execute(
                Role.__table__.insert()
                .values(name=name, description=description)
                .returning(*Role.__table__.c)
            )
            .mappings()
            .one()
        )
        self.db.commit()
        return dict(row)

    def create_user(
        self,
        *,
        first_name: str,
        last_name: str,
        email: str,
        phone: str | None,
        city: str | None = None,
        password_hash: str,
        role_id: int,
        email_verified_at: datetime | None = None,
        last_login_at: datetime | None = None,
        auth_provider: str | None = None,
        auth_provider_subject: str | None = None,
        profile_picture_url: str | None = None,
    ):
        row = (
            self.db.execute(
                User.__table__.insert()
                .values(
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    phone=phone,
                    city=city,
                    password_hash=password_hash,
                    role_id=role_id,
                    email_verified_at=email_verified_at,
                    last_login_at=last_login_at,
                    auth_provider=auth_provider,
                    auth_provider_subject=auth_provider_subject,
                    profile_picture_url=profile_picture_url,
                )
                .returning(*User.__table__.c)
            )
            .mappings()
            .one()
        )
        self.db.commit()
        return dict(row)

    def update_user(self, user_id: uuid.UUID, **values) -> dict | None:
        if not values:
            return self.get_user_by_id(user_id)
        row = (
            self.db.execute(
                update(User.__table__)
                .where(User.__table__.c.user_id == user_id)
                .values(**values)
                .returning(*User.__table__.c)
            )
            .mappings()
            .first()
        )
        self.db.commit()
        return dict(row) if row else None

    def upsert_oauth_account(
        self,
        *,
        user_id: uuid.UUID,
        provider: str,
        provider_subject: str,
        provider_email: str | None = None,
    ) -> dict:
        existing = (
            self.db.execute(
                select(OAuthAccount.__table__).where(
                    OAuthAccount.__table__.c.provider == provider,
                    OAuthAccount.__table__.c.provider_subject == provider_subject,
                )
            )
            .mappings()
            .first()
        )
        if existing:
            row = (
                self.db.execute(
                    update(OAuthAccount.__table__)
                    .where(OAuthAccount.__table__.c.oauth_account_id == existing["oauth_account_id"])
                    .values(
                        user_id=user_id,
                        provider_email=provider_email,
                    )
                    .returning(*OAuthAccount.__table__.c)
                )
                .mappings()
                .one()
            )
            self.db.commit()
            return dict(row)

        row = (
            self.db.execute(
                OAuthAccount.__table__.insert()
                .values(
                    user_id=user_id,
                    provider=provider,
                    provider_subject=provider_subject,
                    provider_email=provider_email,
                )
                .returning(*OAuthAccount.__table__.c)
            )
            .mappings()
            .one()
        )
        self.db.commit()
        return dict(row)

    def create_company(
        self,
        *,
        name: str,
        industry: str | None = None,
        website: str | None = None,
        logo: str | None = None,
        location: str | None = None,
    ) -> dict:
        row = (
            self.db.execute(
                Company.__table__.insert()
                .values(
                    name=name,
                    industry=industry,
                    website=website,
                    logo=logo,
                    location=location,
                )
                .returning(*Company.__table__.c)
            )
            .mappings()
            .one()
        )
        self.db.commit()
        return dict(row)

    def get_company_by_name(self, name: str) -> dict | None:
        row = (
            self.db.execute(
                select(Company.__table__).where(Company.__table__.c.name == name)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def assign_user_to_company(
        self, *, company_id: int, user_id: uuid.UUID, position: str | None = None
    ) -> dict:
        row = (
            self.db.execute(
                CompanyUser.__table__.insert()
                .values(company_id=company_id, user_id=user_id, position=position)
                .returning(*CompanyUser.__table__.c)
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

    def get_email_verification_token(self, token_hash: str):
        row = (
            self.db.execute(
                select(EmailVerificationToken.__table__).where(
                    EmailVerificationToken.__table__.c.token_hash == token_hash,
                    EmailVerificationToken.__table__.c.expires_at > datetime.now(timezone.utc),
                )
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def issue_email_verification_token(
        self, user_id: uuid.UUID, token_hash: str, expires_at: datetime
    ) -> None:
        self.db.execute(
            EmailVerificationToken.__table__.insert().values(
                user_id=user_id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
        )
        self.db.commit()

    def mark_email_verification_token_used(self, token_hash: str) -> bool:
        result = self.db.execute(
            update(EmailVerificationToken.__table__)
            .where(
                EmailVerificationToken.__table__.c.token_hash == token_hash,
                EmailVerificationToken.__table__.c.used_at.is_(None),
            )
            .values(used_at=datetime.now(timezone.utc))
        )
        self.db.commit()
        return result.rowcount > 0

    def get_password_reset_token(self, token_hash: str):
        row = (
            self.db.execute(
                select(PasswordResetToken.__table__).where(
                    PasswordResetToken.__table__.c.token_hash == token_hash,
                    PasswordResetToken.__table__.c.used_at.is_(None),
                    PasswordResetToken.__table__.c.expires_at > datetime.now(timezone.utc),
                )
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def issue_password_reset_token(
        self, user_id: uuid.UUID, token_hash: str, expires_at: datetime
    ) -> None:
        self.db.execute(
            PasswordResetToken.__table__.insert().values(
                user_id=user_id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
        )
        self.db.commit()

    def mark_password_reset_token_used(self, token_hash: str) -> bool:
        result = self.db.execute(
            update(PasswordResetToken.__table__)
            .where(
                PasswordResetToken.__table__.c.token_hash == token_hash,
                PasswordResetToken.__table__.c.used_at.is_(None),
            )
            .values(used_at=datetime.now(timezone.utc))
        )
        self.db.commit()
        return result.rowcount > 0

    def cleanup_expired_auth_tokens(self) -> None:
        self.db.execute(
            delete(EmailVerificationToken.__table__).where(
                EmailVerificationToken.__table__.c.expires_at <= datetime.now(timezone.utc)
            )
        )
        self.db.execute(
            delete(PasswordResetToken.__table__).where(
                PasswordResetToken.__table__.c.expires_at <= datetime.now(timezone.utc)
            )
        )
        self.db.commit()

    def ensure_demo_company_account(
        self,
        *,
        role_name: str = "Company",
        company_name: str = "SmartHire Technologies",
        email: str = "viona.lushta@icloud.com",
        password_hash: str,
        first_name: str = "Viona",
        last_name: str = "Lushta",
        phone: str = "+1 (555) 013-2048",
    ) -> dict:
        role = self.ensure_role(role_name, f"{role_name} user")
        user = self.get_user_by_email(email)
        if user is None:
            user = self.create_user(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                password_hash=password_hash,
                role_id=role["role_id"],
                email_verified_at=datetime.now(timezone.utc),
            )
        company = self.get_company_by_name(company_name)
        if company is None:
            company = self.create_company(
                name=company_name,
                industry="Technology",
                location="Remote",
            )
        existing_membership = (
            self.db.execute(
                select(CompanyUser.__table__).where(
                    CompanyUser.__table__.c.company_id == company["company_id"],
                    CompanyUser.__table__.c.user_id == user["user_id"],
                )
            )
            .mappings()
            .first()
        )
        if existing_membership is None:
            self.assign_user_to_company(
                company_id=company["company_id"],
                user_id=user["user_id"],
                position="Hiring Lead",
            )
        return {"user": user, "company": company}

    def _decorate_user_row(self, row):
        if row is None:
            return None
        user = dict(row)
        company_row = (
            self.db.execute(
                select(
                    CompanyUser.__table__.c.company_id.label("company_id"),
                    Company.__table__.c.name.label("company_name"),
                    CompanyUser.__table__.c.position.label("company_position"),
                )
                .select_from(
                    CompanyUser.__table__.join(
                        Company.__table__,
                        Company.__table__.c.company_id == CompanyUser.__table__.c.company_id,
                    )
                )
                .where(CompanyUser.__table__.c.user_id == user["user_id"])
                .order_by(CompanyUser.__table__.c.id.asc())
            )
            .mappings()
            .first()
        )
        if company_row:
            user.update(dict(company_row))
        user["is_verified"] = user.get("email_verified_at") is not None
        return user
