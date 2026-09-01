from __future__ import annotations

import uuid
from collections import defaultdict

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.repositories.job_repository import JobRepository
from app.repositories.job_dashboard_repository import JobDashboardRepository
from app.repositories.job_skill_repository import JobSkillRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.skills import (
    CandidateSkillReportResponse,
    JobSkillGroupResponse,
    JobSkillRead,
    JobSkillCoverageStat,
    JobSkillUpdateRequest,
    JobSkillUpsertRequest,
    SkillLibraryGroup,
    SkillLibraryItem,
    SkillLibraryResponse,
    SkillAnalyticsResponse,
    SkillEvaluationItem,
    SkillStatPoint,
)
from app.services.nlp_matcher import (
    build_candidate_gaps,
    build_candidate_strengths,
    build_skill_report,
    calculate_similarity,
    score_job_fit,
)


class JobSkillService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = JobSkillRepository(db)
        self.job_repo = JobRepository(db)
        self.dashboard_repo = JobDashboardRepository(db)

    def get_job_skills(
        self, job_id: int, current_user: CurrentUserResponse | None
    ) -> JobSkillGroupResponse:
        job = self._get_job_or_404(job_id)
        self._assert_job_access(job, current_user)
        groups = self.dashboard_repo.get_skill_groups(job_id)
        return JobSkillGroupResponse(
            job_id=job_id,
            required_skills=[JobSkillRead.model_validate(row) for row in groups["required_skills"]],
            optional_skills=[JobSkillRead.model_validate(row) for row in groups["optional_skills"]],
        )

    def get_skill_library(self) -> SkillLibraryResponse:
        rows = self.repo.list_skills()
        grouped: dict[str, list[SkillLibraryItem]] = defaultdict(list)
        for row in rows:
            category = str(row.get("category") or "Uncategorized")
            grouped[category].append(SkillLibraryItem.model_validate(row))

        ordered_categories: list[SkillLibraryGroup] = []
        for category in self._skill_category_order():
            if category not in grouped:
                continue
            ordered_categories.append(
                SkillLibraryGroup(
                    category=category,
                    skills=sorted(
                        grouped.pop(category), key=lambda skill: skill.name.casefold()
                    ),
                )
            )

        for category in sorted(grouped, key=str.casefold):
            ordered_categories.append(
                SkillLibraryGroup(
                    category=category,
                    skills=sorted(
                        grouped[category], key=lambda skill: skill.name.casefold()
                    ),
                )
            )

        total_skills = sum(len(group.skills) for group in ordered_categories)
        return SkillLibraryResponse(total_skills=total_skills, categories=ordered_categories)

    def add_job_skill(
        self,
        job_id: int,
        payload: JobSkillUpsertRequest,
        current_user: CurrentUserResponse,
    ) -> JobSkillRead:
        job = self._get_job_or_404(job_id)
        self._assert_job_access(job, current_user)
        if not payload.category:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Skill category is required.",
            )
        result = self.repo.create_or_update_job_skill(
            job_id,
            name=payload.name,
            category=payload.category,
            is_required=payload.is_required,
            required_level=payload.required_level,
        )
        return JobSkillRead.model_validate(result)

    def update_job_skill(
        self,
        job_id: int,
        skill_id: int,
        payload: JobSkillUpdateRequest,
        current_user: CurrentUserResponse,
    ) -> JobSkillRead:
        job = self._get_job_or_404(job_id)
        self._assert_job_access(job, current_user)
        result = self.repo.update_job_skill(
            job_id,
            skill_id,
            name=payload.name,
            category=payload.category,
            is_required=payload.is_required,
            required_level=payload.required_level,
        )
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found."
            )
        return JobSkillRead.model_validate(result)

    def delete_job_skill(
        self, job_id: int, skill_id: int, current_user: CurrentUserResponse
    ) -> None:
        job = self._get_job_or_404(job_id)
        self._assert_job_access(job, current_user)
        if not self.repo.delete_job_skill(job_id, skill_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found."
            )

    def evaluate_candidate_skills(
        self,
        candidate_id: uuid.UUID,
        current_user: CurrentUserResponse,
        *,
        job_id: int | None = None,
    ) -> CandidateSkillReportResponse:
        if current_user.role_name != "Admin" and current_user.user_id != candidate_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )

        application = self._candidate_application(candidate_id, job_id)
        if application is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate application not found.",
            )

        job = self._get_job_or_404(application["job_id"])
        candidate_text = application.get("parsed_text") or application.get("resume_text") or ""
        if not candidate_text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Candidate resume text is unavailable.",
            )

        skill_rows = self.dashboard_repo.get_skill_groups(job["job_id"])
        skills = skill_rows["required_skills"] + skill_rows["optional_skills"]
        if skills:
            report = build_skill_report(candidate_text, skills)
        else:
            report = {
                "report": [],
                "detected": [],
                "partial": [],
                "missing": [],
                "required_coverage": 0.0,
                "optional_coverage": 0.0,
                "strengths": build_candidate_strengths(candidate_text, []),
                "gaps": build_candidate_gaps([], candidate_text),
            }
        resume_similarity = calculate_similarity(job.get("description") or "", candidate_text)
        final_skill_match = score_job_fit(
            resume_similarity,
            report["required_coverage"],
            report["optional_coverage"],
        )
        return CandidateSkillReportResponse(
            candidate_id=application["user_id"],
            candidate_name=application["candidate_name"],
            job_id=job["job_id"],
            job_title=job["title"],
            resume_similarity=resume_similarity,
            required_skill_coverage=report["required_coverage"],
            optional_skill_coverage=report["optional_coverage"],
            final_skill_match=final_skill_match,
            strengths=report["strengths"],
            gaps=report["gaps"],
            report=[SkillEvaluationItem.model_validate(item) for item in report["report"]],
        )

    def analytics(self, current_user: CurrentUserResponse) -> SkillAnalyticsResponse:
        if current_user.role_name != "Admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )

        application_rows = self._application_rows()
        skill_usage: dict[str, int] = defaultdict(int)
        missing_usage: dict[str, int] = defaultdict(int)
        required_coverage: dict[str, list[float]] = defaultdict(list)
        optional_coverage: dict[str, list[float]] = defaultdict(list)
        job_summary: dict[int, dict[str, float | str | int]] = {}
        for row in application_rows:
            skill_groups = self.dashboard_repo.get_skill_groups(row["job_id"])
            skills = skill_groups["required_skills"] + skill_groups["optional_skills"]
            candidate_text = row.get("parsed_text") or ""
            if skills and candidate_text.strip():
                report = build_skill_report(candidate_text, skills)
            else:
                report = {
                    "report": [],
                    "detected": [],
                    "partial": [],
                    "missing": [],
                    "required_coverage": 0.0,
                    "optional_coverage": 0.0,
                }

            score = score_job_fit(
                calculate_similarity(row.get("job_description") or "", candidate_text),
                float(report["required_coverage"]),
                float(report["optional_coverage"]),
            )

            summary = job_summary.setdefault(
                row["job_id"],
                {
                    "job_id": row["job_id"],
                    "job_title": row["job_title"],
                    "scores": [],
                    "required_coverages": [],
                    "optional_coverages": [],
                },
            )
            summary["scores"].append(score)
            summary["required_coverages"].append(float(report["required_coverage"]))
            summary["optional_coverages"].append(float(report["optional_coverage"]))

            for item in report["report"]:
                name = str(item["name"])
                if item["status"] == "Detected":
                    skill_usage[name] += 1
                elif item["status"] == "Partial Match":
                    skill_usage[name] += 1
                else:
                    missing_usage[name] += 1
                if item.get("is_required"):
                    required_coverage[name].append(100.0 if item["status"] == "Detected" else 50.0 if item["status"] == "Partial Match" else 0.0)
                else:
                    optional_coverage[name].append(100.0 if item["status"] == "Detected" else 50.0 if item["status"] == "Partial Match" else 0.0)

        most_common = self._top_points(skill_usage)
        most_missing = self._top_points(missing_usage)
        average_match = [
            JobSkillCoverageStat(
                job_id=job_id,
                job_title=str(summary["job_title"]),
                average_skill_match=round(self._average(summary["scores"]), 1),
                required_skills_coverage=round(
                    self._average(summary["required_coverages"]), 1
                ),
                optional_skills_coverage=round(
                    self._average(summary["optional_coverages"]), 1
                ),
            )
            for job_id, summary in sorted(job_summary.items(), key=lambda item: item[0])
        ]

        return SkillAnalyticsResponse(
            most_common_skills=most_common,
            most_missing_skills=most_missing,
            top_skills_across_candidates=most_common,
            average_skill_match_per_job=average_match,
            required_skills_coverage=self._coverage_points(required_coverage),
            optional_skills_coverage=self._coverage_points(optional_coverage),
        )

    def seed_skill_library(self) -> int:
        return self.repo.seed_skill_library()

    def _application_rows(self) -> list[dict]:
        statement = (
            select(
                Application.__table__.c.application_id,
                Application.__table__.c.user_id,
                Application.__table__.c.job_id,
                Job.__table__.c.title.label("job_title"),
                Job.__table__.c.description.label("job_description"),
                Resume.__table__.c.parsed_text,
                User.__table__.c.first_name,
                User.__table__.c.last_name,
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
                .outerjoin(
                    Resume.__table__,
                    Resume.__table__.c.resume_id == Application.__table__.c.resume_id,
                )
            )
            .order_by(Application.__table__.c.application_id)
        )
        rows = []
        for row in self.db.execute(statement).mappings():
            data = dict(row)
            data["candidate_name"] = f"{data['first_name']} {data['last_name']}".strip()
            rows.append(data)
        return rows

    def _candidate_application(
        self, candidate_id: uuid.UUID, job_id: int | None
    ) -> dict | None:
        statement = (
            select(
                Application.__table__.c.application_id,
                Application.__table__.c.user_id,
                Application.__table__.c.job_id,
                Application.__table__.c.created_at,
                Resume.__table__.c.parsed_text,
                User.__table__.c.first_name,
                User.__table__.c.last_name,
                Resume.__table__.c.parsed_text.label("resume_text"),
            )
            .select_from(
                Application.__table__.join(
                    User.__table__,
                    User.__table__.c.user_id == Application.__table__.c.user_id,
                ).outerjoin(
                    Resume.__table__,
                    Resume.__table__.c.resume_id == Application.__table__.c.resume_id,
                )
            )
            .where(Application.__table__.c.user_id == candidate_id)
        )
        if job_id is not None:
            statement = statement.where(Application.__table__.c.job_id == job_id)
        statement = statement.order_by(Application.__table__.c.created_at.desc())
        row = self.db.execute(statement).mappings().first()
        if row is None:
            return None
        data = dict(row)
        data["candidate_name"] = f"{data['first_name']} {data['last_name']}".strip()
        return data

    def _get_job_or_404(self, job_id: int) -> dict:
        job = self.job_repo.get_by_id(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )
        return job

    @staticmethod
    def _skill_category_order() -> list[str]:
        return [
            "Backend",
            "Frontend",
            "Database",
            "DevOps",
            "Cloud",
            "AI",
            "Soft Skills",
        ]

    def _assert_job_access(
        self, job: dict, current_user: CurrentUserResponse | None
    ) -> None:
        if current_user is None:
            if job.get("status") in JobRepository.PUBLISHED_STATUSES or job.get("status") is None:
                return
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
        if current_user.role_name == "Admin":
            return
        if (
            self.job_repo.get_company_for_user(
                job["company_id"], current_user.user_id
            )
            is None
        ):
            if job.get("status") in JobRepository.PUBLISHED_STATUSES or job.get("status") is None:
                return
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    @staticmethod
    def _average(values: list[float]) -> float:
        if not values:
            return 0.0
        return sum(values) / len(values)

    @staticmethod
    def _top_points(values: dict[str, int]) -> list[SkillStatPoint]:
        return [
            SkillStatPoint(label=label, value=float(count))
            for label, count in sorted(
                values.items(), key=lambda item: (-item[1], item[0].casefold())
            )[:10]
        ]

    @staticmethod
    def _top_points_from_scores(
        scores: list[tuple[str, float]]
    ) -> list[SkillStatPoint]:
        totals: dict[str, list[float]] = defaultdict(list)
        for label, score in scores:
            totals[label].append(score)
        ranked = sorted(
            ((label, sum(values) / len(values)) for label, values in totals.items()),
            key=lambda item: (-item[1], item[0].casefold()),
        )
        return [
            SkillStatPoint(label=label, value=round(score, 1)) for label, score in ranked[:10]
        ]

    @staticmethod
    def _coverage_points(values: dict[str, list[float]]) -> list[SkillStatPoint]:
        ranked = sorted(
            (
                (label, sum(scores) / len(scores))
                for label, scores in values.items()
                if scores
            ),
            key=lambda item: (-item[1], item[0].casefold()),
        )
        return [
            SkillStatPoint(label=label, value=round(score, 1))
            for label, score in ranked[:10]
        ]
