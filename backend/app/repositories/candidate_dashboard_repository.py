from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.certificate import Certificate
from app.models.company import Company
from app.models.interview import Interview
from app.models.job import Department, Job, SavedJob
from app.models.resume import Resume
from app.models.training import TrainingEnrollment
from app.models.user import User


class CandidateDashboardRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_user(self, user_id: uuid.UUID):
        statement = select(User.__table__).where(User.__table__.c.user_id == user_id)
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    def latest_resume(self, user_id: uuid.UUID):
        table = Resume.__table__
        statement = (
            select(table)
            .where(table.c.user_id == user_id)
            .order_by(table.c.resume_id.desc())
            .limit(1)
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    def certificates_count(self, user_id: uuid.UUID) -> int:
        table = Certificate.__table__
        return (
            self.db.scalar(
                select(func.count())
                .select_from(table)
                .where(table.c.user_id == user_id)
            )
            or 0
        )

    def applications_count(self, user_id: uuid.UUID) -> int:
        table = Application.__table__
        return (
            self.db.scalar(
                select(func.count())
                .select_from(table)
                .where(table.c.user_id == user_id)
            )
            or 0
        )

    def interviews_count(self, user_id: uuid.UUID) -> int:
        interview_table = Interview.__table__
        app_table = Application.__table__
        statement = (
            select(func.count())
            .select_from(interview_table)
            .join(
                app_table,
                app_table.c.application_id == interview_table.c.application_id,
            )
            .where(app_table.c.user_id == user_id)
        )
        return self.db.scalar(statement) or 0

    def saved_jobs_count(self, user_id: uuid.UUID) -> int:
        table = SavedJob.__table__
        return (
            self.db.scalar(
                select(func.count())
                .select_from(table)
                .where(table.c.user_id == user_id)
            )
            or 0
        )

    def training_enrollments_count(self, user_id: uuid.UUID) -> int:
        table = TrainingEnrollment.__table__
        return (
            self.db.scalar(
                select(func.count())
                .select_from(table)
                .where(table.c.user_id == user_id)
            )
            or 0
        )

    def applied_job_ids(self, user_id: uuid.UUID) -> set[int]:
        table = Application.__table__
        statement = select(table.c.job_id).where(table.c.user_id == user_id)
        return {row[0] for row in self.db.execute(statement).all()}

    def saved_job_ids(self, user_id: uuid.UUID) -> set[int]:
        table = SavedJob.__table__
        statement = select(table.c.job_id).where(table.c.user_id == user_id)
        return {row[0] for row in self.db.execute(statement).all()}

    def recommended_jobs(self, user_id: uuid.UUID, limit: int = 5) -> list[dict]:
        job_table = Job.__table__
        department_table = Department.__table__
        company_table = Company.__table__
        excluded_job_ids = self.applied_job_ids(user_id) | self.saved_job_ids(user_id)

        statement = (
            select(
                job_table.c.job_id,
                job_table.c.title,
                job_table.c.company_id,
                company_table.c.name.label("company_name"),
                job_table.c.department_id,
                job_table.c.location,
                job_table.c.remote_option,
                job_table.c.deadline,
                job_table.c.status,
                department_table.c.name.label("department_name"),
            )
            .select_from(
                job_table.join(
                    company_table, company_table.c.company_id == job_table.c.company_id
                ).outerjoin(
                    department_table,
                    department_table.c.department_id == job_table.c.department_id,
                )
            )
            .where(job_table.c.status.is_(None) | (job_table.c.status == "active"))
            .order_by(job_table.c.created_at.desc())
            .limit(limit)
        )
        rows = self.db.execute(statement).mappings().all()

        results: list[dict] = []
        for row in rows:
            job_id = row["job_id"]
            if job_id in excluded_job_ids:
                continue
            results.append(dict(row))
            if len(results) >= limit:
                break

        return results

    def profile_completion_percent(self, user_id: uuid.UUID) -> int:
        user = self.get_user(user_id)
        if user is None:
            return 0

        fields = [
            user.get("first_name"),
            user.get("last_name"),
            user.get("email"),
            user.get("phone"),
            user.get("profile_picture_url"),
            user.get("city"),
            user.get("country"),
            user.get("linkedin_url"),
            user.get("github_url"),
            user.get("portfolio_url"),
        ]
        filled = sum(1 for value in fields if value not in (None, ""))
        return round((filled / len(fields)) * 100) if fields else 0
