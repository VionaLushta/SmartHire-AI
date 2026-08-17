from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.resume_skill import ResumeSkill
    from app.models.user import User


class Resume(Base):
    __tablename__ = "resumes"

    resume_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True
    )
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    parsed_text: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="resumes")
    applications: Mapped[list["Application"]] = relationship(back_populates="resume")
    educations: Mapped[list["Education"]] = relationship(
        back_populates="resume", cascade="all, delete-orphan"
    )
    work_experiences: Mapped[list["WorkExperience"]] = relationship(
        back_populates="resume", cascade="all, delete-orphan"
    )
    projects: Mapped[list["Project"]] = relationship(
        back_populates="resume", cascade="all, delete-orphan"
    )
    awards: Mapped[list["Award"]] = relationship(
        back_populates="resume", cascade="all, delete-orphan"
    )
    skills: Mapped[list["ResumeSkill"]] = relationship(
        back_populates="resume", cascade="all, delete-orphan"
    )


class Education(Base):
    __tablename__ = "educations"

    education_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    resume_id: Mapped[int] = mapped_column(
        ForeignKey("resumes.resume_id"), nullable=False
    )
    institution: Mapped[str] = mapped_column(String(255), nullable=False)
    degree: Mapped[str | None] = mapped_column(String(255), nullable=True)
    field_of_study: Mapped[str | None] = mapped_column(String(255), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    resume: Mapped["Resume"] = relationship(back_populates="educations")


class WorkExperience(Base):
    __tablename__ = "work_experiences"

    work_experience_id: Mapped[int] = mapped_column(
        primary_key=True, autoincrement=True
    )
    resume_id: Mapped[int] = mapped_column(
        ForeignKey("resumes.resume_id"), nullable=False
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    resume: Mapped["Resume"] = relationship(back_populates="work_experiences")


class Project(Base):
    __tablename__ = "projects"

    project_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    resume_id: Mapped[int] = mapped_column(
        ForeignKey("resumes.resume_id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    resume: Mapped["Resume"] = relationship(back_populates="projects")


class Award(Base):
    __tablename__ = "awards"

    award_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    resume_id: Mapped[int] = mapped_column(
        ForeignKey("resumes.resume_id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    issuer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    awarded_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    resume: Mapped["Resume"] = relationship(back_populates="awards")


class Language(Base):
    __tablename__ = "languages"

    language_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    code: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)

    user_links: Mapped[list["UserLanguage"]] = relationship(
        back_populates="language", cascade="all, delete-orphan"
    )


class UserLanguage(Base):
    __tablename__ = "user_languages"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "language_id", name="uq_user_languages_user_language"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False
    )
    language_id: Mapped[int] = mapped_column(
        ForeignKey("languages.language_id"), nullable=False
    )
    proficiency: Mapped[str | None] = mapped_column(String(50), nullable=True)

    user: Mapped["User"] = relationship(back_populates="languages")
    language: Mapped["Language"] = relationship(back_populates="user_links")


from app.models.user import User  # isort: skip

User.languages = relationship(
    "UserLanguage", back_populates="user", cascade="all, delete-orphan"
)  # type: ignore[attr-defined]
