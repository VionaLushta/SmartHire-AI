from __future__ import annotations

from sqlalchemy import delete, insert, or_, select, update
from sqlalchemy.orm import Session

from app.models.company_user import CompanyUser
from app.models.job import Category, Department, Job, JobCategory
from app.schemas.job import JobCreate, JobUpdate


class JobRepository:
    PUBLISHED_STATUSES = {"active", "open"}

    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _table():
        return Job.__table__

    def get_company(self, company_id: int):
        from app.models.company import Company

        statement = select(Company.__table__).where(
            Company.__table__.c.company_id == company_id
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def get_company_for_user(self, company_id, user_id):
        statement = select(CompanyUser.__table__).where(
            CompanyUser.__table__.c.company_id == company_id,
            CompanyUser.__table__.c.user_id == user_id,
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def get_department(self, department_id: int):
        statement = select(Department.__table__).where(
            Department.__table__.c.department_id == department_id
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def get_categories(self, category_ids: list[int]) -> list[dict]:
        if not category_ids:
            return []
        statement = select(Category.__table__).where(
            Category.__table__.c.category_id.in_(category_ids),
            Category.__table__.c.deleted_at.is_(None),
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def create(self, payload: JobCreate) -> dict:
        statement = (
            insert(self._table())
            .values(
                title=payload.title,
                description=payload.description,
                responsibilities=payload.responsibilities,
                requirements=payload.requirements,
                employment_type=payload.employment_type,
                experience_level=payload.experience_level,
                salary_min=payload.salary_min,
                salary_max=payload.salary_max,
                location=payload.location,
                remote_option=payload.remote_option,
                company_id=payload.company_id,
                department_id=payload.department_id,
                deadline=payload.deadline,
                status=payload.status,
            )
            .returning(*self._table().c)
        )
        row = self.db.execute(statement).mappings().one()
        job = dict(row)
        self.db.commit()
        return job

    def list(self) -> list[dict]:
        statement = select(self._table()).order_by(self._table().c.job_id)
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def list_for_company(self, company_id: int) -> list[dict]:
        statement = (
            select(self._table())
            .where(self._table().c.company_id == company_id)
            .order_by(self._table().c.job_id)
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def list_published(self) -> list[dict]:
        statement = (
            select(self._table())
            .where(
                or_(
                    self._table().c.status.is_(None),
                    self._table().c.status.in_(self.PUBLISHED_STATUSES),
                )
            )
            .order_by(self._table().c.job_id)
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def get_by_id(self, job_id: int) -> dict | None:
        statement = select(self._table()).where(self._table().c.job_id == job_id)
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def update(self, job_id: int, payload: JobUpdate) -> dict | None:
        values = payload.model_dump(exclude_unset=True, exclude={"category_ids"})
        if not values:
            return self.get_by_id(job_id)
        statement = (
            update(self._table())
            .where(self._table().c.job_id == job_id)
            .values(**values)
            .returning(*self._table().c)
        )
        row = self.db.execute(statement).mappings().first()
        self.db.commit()
        return dict(row) if row else None

    def delete(self, job_id: int) -> bool:
        self.db.execute(
            delete(JobCategory.__table__).where(
                JobCategory.__table__.c.job_id == job_id
            )
        )
        statement = delete(self._table()).where(self._table().c.job_id == job_id)
        result = self.db.execute(statement)
        self.db.commit()
        return result.rowcount > 0

    def replace_job_categories(self, job_id: int, category_ids: list[int]) -> None:
        self.db.execute(
            delete(JobCategory.__table__).where(
                JobCategory.__table__.c.job_id == job_id
            )
        )
        if category_ids:
            self.db.execute(
                insert(JobCategory.__table__),
                [
                    {"job_id": job_id, "category_id": category_id}
                    for category_id in category_ids
                ],
            )
        self.db.commit()

    def fetch_job_categories(self, job_id: int) -> list[dict]:
        statement = (
            select(Category.__table__)
            .select_from(
                JobCategory.__table__.join(
                    Category.__table__,
                    Category.__table__.c.category_id
                    == JobCategory.__table__.c.category_id,
                )
            )
            .where(
                JobCategory.__table__.c.job_id == job_id,
                Category.__table__.c.deleted_at.is_(None),
            )
            .order_by(Category.__table__.c.category_id)
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def fetch_job_category_ids(self, job_id: int) -> list[int]:
        statement = select(JobCategory.__table__.c.category_id).where(
            JobCategory.__table__.c.job_id == job_id
        )
        return [row[0] for row in self.db.execute(statement).all()]
