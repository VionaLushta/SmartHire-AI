from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.company_dashboard_repository import CompanyDashboardRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.company_dashboard import CompanyDashboardResponse


class CompanyDashboardService:
    def __init__(self, db: Session) -> None:
        self.repo = CompanyDashboardRepository(db)

    def get_dashboard(
        self, company_id: int, current_user: CurrentUserResponse
    ) -> CompanyDashboardResponse:
        company = self.repo.get_company(company_id)
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Company not found."
            )
        if current_user.role_name != "Admin":
            # If the user is not an admin, they must be a member of the company.
            from app.repositories.company_repository import CompanyRepository

            if (
                CompanyRepository(self.repo.db).get_company_for_user(
                    company_id, current_user.user_id
                )
                is None
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
                )

        return CompanyDashboardResponse(
            company_id=company["company_id"],
            company_name=company["name"],
            industry=company["industry"],
            website=company["website"],
            logo=company["logo"],
            location=company["location"],
            total_jobs=self.repo.total_jobs(company_id),
            active_jobs=self.repo.active_jobs(company_id),
            closed_jobs=self.repo.closed_jobs(company_id),
            departments_count=self.repo.departments_count(company_id),
            applications_count=self.repo.applications_count(company_id),
            interviews_count=self.repo.interviews_count(company_id),
            pending_applications=self.repo.pending_applications(company_id),
            ai_average_score=self.repo.ai_average_score(company_id),
            recent_applications=self.repo.recent_applications(company_id),
        )
