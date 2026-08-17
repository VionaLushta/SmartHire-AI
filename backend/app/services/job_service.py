from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.job_repository import JobRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.job import JobCreate, JobRead, JobUpdate


class JobService:
    def __init__(self, db: Session) -> None:
        self.repo = JobRepository(db)

    def create_job(
        self, payload: JobCreate, current_user: CurrentUserResponse
    ) -> JobRead:
        if (
            current_user.role_name != "Admin"
            and self.repo.get_company_for_user(payload.company_id, current_user.user_id)
            is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        if self.repo.get_company(payload.company_id) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Company must exist."
            )
        if payload.department_id is not None:
            department = self.repo.get_department(payload.department_id)
            if department is None or department["company_id"] != payload.company_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department must belong to Company.",
                )
        categories = self.repo.get_categories(payload.category_ids)
        if len(categories) != len(payload.category_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Category must exist."
            )

        job = self.repo.create(payload)
        self.repo.replace_job_categories(job["job_id"], payload.category_ids)
        job["category_ids"] = [category["category_id"] for category in categories]
        return JobRead.model_validate(job)

    def list_jobs(self, current_user: CurrentUserResponse) -> list[JobRead]:
        if current_user.role_name != "Admin":
            return []
        jobs = self.repo.list()
        for job in jobs:
            job["category_ids"] = self.repo.fetch_job_category_ids(job["job_id"])
        return [JobRead.model_validate(job) for job in jobs]

    def get_job(self, job_id: int, current_user: CurrentUserResponse) -> JobRead:
        job = self.repo.get_by_id(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )
        if (
            current_user.role_name != "Admin"
            and self.repo.get_company_for_user(job["company_id"], current_user.user_id)
            is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        job["category_ids"] = self.repo.fetch_job_category_ids(job_id)
        return JobRead.model_validate(job)

    def update_job(
        self, job_id: int, payload: JobUpdate, current_user: CurrentUserResponse
    ) -> JobRead:
        current = self.repo.get_by_id(job_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )
        if (
            current_user.role_name != "Admin"
            and self.repo.get_company_for_user(
                current["company_id"], current_user.user_id
            )
            is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )

        company_id = (
            payload.company_id
            if payload.company_id is not None
            else current["company_id"]
        )
        department_id = (
            payload.department_id
            if payload.department_id is not None
            else current["department_id"]
        )
        category_ids = payload.category_ids
        if company_id is not None and self.repo.get_company(company_id) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Company must exist."
            )
        if department_id is not None:
            department = self.repo.get_department(department_id)
            if department is None or department["company_id"] != company_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department must belong to Company.",
                )
        if category_ids is not None:
            categories = self.repo.get_categories(category_ids)
            if len(categories) != len(category_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category must exist.",
                )
        updated = self.repo.update(job_id, payload)
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )
        if category_ids is not None:
            self.repo.replace_job_categories(job_id, category_ids)
            updated["category_ids"] = self.repo.fetch_job_category_ids(job_id)
        else:
            updated["category_ids"] = self.repo.fetch_job_category_ids(job_id)
        return JobRead.model_validate(updated)

    def delete_job(self, job_id: int, current_user: CurrentUserResponse) -> None:
        current = self.repo.get_by_id(job_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )
        if (
            current_user.role_name != "Admin"
            and self.repo.get_company_for_user(
                current["company_id"], current_user.user_id
            )
            is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        if not self.repo.delete(job_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )
