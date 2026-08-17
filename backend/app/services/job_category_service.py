from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.job_category_repository import JobCategoryRepository
from app.schemas.job_category import (
    JobCategoryCreate,
    JobCategoryRead,
    JobCategoryUpdate,
)


class JobCategoryService:
    def __init__(self, db: Session) -> None:
        self.repo = JobCategoryRepository(db)

    def create_category(self, payload: JobCategoryCreate) -> JobCategoryRead:
        if self.repo.get_by_name(payload.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category name already exists.",
            )
        return JobCategoryRead.model_validate(self.repo.create(payload))

    def list_categories(self) -> list[JobCategoryRead]:
        return [
            JobCategoryRead.model_validate(category) for category in self.repo.list()
        ]

    def get_category(self, category_id: int) -> JobCategoryRead:
        category = self.repo.get_by_id(category_id)
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found."
            )
        return JobCategoryRead.model_validate(category)

    def update_category(
        self, category_id: int, payload: JobCategoryUpdate
    ) -> JobCategoryRead:
        current = self.repo.get_by_id(category_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found."
            )
        if (
            payload.name
            and payload.name != current["name"]
            and self.repo.get_by_name(payload.name)
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category name already exists.",
            )
        updated = self.repo.update(category_id, payload)
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found."
            )
        return JobCategoryRead.model_validate(updated)

    def delete_category(self, category_id: int) -> None:
        current = self.repo.get_by_id(category_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found."
            )
        if not self.repo.soft_delete(category_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found."
            )
