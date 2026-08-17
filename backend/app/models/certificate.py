from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.skill import Skill
    from app.models.user import User


class Certificate(Base):
    __tablename__ = "certificates"

    cert_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    issuer: Mapped[str | None] = mapped_column(String(255))
    issue_date: Mapped[date | None] = mapped_column(Date)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="certificates")
    skills: Mapped[list["CertificateSkill"]] = relationship(
        back_populates="certificate", cascade="all, delete-orphan"
    )


class CertificateSkill(Base):
    __tablename__ = "certificate_skills"
    __table_args__ = (
        UniqueConstraint(
            "certificate_id", "skill_id", name="uq_certificate_skills_certificate_skill"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    certificate_id: Mapped[int] = mapped_column(
        ForeignKey("certificates.cert_id"), nullable=False
    )
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.skill_id"), nullable=False)
    confidence: Mapped[float | None] = mapped_column(nullable=True)

    certificate: Mapped["Certificate"] = relationship(back_populates="skills")
    skill: Mapped["Skill"] = relationship(back_populates="certificate_links")
