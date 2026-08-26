from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.company_repository import CompanyRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.company import CompanyCreate, CompanyRead, CompanyUpdate


class CompanyService:
    def __init__(self, db: Session) -> None:
        self.repo = CompanyRepository(db)

    def create_company(
        self, payload: CompanyCreate, current_user: CurrentUserResponse
    ) -> CompanyRead:
        if current_user.role_name != "Admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        if self.repo.get_by_name(payload.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Organization name already exists.",
            )
        return CompanyRead.model_validate(self.repo.create(payload))

    def list_companies(self, current_user: CurrentUserResponse) -> list[CompanyRead]:
        if current_user.role_name != "Admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        return [CompanyRead.model_validate(company) for company in self.repo.list()]

    def get_company(
        self, company_id: int, current_user: CurrentUserResponse
    ) -> CompanyRead:
        company = self.repo.get_by_id(company_id)
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Company not found."
            )
        if (
            current_user.role_name != "Admin"
            and self.repo.get_company_for_user(company_id, current_user.user_id) is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        return CompanyRead.model_validate(company)

    def update_company(
        self, company_id: int, payload: CompanyUpdate, current_user: CurrentUserResponse
    ) -> CompanyRead:
        current = self.repo.get_by_id(company_id)
        if current is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Company not found."
            )
        if (
            current_user.role_name != "Admin"
            and self.repo.get_company_for_user(company_id, current_user.user_id) is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        if (
            payload.name
            and payload.name != current["name"]
            and self.repo.get_by_name(payload.name)
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Organization name already exists.",
            )
        updated = self.repo.update(company_id, payload)
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Company not found."
            )
        return CompanyRead.model_validate(updated)

    def delete_company(
        self, company_id: int, current_user: CurrentUserResponse
    ) -> None:
        if (
            current_user.role_name != "Admin"
            and self.repo.get_company_for_user(company_id, current_user.user_id) is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        deleted = self.repo.delete(company_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Company not found."
            )
