from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.certificate import CertificateSkill
    from app.models.job import JobCategory, JobSkill
    from app.models.resume_skill import ResumeSkill


class Skill(Base):
    __tablename__ = "skills"

    skill_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)

    job_links: Mapped[list["JobSkill"]] = relationship(
        back_populates="skill", cascade="all, delete-orphan"
    )
    resume_links: Mapped[list["ResumeSkill"]] = relationship(
        back_populates="skill", cascade="all, delete-orphan"
    )
    certificate_links: Mapped[list["CertificateSkill"]] = relationship(
        back_populates="skill",
        cascade="all, delete-orphan",
    )
