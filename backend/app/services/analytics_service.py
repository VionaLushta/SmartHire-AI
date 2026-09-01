from __future__ import annotations

import logging
import uuid
from time import perf_counter

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ml.analytics_engine import AnalyticsEngine
from app.models.application import AIAnalysis, Application
from app.models.company import Company
from app.models.company_user import CompanyUser
from app.models.interview import Interview
from app.models.job import Job, JobSkill
from app.models.resume_skill import ResumeSkill
from app.models.skill import Skill
from app.models.user import User
from app.schemas.analytics import AnalyticsDashboardResponse
from app.schemas.auth import CurrentUserResponse

logger = logging.getLogger("smarthire.performance")
_CACHE_MISS = object()


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.engine = AnalyticsEngine()
        self._cache: dict[tuple[object, ...], object] = {}

    def overview(self, current_user: CurrentUserResponse) -> AnalyticsDashboardResponse:
        self._require_admin(current_user)
        return self._dashboard("overview")

    def company(
        self, company_id: int, current_user: CurrentUserResponse
    ) -> AnalyticsDashboardResponse:
        self._assert_company_access(company_id, current_user)
        return self._dashboard(f"company:{company_id}", company_id=company_id)

    def job(
        self, job_id: int, current_user: CurrentUserResponse
    ) -> AnalyticsDashboardResponse:
        job = (
            self.db.execute(
                select(Job.__table__).where(Job.__table__.c.job_id == job_id)
            )
            .mappings()
            .first()
        )
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )
        self._assert_company_access(job["company_id"], current_user)
        return self._dashboard(f"job:{job_id}", job_id=job_id)

    def candidate(
        self, candidate_id: uuid.UUID, current_user: CurrentUserResponse
    ) -> AnalyticsDashboardResponse:
        if current_user.role_name != "Admin" and current_user.user_id != candidate_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
        exists = self.db.scalar(
            select(func.count())
            .select_from(User.__table__)
            .where(User.__table__.c.user_id == candidate_id)
        )
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found."
            )
        return self._dashboard(f"candidate:{candidate_id}", user_id=candidate_id)

    def trends(self, current_user: CurrentUserResponse) -> AnalyticsDashboardResponse:
        self._require_admin(current_user)
        return self._dashboard("trends")

    def skills(self, current_user: CurrentUserResponse) -> AnalyticsDashboardResponse:
        self._require_admin(current_user)
        return self._dashboard("skills")

    def export_overview(
        self, report_format: str, current_user: CurrentUserResponse
    ) -> tuple[bytes, str, str]:
        dashboard = self.overview(current_user).model_dump()
        try:
            return self.engine.export(dashboard, report_format)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
            )

    def _dashboard(
        self,
        scope: str,
        *,
        company_id: int | None = None,
        job_id: int | None = None,
        user_id: uuid.UUID | None = None,
    ) -> AnalyticsDashboardResponse:
        cache_key = ("dashboard", scope, company_id, job_id, str(user_id) if user_id is not None else None)
        cached = self._cache.get(cache_key, _CACHE_MISS)
        if cached is not _CACHE_MISS:
            return cached  # type: ignore[return-value]

        started = perf_counter()
        conditions = self._conditions(
            company_id=company_id, job_id=job_id, user_id=user_id
        )
        metrics = self._metrics(
            conditions, company_id=company_id, job_id=job_id, user_id=user_id
        )
        payload = self.engine.build_dashboard(
            scope=scope,
            metrics=metrics,
            funnel_counts=self._funnel_counts(conditions),
            top_candidates=self._top_candidates(conditions),
            requested_skills=self._requested_skills(company_id, job_id),
            common_skills=self._common_skills(conditions),
            missing_skills=self._missing_skills(conditions),
            monthly_applications=self._monthly_applications(conditions),
            ai_scores_by_job=self._ai_scores_by_job(conditions),
        )
        dashboard = AnalyticsDashboardResponse(**payload)
        self._cache[cache_key] = dashboard
        logger.info(
            "analytics dashboard generated scope=%s duration_ms=%.1f",
            scope,
            (perf_counter() - started) * 1000,
        )
        return dashboard

    @staticmethod
    def _conditions(
        *, company_id: int | None, job_id: int | None, user_id: uuid.UUID | None
    ) -> list:
        conditions = []
        if company_id is not None:
            conditions.append(Job.__table__.c.company_id == company_id)
        if job_id is not None:
            conditions.append(Application.__table__.c.job_id == job_id)
        if user_id is not None:
            conditions.append(Application.__table__.c.user_id == user_id)
        return conditions

    def _metrics(
        self,
        conditions: list,
        *,
        company_id: int | None,
        job_id: int | None,
        user_id: uuid.UUID | None,
    ) -> dict:
        cache_key = ("metrics", company_id, job_id, str(user_id) if user_id is not None else None)
        cached = self._cache.get(cache_key, _CACHE_MISS)
        if cached is not _CACHE_MISS:
            return cached  # type: ignore[return-value]

        app_from = Application.__table__.join(
            Job.__table__, Job.__table__.c.job_id == Application.__table__.c.job_id
        )
        application_count = (
            self.db.scalar(
                select(func.count()).select_from(app_from).where(*conditions)
            )
            or 0
        )
        analysis_from = app_from.outerjoin(
            AIAnalysis.__table__,
            AIAnalysis.__table__.c.application_id
            == Application.__table__.c.application_id,
        )
        average_score = self.db.scalar(
            select(func.avg(AIAnalysis.__table__.c.overall_score))
            .select_from(analysis_from)
            .where(*conditions)
        )
        job_conditions = []
        if company_id is not None:
            job_conditions.append(Job.__table__.c.company_id == company_id)
        if job_id is not None:
            job_conditions.append(Job.__table__.c.job_id == job_id)
        total_jobs = (
            self.db.scalar(
                select(func.count(func.distinct(Application.__table__.c.job_id)))
                .select_from(Application.__table__)
                .where(Application.__table__.c.user_id == user_id)
            )
            if user_id is not None
            else self.db.scalar(
                select(func.count()).select_from(Job.__table__).where(*job_conditions)
            )
        ) or 0
        active_jobs = (
            self.db.scalar(
                select(func.count(func.distinct(Application.__table__.c.job_id)))
                .select_from(
                    Application.__table__.join(
                        Job.__table__,
                        Job.__table__.c.job_id == Application.__table__.c.job_id,
                    )
                )
                .where(
                    Application.__table__.c.user_id == user_id,
                    Job.__table__.c.status.in_(("active", "open")),
                )
            )
            if user_id is not None
            else self.db.scalar(
                select(func.count())
                .select_from(Job.__table__)
                .where(Job.__table__.c.status.in_(("active", "open")), *job_conditions)
            )
        ) or 0
        closed_jobs = (
            self.db.scalar(
                select(func.count(func.distinct(Application.__table__.c.job_id)))
                .select_from(
                    Application.__table__.join(
                        Job.__table__,
                        Job.__table__.c.job_id == Application.__table__.c.job_id,
                    )
                )
                .where(
                    Application.__table__.c.user_id == user_id,
                    Job.__table__.c.status == "closed",
                )
            )
            if user_id is not None
            else self.db.scalar(
                select(func.count())
                .select_from(Job.__table__)
                .where(Job.__table__.c.status == "closed", *job_conditions)
            )
        ) or 0
        metrics = {
            "total_companies": 1
            if company_id is not None
            else self.db.scalar(select(func.count()).select_from(Company.__table__))
            or 0,
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "closed_jobs": closed_jobs,
            "total_candidates": self.db.scalar(
                select(func.count(func.distinct(Application.__table__.c.user_id)))
                .select_from(app_from)
                .where(*conditions)
            )
            or 0,
            "total_applications": application_count,
            "total_interviews": self.db.scalar(
                select(func.count())
                .select_from(
                    Interview.__table__.join(
                        Application.__table__,
                        Application.__table__.c.application_id
                        == Interview.__table__.c.application_id,
                    ).join(
                        Job.__table__,
                        Job.__table__.c.job_id == Application.__table__.c.job_id,
                    )
                )
                .where(*conditions)
            )
            or 0,
            "average_ai_match_score": round(float(average_score or 0), 2),
            "average_hiring_probability": round(float(average_score or 0), 2),
            "average_resume_quality": round(
                float(
                    self.db.scalar(
                        select(func.avg(AIAnalysis.__table__.c.skills_score))
                        .select_from(analysis_from)
                        .where(*conditions)
                    )
                    or 0
            ),
            2,
        ),
        }
        self._cache[cache_key] = metrics
        return metrics

    def _funnel_counts(self, conditions: list) -> dict[str, int]:
        cache_key = ("funnel", tuple(str(condition) for condition in conditions))
        cached = self._cache.get(cache_key, _CACHE_MISS)
        if cached is not _CACHE_MISS:
            return cached  # type: ignore[return-value]

        app_from = Application.__table__.join(
            Job.__table__, Job.__table__.c.job_id == Application.__table__.c.job_id
        )
        count_for = lambda condition: (
            self.db.scalar(
                select(func.count()).select_from(app_from).where(*conditions, condition)
            )
            or 0
        )
        return {
            "Applications": count_for(True),
            "AI Screening": self.db.scalar(
                select(func.count())
                .select_from(
                    app_from.join(
                        AIAnalysis.__table__,
                        AIAnalysis.__table__.c.application_id
                        == Application.__table__.c.application_id,
                    )
                )
                .where(*conditions)
            )
            or 0,
            "Reviewed": count_for(
                Application.__table__.c.status.in_(
                    ("reviewed", "interview", "accepted", "rejected", "hired")
                )
            ),
            "Interview": count_for(
                Application.__table__.c.status.in_(("interview", "hired"))
            ),
            "Accepted": count_for(Application.__table__.c.status == "accepted"),
            "Rejected": count_for(Application.__table__.c.status == "rejected"),
            "Hired": count_for(Application.__table__.c.status == "hired"),
        }
        self._cache[cache_key] = funnel
        return funnel

    def _top_candidates(self, conditions: list) -> list[dict]:
        cache_key = ("top_candidates", tuple(str(condition) for condition in conditions))
        cached = self._cache.get(cache_key, _CACHE_MISS)
        if cached is not _CACHE_MISS:
            return cached  # type: ignore[return-value]

        statement = (
            select(
                User.__table__.c.user_id,
                func.concat(
                    User.__table__.c.first_name, " ", User.__table__.c.last_name
                ).label("candidate_name"),
                func.avg(AIAnalysis.__table__.c.overall_score).label("ai_score"),
                func.avg(AIAnalysis.__table__.c.skills_score).label("skill_match"),
                func.avg(AIAnalysis.__table__.c.experience_score).label(
                    "experience_match"
                ),
                func.max(AIAnalysis.__table__.c.resume_score).label("resume_score"),
                func.max(AIAnalysis.__table__.c.education_score).label("education_match"),
                func.max(AIAnalysis.__table__.c.language_score).label("language_match"),
                func.max(AIAnalysis.__table__.c.missing_skills).label("missing_skills"),
                func.max(AIAnalysis.__table__.c.strengths).label("strengths"),
                func.max(AIAnalysis.__table__.c.recommendations).label("ai_recommendation"),
                func.max(Application.__table__.c.status).label("status"),
                func.max(Job.__table__.c.title).label("job_title"),
                func.max(Job.__table__.c.department_id).label("department_id"),
                func.max(User.__table__.c.email).label("email"),
            )
            .select_from(
                Application.__table__.join(
                    Job.__table__,
                    Job.__table__.c.job_id == Application.__table__.c.job_id,
                )
                .join(
                    User.__table__,
                    User.__table__.c.user_id == Application.__table__.c.user_id,
                )
                .join(
                    AIAnalysis.__table__,
                    AIAnalysis.__table__.c.application_id
                    == Application.__table__.c.application_id,
                )
            )
            .where(*conditions)
            .group_by(
                User.__table__.c.user_id,
                User.__table__.c.first_name,
                User.__table__.c.last_name,
            )
            .order_by(func.avg(AIAnalysis.__table__.c.overall_score).desc())
            .limit(10)
        )
        return [
            {
                "candidate_id": str(row["user_id"]),
                "candidate_name": row["candidate_name"],
                "ai_score": round(float(row["ai_score"] or 0), 2),
                "skill_match": round(float(row["skill_match"] or 0), 2),
                "experience_match": round(float(row["experience_match"] or 0), 2),
                "resume_score": round(float(row["resume_score"] or 0), 2),
                "education_match": round(float(row["education_match"] or 0), 2),
                "language_match": round(float(row["language_match"] or 0), 2),
                "missing_skills": row["missing_skills"],
                "strengths": row["strengths"],
                "ai_recommendation": row["ai_recommendation"],
                "status": row["status"],
                "job_title": row["job_title"],
                "department_id": row["department_id"],
                "email": row["email"],
            }
            for row in self.db.execute(statement).mappings()
        ]
        self._cache[cache_key] = rows
        return rows

    def _requested_skills(
        self, company_id: int | None, job_id: int | None
    ) -> list[dict]:
        cache_key = ("requested_skills", company_id, job_id)
        cached = self._cache.get(cache_key, _CACHE_MISS)
        if cached is not _CACHE_MISS:
            return cached  # type: ignore[return-value]

        conditions = [JobSkill.__table__.c.job_id == job_id] if job_id else []
        if company_id is not None:
            conditions.append(Job.__table__.c.company_id == company_id)
        statement = (
            select(Skill.__table__.c.name.label("label"), func.count().label("value"))
            .select_from(
                JobSkill.__table__.join(
                    Job.__table__, Job.__table__.c.job_id == JobSkill.__table__.c.job_id
                ).join(
                    Skill.__table__,
                    Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id,
                )
            )
            .where(*conditions)
            .group_by(Skill.__table__.c.name)
            .order_by(func.count().desc())
            .limit(10)
        )
        rows = [dict(row) for row in self.db.execute(statement).mappings()]
        self._cache[cache_key] = rows
        return rows

    def _common_skills(self, conditions: list) -> list[dict]:
        cache_key = ("common_skills", tuple(str(condition) for condition in conditions))
        cached = self._cache.get(cache_key, _CACHE_MISS)
        if cached is not _CACHE_MISS:
            return cached  # type: ignore[return-value]

        statement = (
            select(Skill.__table__.c.name.label("label"), func.count().label("value"))
            .select_from(
                Application.__table__.join(
                    Job.__table__,
                    Job.__table__.c.job_id == Application.__table__.c.job_id,
                )
                .join(
                    ResumeSkill.__table__,
                    ResumeSkill.__table__.c.resume_id
                    == Application.__table__.c.resume_id,
                )
                .join(
                    Skill.__table__,
                    Skill.__table__.c.skill_id == ResumeSkill.__table__.c.skill_id,
                )
            )
            .where(*conditions)
            .group_by(Skill.__table__.c.name)
            .order_by(func.count().desc())
            .limit(10)
        )
        rows = [dict(row) for row in self.db.execute(statement).mappings()]
        self._cache[cache_key] = rows
        return rows

    def _missing_skills(self, conditions: list) -> list[dict]:
        cache_key = ("missing_skills", tuple(str(condition) for condition in conditions))
        cached = self._cache.get(cache_key, _CACHE_MISS)
        if cached is not _CACHE_MISS:
            return cached  # type: ignore[return-value]

        statement = (
            select(
                Skill.__table__.c.name.label("label"),
                func.count(Application.__table__.c.application_id).label("value"),
            )
            .select_from(
                Application.__table__.join(
                    Job.__table__,
                    Job.__table__.c.job_id == Application.__table__.c.job_id,
                )
                .join(
                    JobSkill.__table__,
                    JobSkill.__table__.c.job_id == Application.__table__.c.job_id,
                )
                .join(
                    Skill.__table__,
                    Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id,
                )
                .outerjoin(
                    ResumeSkill.__table__,
                    (
                        ResumeSkill.__table__.c.resume_id
                        == Application.__table__.c.resume_id
                    )
                    & (
                        ResumeSkill.__table__.c.skill_id
                        == JobSkill.__table__.c.skill_id
                    ),
                )
            )
            .where(*conditions, ResumeSkill.__table__.c.id.is_(None))
            .group_by(Skill.__table__.c.name)
            .order_by(func.count().desc())
            .limit(10)
        )
        rows = [dict(row) for row in self.db.execute(statement).mappings()]
        self._cache[cache_key] = rows
        return rows

    def _monthly_applications(self, conditions: list) -> list[dict]:
        cache_key = ("monthly_applications", tuple(str(condition) for condition in conditions))
        cached = self._cache.get(cache_key, _CACHE_MISS)
        if cached is not _CACHE_MISS:
            return cached  # type: ignore[return-value]

        statement = (
            select(
                func.to_char(
                    func.date_trunc("month", Application.__table__.c.created_at),
                    "YYYY-MM",
                ).label("label"),
                func.count().label("value"),
            )
            .select_from(
                Application.__table__.join(
                    Job.__table__,
                    Job.__table__.c.job_id == Application.__table__.c.job_id,
                )
            )
            .where(*conditions)
            .group_by("label")
            .order_by("label")
        )
        rows = [dict(row) for row in self.db.execute(statement).mappings()]
        self._cache[cache_key] = rows
        return rows

    def _ai_scores_by_job(self, conditions: list) -> list[dict]:
        cache_key = ("ai_scores_by_job", tuple(str(condition) for condition in conditions))
        cached = self._cache.get(cache_key, _CACHE_MISS)
        if cached is not _CACHE_MISS:
            return cached  # type: ignore[return-value]

        statement = (
            select(
                Job.__table__.c.title.label("label"),
                func.avg(AIAnalysis.__table__.c.overall_score).label("value"),
            )
            .select_from(
                Application.__table__.join(
                    Job.__table__,
                    Job.__table__.c.job_id == Application.__table__.c.job_id,
                ).join(
                    AIAnalysis.__table__,
                    AIAnalysis.__table__.c.application_id
                    == Application.__table__.c.application_id,
                )
            )
            .where(*conditions)
            .group_by(Job.__table__.c.title)
            .order_by(func.avg(AIAnalysis.__table__.c.overall_score).desc())
            .limit(10)
        )
        rows = [dict(row) for row in self.db.execute(statement).mappings()]
        self._cache[cache_key] = rows
        return rows

    def _require_admin(self, user: CurrentUserResponse) -> None:
        if user.role_name != "Admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )

    def _assert_company_access(
        self, company_id: int, user: CurrentUserResponse
    ) -> None:
        exists = self.db.scalar(
            select(func.count())
            .select_from(Company.__table__)
            .where(Company.__table__.c.company_id == company_id)
        )
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Company not found."
            )
        if user.role_name == "Admin":
            return
        membership = self.db.scalar(
            select(func.count())
            .select_from(CompanyUser.__table__)
            .where(
                CompanyUser.__table__.c.company_id == company_id,
                CompanyUser.__table__.c.user_id == user.user_id,
            )
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )
