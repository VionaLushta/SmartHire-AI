from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base

if TYPE_CHECKING:
    from app.models.resume import Resume
    from app.models.skill import Skill


class ResumeSkill(Base):
    __tablename__ = "resume_skills"
    __table_args__ = (
        UniqueConstraint("resume_id", "skill_id", name="uq_resume_skills_resume_skill"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    resume_id: Mapped[int] = mapped_column(
        ForeignKey("resumes.resume_id"), nullable=False
    )
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.skill_id"), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    resume: Mapped["Resume"] = relationship(back_populates="skills")
    skill: Mapped["Skill"] = relationship(back_populates="resume_links")
