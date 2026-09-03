from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.company import Company
    from app.models.skill import Skill
    from app.models.user import User


class Department(Base):
    __tablename__ = "departments"
    __table_args__ = (
        UniqueConstraint("company_id", "name", name="uq_departments_company_name"),
    )

    department_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.company_id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    company: Mapped["Company"] = relationship(back_populates="departments")
    jobs: Mapped[list["Job"]] = relationship(back_populates="department")


class Category(Base):
    __tablename__ = "categories"

    category_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    jobs: Mapped[list["Job"]] = relationship(
        secondary="job_categories", back_populates="categories"
    )


class Job(Base):
    __tablename__ = "jobs"

    job_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.company_id"), nullable=False, index=True
    )
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.department_id"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsibilities: Mapped[str | None] = mapped_column(Text, nullable=True)
    requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    experience_level: Mapped[str | None] = mapped_column(String(100), nullable=True)
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remote_option: Mapped[bool] = mapped_column(default=False, nullable=False)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    company: Mapped["Company"] = relationship(back_populates="jobs")
    department: Mapped["Department | None"] = relationship(back_populates="jobs")
    applications: Mapped[list["Application"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )
    skills: Mapped[list["JobSkill"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )
    categories: Mapped[list["Category"]] = relationship(
        secondary="job_categories", back_populates="jobs"
    )
    saved_by_users: Mapped[list["SavedJob"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )


class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (
        UniqueConstraint("job_id", "skill_id", name="uq_job_skills_job_skill"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.job_id"), nullable=False)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.skill_id"), nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    required_level: Mapped[int | None] = mapped_column(Integer, nullable=True)

    job: Mapped["Job"] = relationship(back_populates="skills")
    skill: Mapped["Skill"] = relationship(back_populates="job_links")


class JobCategory(Base):
    __tablename__ = "job_categories"
    __table_args__ = (
        UniqueConstraint(
            "job_id", "category_id", name="uq_job_categories_job_category"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.job_id"), nullable=False)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.category_id"), nullable=False
    )


class SavedJob(Base):
    __tablename__ = "saved_jobs"
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_saved_jobs_user_job"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id"), nullable=False
    )
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.job_id"), nullable=False)
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="saved_jobs")
    job: Mapped["Job"] = relationship(back_populates="saved_by_users")


from app.models.user import User  # isort: skip

User.saved_jobs = relationship(  # type: ignore[attr-defined]
    "SavedJob",
    back_populates="user",
    cascade="all, delete-orphan",
)
