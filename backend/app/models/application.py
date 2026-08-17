from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.job import Job
    from app.models.resume import Resume
    from app.models.user import User


class Application(Base):
    __tablename__ = "applications"

    application_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True
    )
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.job_id"), nullable=False, index=True
    )
    resume_id: Mapped[int | None] = mapped_column(
        ForeignKey("resumes.resume_id"), nullable=True
    )
    status: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default="submitted", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="applications")
    job: Mapped["Job"] = relationship(back_populates="applications")
    resume: Mapped["Resume | None"] = relationship(back_populates="applications")
    analysis: Mapped["AIAnalysis | None"] = relationship(
        back_populates="application", cascade="all, delete-orphan", uselist=False
    )
    recruiter_notes: Mapped[list["RecruiterNote"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    parsed_documents: Mapped[list["ParsedDocument"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list["AIRecommendation"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    cover_letters: Mapped[list["CoverLetter"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    company_analytics: Mapped[list["CompanyAnalytics"]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
    )
    file_uploads: Mapped[list["FileUpload"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )


class RecruiterNote(Base):
    __tablename__ = "recruiter_notes"

    note_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.application_id"), nullable=False
    )
    note: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    application: Mapped["Application"] = relationship(back_populates="recruiter_notes")


class ParsedDocument(Base):
    __tablename__ = "parsed_documents"

    document_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.application_id"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    parsed_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    application: Mapped["Application"] = relationship(back_populates="parsed_documents")


class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"

    recommendation_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.application_id"), nullable=False
    )
    recommendation_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    application: Mapped["Application"] = relationship(back_populates="recommendations")


class CoverLetter(Base):
    __tablename__ = "cover_letters"

    cover_letter_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.application_id"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    application: Mapped["Application"] = relationship(back_populates="cover_letters")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.application_id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    application: Mapped["Application"] = relationship(back_populates="notifications")
    user: Mapped["User"] = relationship(back_populates="notifications")


class FileUpload(Base):
    __tablename__ = "file_uploads"

    upload_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.application_id"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    application: Mapped["Application"] = relationship(back_populates="file_uploads")


class CompanyAnalytics(Base):
    __tablename__ = "company_analytics"

    analytics_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.application_id"), nullable=False
    )
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.company_id"), nullable=False
    )
    metric_name: Mapped[str] = mapped_column(String(120), nullable=False)
    metric_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    application: Mapped["Application"] = relationship(
        back_populates="company_analytics"
    )
    company: Mapped["Company"] = relationship(back_populates="analytics")


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"

    analysis_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.application_id"), nullable=False, unique=True
    )
    overall_score: Mapped[float | None] = mapped_column(nullable=True)
    skills_score: Mapped[float | None] = mapped_column(nullable=True)
    education_score: Mapped[float | None] = mapped_column(nullable=True)
    experience_score: Mapped[float | None] = mapped_column(nullable=True)
    certificate_score: Mapped[float | None] = mapped_column(nullable=True)
    recommendations: Mapped[str | None] = mapped_column(Text, nullable=True)

    application: Mapped["Application"] = relationship(back_populates="analysis")


from app.models.company import Company  # isort: skip
from app.models.user import User  # isort: skip

User.notifications = relationship(
    "Notification", back_populates="user", cascade="all, delete-orphan"
)  # type: ignore[attr-defined]
Company.analytics = relationship(
    "CompanyAnalytics", back_populates="company", cascade="all, delete-orphan"
)  # type: ignore[attr-defined]
