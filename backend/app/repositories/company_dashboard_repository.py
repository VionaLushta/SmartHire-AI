from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.application import AIAnalysis, Application
from app.models.company import Company
from app.models.interview import Interview
from app.models.job import Department, Job
from app.repositories.job_repository import JobRepository


class CompanyDashboardRepository:
    PUBLISHED_STATUSES = JobRepository.PUBLISHED_STATUSES

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_company(self, company_id: int):
        statement = select(Company.__table__).where(
            Company.__table__.c.company_id == company_id
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    def total_jobs(self, company_id: int) -> int:
        table = Job.__table__
        return (
            self.db.scalar(
                select(func.count())
                .select_from(table)
                .where(table.c.company_id == company_id)
            )
            or 0
        )

    def active_jobs(self, company_id: int) -> int:
        table = Job.__table__
        return (
            self.db.scalar(
                select(func.count())
                .select_from(table)
                .where(
                    table.c.company_id == company_id,
                    table.c.status.is_(None) | table.c.status.in_(self.PUBLISHED_STATUSES),
                )
            )
            or 0
        )

    def closed_jobs(self, company_id: int) -> int:
        table = Job.__table__
        return (
            self.db.scalar(
                select(func.count())
                .select_from(table)
                .where(table.c.company_id == company_id, table.c.status == "closed")
            )
            or 0
        )

    def departments_count(self, company_id: int) -> int:
        table = Department.__table__
        return (
            self.db.scalar(
                select(func.count())
                .select_from(table)
                .where(table.c.company_id == company_id)
            )
            or 0
        )

    def applications_count(self, company_id: int) -> int:
        app_table = Application.__table__
        job_table = Job.__table__
        statement = (
            select(func.count())
            .select_from(app_table)
            .join(job_table, job_table.c.job_id == app_table.c.job_id)
            .where(job_table.c.company_id == company_id)
        )
        return self.db.scalar(statement) or 0

    def interviews_count(self, company_id: int) -> int:
        interview_table = Interview.__table__
        app_table = Application.__table__
        job_table = Job.__table__
        statement = (
            select(func.count())
            .select_from(interview_table)
            .join(
                app_table,
                app_table.c.application_id == interview_table.c.application_id,
            )
            .join(job_table, job_table.c.job_id == app_table.c.job_id)
            .where(job_table.c.company_id == company_id)
        )
        return self.db.scalar(statement) or 0

    def pending_applications(self, company_id: int) -> int:
        app_table = Application.__table__
        job_table = Job.__table__
        statement = (
            select(func.count())
            .select_from(app_table)
            .join(job_table, job_table.c.job_id == app_table.c.job_id)
            .where(
                job_table.c.company_id == company_id,
                app_table.c.status.in_(("pending", "submitted")),
            )
        )
        return self.db.scalar(statement) or 0

    def ai_average_score(self, company_id: int) -> float | None:
        ai_table = AIAnalysis.__table__
        app_table = Application.__table__
        job_table = Job.__table__
        statement = (
            select(func.avg(ai_table.c.overall_score))
            .select_from(ai_table)
            .join(app_table, app_table.c.application_id == ai_table.c.application_id)
            .join(job_table, job_table.c.job_id == app_table.c.job_id)
            .where(job_table.c.company_id == company_id)
        )
        return self.db.scalar(statement)

    def recent_applications(self, company_id: int, limit: int = 5) -> list[dict]:
        app_table = Application.__table__
        job_table = Job.__table__
        statement = (
            select(
                app_table.c.application_id,
                app_table.c.job_id,
                app_table.c.status,
                app_table.c.created_at,
            )
            .select_from(app_table)
            .join(job_table, job_table.c.job_id == app_table.c.job_id)
            .where(job_table.c.company_id == company_id)
            .order_by(app_table.c.created_at.desc())
            .limit(limit)
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]
