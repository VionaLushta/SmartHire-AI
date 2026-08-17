from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.user import User


class Training(Base):
    __tablename__ = "trainings"

    training_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.company_id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    capacity: Mapped[int | None] = mapped_column(nullable=True)

    company: Mapped["Company"] = relationship(back_populates="trainings")
    enrollments: Mapped[list["TrainingEnrollment"]] = relationship(
        back_populates="training", cascade="all, delete-orphan"
    )


class TrainingEnrollment(Base):
    __tablename__ = "training_enrollments"
    __table_args__ = (
        UniqueConstraint(
            "training_id", "user_id", name="uq_training_enrollments_training_user"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    training_id: Mapped[int] = mapped_column(
        ForeignKey("trainings.training_id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False
    )
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    training: Mapped["Training"] = relationship(back_populates="enrollments")
    user: Mapped["User"] = relationship(back_populates="training_enrollments")
