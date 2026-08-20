from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.application import AIAnalysis, Application
from app.models.company import Company
from app.models.interview import Interview
from app.models.job import Department, Job, JobSkill
from app.models.skill import Skill
from app.models.user import User


class JobDashboardRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_job(self, job_id: int):
        statement = select(Job.__table__).where(Job.__table__.c.job_id == job_id)
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def get_company(self, company_id: int):
        statement = select(Company.__table__).where(
            Company.__table__.c.company_id == company_id
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def get_department(self, department_id: int | None):
        if department_id is None:
            return None
        statement = select(Department.__table__).where(
            Department.__table__.c.department_id == department_id
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def get_required_skills(self, job_id: int) -> list[dict]:
        return self.get_skill_groups(job_id)["required_skills"]

    def get_optional_skills(self, job_id: int) -> list[dict]:
        return self.get_skill_groups(job_id)["optional_skills"]

    def get_skill_groups(self, job_id: int) -> dict[str, list[dict]]:
        statement = (
            select(
                JobSkill.__table__.c.id,
                JobSkill.__table__.c.job_id,
                JobSkill.__table__.c.skill_id,
                JobSkill.__table__.c.is_required,
                JobSkill.__table__.c.required_level,
                Skill.__table__.c.name,
                Skill.__table__.c.category,
            )
            .select_from(
                JobSkill.__table__.join(
                    Skill.__table__,
                    Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id,
                )
            )
            .where(JobSkill.__table__.c.job_id == job_id)
            .order_by(JobSkill.__table__.c.is_required.desc(), Skill.__table__.c.name)
        )
        required_skills: list[dict] = []
        optional_skills: list[dict] = []
        for row in self.db.execute(statement).mappings().all():
            skill = dict(row)
            if skill.get("is_required", True):
                required_skills.append(skill)
            else:
                optional_skills.append(skill)
        return {"required_skills": required_skills, "optional_skills": optional_skills}

    def applicants_count(self, job_id: int) -> int:
        statement = (
            select(func.count())
            .select_from(Application.__table__)
            .where(Application.__table__.c.job_id == job_id)
        )
        return self.db.scalar(statement) or 0

    def ai_average_score(self, job_id: int) -> float | None:
        statement = (
            select(func.avg(AIAnalysis.__table__.c.overall_score))
            .select_from(
                AIAnalysis.__table__.join(
                    Application.__table__,
                    Application.__table__.c.application_id
                    == AIAnalysis.__table__.c.application_id,
                )
            )
            .where(Application.__table__.c.job_id == job_id)
        )
        return self.db.scalar(statement)

    def top_candidates(self, job_id: int, limit: int = 10) -> list[dict]:
        statement = (
            select(
                Application.__table__.c.application_id,
                Application.__table__.c.user_id,
                func.concat(
                    User.__table__.c.first_name, " ", User.__table__.c.last_name
                ).label("user_name"),
                Application.__table__.c.resume_id,
                Application.__table__.c.status,
                AIAnalysis.__table__.c.overall_score,
                Application.__table__.c.created_at,
            )
            .select_from(
                Application.__table__.join(
                    User.__table__,
                    User.__table__.c.user_id == Application.__table__.c.user_id,
                ).outerjoin(
                    AIAnalysis.__table__,
                    AIAnalysis.__table__.c.application_id
                    == Application.__table__.c.application_id,
                )
            )
            .where(Application.__table__.c.job_id == job_id)
            .order_by(
                AIAnalysis.__table__.c.overall_score.desc().nullslast(),
                Application.__table__.c.created_at.desc(),
            )
            .limit(limit)
        )
        rows = self.db.execute(statement).mappings().all()
        return [dict(row) for row in rows]

    def interview_count(self, job_id: int) -> int:
        statement = (
            select(func.count())
            .select_from(Interview.__table__)
            .where(
                Interview.__table__.c.application_id.in_(
                    select(Application.__table__.c.application_id).where(
                        Application.__table__.c.job_id == job_id
                    )
                )
            )
        )
        return self.db.scalar(statement) or 0

    def recent_applications(self, job_id: int, limit: int = 5) -> list[dict]:
        statement = (
            select(
                Application.__table__.c.application_id,
                Application.__table__.c.user_id,
                func.concat(
                    User.__table__.c.first_name, " ", User.__table__.c.last_name
                ).label("user_name"),
                Application.__table__.c.status,
                Application.__table__.c.created_at,
            )
            .select_from(
                Application.__table__.join(
                    User.__table__,
                    User.__table__.c.user_id == Application.__table__.c.user_id,
                )
            )
            .where(Application.__table__.c.job_id == job_id)
            .order_by(Application.__table__.c.created_at.desc())
            .limit(limit)
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]
