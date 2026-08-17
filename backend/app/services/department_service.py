from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.department_repository import DepartmentRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentUpdate


class DepartmentService:
    def __init__(self, db: Session) -> None:
        self.repo = DepartmentRepository(db)

    def create_department(
        self, payload: DepartmentCreate, current_user: CurrentUserResponse
    ) -> DepartmentRead:
        if (
            current_user.role_name != "Admin"
            and self.repo.get_company_for_user(payload.company_id, current_user.user_id)
            is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        if self.repo.get_by_name_and_company(payload.company_id, payload.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Department name already exists in this company.",
            )
        return DepartmentRead.model_validate(self.repo.create(payload))

    def list_departments(
        self, current_user: CurrentUserResponse
    ) -> list[DepartmentRead]:
        if current_user.role_name != "Admin":
            return []
        return [
            DepartmentRead.model_validate(department) for department in self.repo.list()
        ]

    def get_department(
        self, department_id: int, current_user: CurrentUserResponse
    ) -> DepartmentRead:
        department = self.repo.get_by_id(department_id)
        if department is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Department not found."
            )
        if (
            current_user.role_name != "Admin"
            and self.repo.get_company_for_user(
                department["company_id"], current_user.user_id
            )
            is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        return DepartmentRead.model_validate(department)

    def update_department(
        self,
        department_id: int,
        payload: DepartmentUpdate,
        current_user: CurrentUserResponse,
    ) -> DepartmentRead:
        current = self.repo.get_by_id(department_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Department not found."
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

        target_company_id = (
            payload.company_id
            if payload.company_id is not None
            else current["company_id"]
        )
        target_name = payload.name if payload.name is not None else current["name"]
        duplicate = self.repo.get_by_name_and_company(target_company_id, target_name)
        if duplicate and duplicate["department_id"] != department_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Department name already exists in this company.",
            )

        updated = self.repo.update(department_id, payload)
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Department not found."
            )
        return DepartmentRead.model_validate(updated)

    def delete_department(
        self, department_id: int, current_user: CurrentUserResponse
    ) -> None:
        current = self.repo.get_by_id(department_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Department not found."
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
        deleted = self.repo.delete(department_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Department not found."
            )
