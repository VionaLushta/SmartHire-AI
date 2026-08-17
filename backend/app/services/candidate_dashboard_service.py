from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.candidate_dashboard_repository import CandidateDashboardRepository
from app.schemas.candidate_dashboard import (
    CandidateDashboardRecommendedJob,
    CandidateDashboardResponse,
    CandidateDashboardResume,
)


class CandidateDashboardService:
    def __init__(self, db: Session) -> None:
        self.repo = CandidateDashboardRepository(db)

    def get_dashboard(self, user_id: uuid.UUID) -> CandidateDashboardResponse:
        user = self.repo.get_user(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found."
            )

        resume = self.repo.latest_resume(user_id)
        resume_payload = (
            CandidateDashboardResume(**resume) if resume is not None else None
        )

        return CandidateDashboardResponse(
            user_id=user_id,
            profile_completion_percent=self.repo.profile_completion_percent(user_id),
            uploaded_resume=resume_payload,
            certificates_count=self.repo.certificates_count(user_id),
            applications_count=self.repo.applications_count(user_id),
            interviews_count=self.repo.interviews_count(user_id),
            saved_jobs_count=self.repo.saved_jobs_count(user_id),
            recommended_jobs=[
                CandidateDashboardRecommendedJob(**job)
                for job in self.repo.recommended_jobs(user_id)
            ],
            training_enrollments_count=self.repo.training_enrollments_count(user_id),
        )
