from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.user import User


class Interview(Base):
    __tablename__ = "interviews"

    interview_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.application_id"), nullable=False, index=True
    )
    interviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    interview_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    application: Mapped["Application"] = relationship(back_populates="interviews")
    interviewer: Mapped["User"] = relationship(back_populates="interviews")
    feedbacks: Mapped[list["InterviewFeedback"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan"
    )


class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"

    feedback_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    interview_id: Mapped[int] = mapped_column(
        ForeignKey("interviews.interview_id"), nullable=False
    )
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    interview: Mapped["Interview"] = relationship(back_populates="feedbacks")


from app.models.application import Application  # isort: skip
from app.models.user import User  # isort: skip

Application.interviews = relationship(
    "Interview", back_populates="application", cascade="all, delete-orphan"
)  # type: ignore[attr-defined]
User.interviews = relationship(
    "Interview", back_populates="interviewer", cascade="all, delete-orphan"
)  # type: ignore[attr-defined]
