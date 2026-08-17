from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.job_dashboard_repository import JobDashboardRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.job_dashboard import JobDashboardResponse


class JobDashboardService:
    def __init__(self, db: Session) -> None:
        self.repo = JobDashboardRepository(db)

    def get_dashboard(
        self, job_id: int, current_user: CurrentUserResponse
    ) -> JobDashboardResponse:
        job = self.repo.get_job(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )
        if current_user.role_name != "Admin":
            from app.repositories.job_repository import JobRepository

            if (
                JobRepository(self.repo.db).get_company_for_user(
                    job["company_id"], current_user.user_id
                )
                is None
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
                )

        company = self.repo.get_company(job["company_id"])
        department = self.repo.get_department(job["department_id"])
        required_skills = self.repo.get_required_skills(job_id)
        applicants_count = self.repo.applicants_count(job_id)
        ai_average_score = self.repo.ai_average_score(job_id)
        top_candidates = self.repo.top_candidates(job_id)
        interview_count = self.repo.interview_count(job_id)
        recent_applications = self.repo.recent_applications(job_id)

        hiring_status = job["status"] or "open"
        if hiring_status not in {"open", "closed", "active", "paused"}:
            hiring_status = "open"

        return JobDashboardResponse(
            job=job,
            company=company,
            department=department,
            required_skills=required_skills,
            applicants_count=applicants_count,
            ai_average_score=ai_average_score,
            top_candidates=top_candidates,
            interview_count=interview_count,
            hiring_status=hiring_status,
            recent_applications=recent_applications,
        )
