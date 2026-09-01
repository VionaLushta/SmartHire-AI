from __future__ import annotations

import csv
import json
import logging
import uuid
from collections import defaultdict
from datetime import date, datetime, timezone
from io import StringIO
from pathlib import Path
from statistics import mean
from time import perf_counter
from typing import Any, Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ml.candidate_ranker import CandidateRanker
from app.ml.skill_extractor import SkillExtractor
from app.models.application import AIAnalysis, Application
from app.models.certificate import Certificate, CertificateSkill
from app.models.company_user import CompanyUser
from app.models.interview import Interview, InterviewFeedback
from app.models.job import Job, JobSkill
from app.models.resume import Education, Language, Resume, UserLanguage, WorkExperience
from app.models.resume_skill import ResumeSkill
from app.models.skill import Skill
from app.models.user import User
from app.repositories.job_repository import JobRepository
from app.schemas.candidate_ranking import (
    CandidateComparisonItem,
    CandidateRankingExportResponse,
    CandidateRankingItem,
    CandidateRankingResponse,
    CandidateRankingShortlist,
    CandidateRankingSupport,
    ExportFormat,
    HiringRecommendation,
    RankingRiskLevel,
)
from app.schemas.auth import CurrentUserResponse
from app.services.audit_log_service import record_audit_event

logger = logging.getLogger("smarthire.performance")


class CandidateRankingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.job_repo = JobRepository(db)
        self.skill_extractor = SkillExtractor()
        self.base_ranker = CandidateRanker()
        self._rank_cache: dict[int, CandidateRankingResponse] = {}

    def ranking(
        self,
        job_id: int,
        current_user: CurrentUserResponse,
        *,
        limit: int | None = None,
    ) -> CandidateRankingResponse:
        started = perf_counter()
        job = self._get_job(job_id)
        self._assert_job_access(job, current_user)
        ranked = self._rank_job_candidates(job)
        response = self._build_response(job, ranked, limit=limit)
        logger.info(
            "candidate ranking generated job_id=%s candidates=%s duration_ms=%.1f",
            job_id,
            len(response.ranking),
            (perf_counter() - started) * 1000,
        )
        record_audit_event(
            self.db,
            user_id=current_user.user_id,
            user_role=str(current_user.role_name or "Recruiter"),
            action="Candidate Ranking Generated",
            entity_type="CandidateRanking",
            entity_id=str(job_id),
            description="Candidate ranking generated.",
            status="Success",
            metadata={"limit": limit},
        )
        return response

    def compare_candidates(
        self,
        job_id: int,
        candidate_ids: Sequence[uuid.UUID],
        current_user: CurrentUserResponse,
    ) -> list[CandidateComparisonItem]:
        ranking = self.ranking(job_id, current_user)
        by_id = {item.candidate_id: item for item in ranking.ranking}
        selected = []
        for candidate_id in candidate_ids:
            item = by_id.get(candidate_id)
            if item is not None:
                selected.append(
                    CandidateComparisonItem(
                        candidate_id=item.candidate_id,
                        candidate_name=item.candidate_name,
                        ranking_position=item.ranking_position,
                        overall_score=item.overall_score,
                        ai_match_score=item.ai_match_score,
                        experience_years=item.experience_years,
                        education=item.education,
                        certificates=item.certificates,
                        languages=item.languages,
                        interview_readiness=item.interview_readiness,
                        recruiter_rating=item.recruiter_rating,
                        strengths=item.strengths,
                        weaknesses=item.weaknesses,
                        risk_level=item.risk_level,
                        hiring_recommendation=item.hiring_recommendation,
                    )
                )
        if not selected:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No matching candidates found for comparison.",
            )
        return sorted(selected, key=lambda item: item.ranking_position)

    def export(
        self,
        job_id: int,
        current_user: CurrentUserResponse,
        *,
        report_format: ExportFormat = "json",
    ) -> tuple[bytes, str, str]:
        ranking = self.ranking(job_id, current_user)
        started = perf_counter()
        table = self._build_export_table(ranking)
        if report_format == "csv":
            buffer = StringIO()
            writer = csv.DictWriter(buffer, fieldnames=table["columns"])
            writer.writeheader()
            writer.writerows(table["rows"])
            content = buffer.getvalue().encode("utf-8")
            media_type = "text/csv"
            filename = f"candidate_ranking_job_{job_id}.csv"
        elif report_format == "json":
            payload = {
                "generated_at": ranking.generated_at.isoformat(),
                "job_id": ranking.job_id,
                "job_title": ranking.job_title,
                "dataset": table,
            }
            content = json.dumps(payload, default=str, indent=2).encode("utf-8")
            media_type = "application/json"
            filename = f"candidate_ranking_job_{job_id}.json"
        elif report_format == "powerbi":
            payload = {
                "generated_at": ranking.generated_at.isoformat(),
                "job_id": ranking.job_id,
                "job_title": ranking.job_title,
                "dataset": {
                    "name": table["name"],
                    "columns": table["columns"],
                    "rows": table["rows"],
                },
            }
            content = json.dumps(payload, default=str, indent=2).encode("utf-8")
            media_type = "application/json"
            filename = f"candidate_ranking_job_{job_id}_powerbi.json"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported export format.",
            )
        logger.info(
            "candidate ranking exported job_id=%s format=%s duration_ms=%.1f",
            job_id,
            report_format,
            (perf_counter() - started) * 1000,
        )
        record_audit_event(
            self.db,
            user_id=current_user.user_id,
            user_role=str(current_user.role_name or "Recruiter"),
            action="Candidate Ranking Generated",
            entity_type="CandidateRanking",
            entity_id=str(job_id),
            description="Candidate ranking exported.",
            status="Success",
            metadata={"format": report_format},
        )
        return content, media_type, filename

    def _build_response(
        self,
        job: dict[str, Any],
        ranked: list[dict[str, Any]],
        *,
        limit: int | None = None,
        comparison_ids: Sequence[uuid.UUID] | None = None,
    ) -> CandidateRankingResponse:
        ranking_items = [self._to_item(job, row) for row in ranked]
        shortlist = self._build_shortlist(ranking_items)
        support = self._build_support(ranking_items)
        comparison = []
        if comparison_ids:
            selected = {candidate_id for candidate_id in comparison_ids}
            comparison = [
                CandidateComparisonItem(
                    candidate_id=item.candidate_id,
                    candidate_name=item.candidate_name,
                    ranking_position=item.ranking_position,
                    overall_score=item.overall_score,
                    ai_match_score=item.ai_match_score,
                    experience_years=item.experience_years,
                    education=item.education,
                    certificates=item.certificates,
                    languages=item.languages,
                    interview_readiness=item.interview_readiness,
                    recruiter_rating=item.recruiter_rating,
                    strengths=item.strengths,
                    weaknesses=item.weaknesses,
                    risk_level=item.risk_level,
                    hiring_recommendation=item.hiring_recommendation,
                )
                for item in ranking_items
                if item.candidate_id in selected
            ]
        visible_ranking = ranking_items[:limit] if limit is not None else ranking_items
        return CandidateRankingResponse(
            job_id=job["job_id"],
            job_title=job.get("title"),
            total_candidates=len(ranking_items),
            generated_at=datetime.now(timezone.utc),
            ranking=visible_ranking,
            shortlist=shortlist,
            support=support,
            comparison=comparison,
        )

    def _rank_job_candidates(self, job: dict[str, Any]) -> list[dict[str, Any]]:
        applications = self._fetch_applications(job["job_id"])
        if not applications:
            if self._application_count(job["job_id"]) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No candidates applied for this job.",
                )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No candidate analysis available for this job.",
            )

        job_skills = self._job_skills(job["job_id"])
        ranked_inputs = [
            self._build_candidate_record(application, job, job_skills)
            for application in applications
        ]
        base_ranked = self.base_ranker.rank(
            [
                {
                    "candidate_id": row["candidate_id"],
                    "candidate_name": row["candidate_name"],
                    "application_date": row["application_date"],
                    "overall_ai_match": row["ai_match_score"],
                    "required_skill_match": row["detected_skill_score"],
                    "experience_match": row["experience_score"],
                    "education_match": row["education_score"],
                    "certification_match": row["certificate_score"],
                    "matched_skills": row["matched_skill_count"],
                    "missing_skills": len(row["missing_skills"]),
                    "experience_years": row["experience_years"],
                    "degrees": row["education"],
                    "certifications": row["certificates"],
                }
                for row in ranked_inputs
            ],
            sort_by="overall_score",
        )

        by_id = {row["candidate_id"]: row for row in ranked_inputs}
        merged: list[dict[str, Any]] = []
        for base in base_ranked:
            row = by_id[base["candidate_id"]]
            merged.append(self._merge_scores(row, base))
        merged.sort(key=lambda item: (-item["overall_score"], -item["confidence_score"], item["candidate_name"].casefold()))
        for position, row in enumerate(merged, start=1):
            row["ranking_position"] = position
        return merged

    def _merge_scores(self, row: dict[str, Any], base: dict[str, Any]) -> dict[str, Any]:
        base_score = float(base["overall_score"])
        missing_skill_score = self._score_missing_skills(
            row["required_skill_count"],
            row["optional_skill_count"],
            row["missing_required_count"],
            row["missing_optional_count"],
        )
        language_score = self._score_languages(row["languages"], row["job_language_hints"])
        interview_readiness = self._score_interview_readiness(row)
        recruiter_rating_score = self._score_recruiter_rating(row["recruiter_rating"])
        overall_score = round(
            max(
                0.0,
                min(
                    100.0,
                    base_score * 0.70
                    + missing_skill_score * 0.10
                    + language_score * 0.05
                    + interview_readiness * 0.10
                    + recruiter_rating_score * 0.05,
                ),
            )
        )
        strengths, weaknesses = self._build_strengths_and_weaknesses(
            row, base_score, missing_skill_score, language_score, interview_readiness, recruiter_rating_score
        )
        risk_level = self._risk_level(overall_score, row["missing_required_count"], interview_readiness)
        recommendation = self._hiring_recommendation(overall_score, risk_level, interview_readiness)
        confidence = self._confidence_score(
            row,
            base_score=base_score,
            missing_skill_score=missing_skill_score,
            language_score=language_score,
            interview_readiness=interview_readiness,
            recruiter_rating_score=recruiter_rating_score,
        )
        explanation = self._ranking_explanation(
            row,
            overall_score=overall_score,
            base_score=base_score,
            missing_skill_score=missing_skill_score,
            language_score=language_score,
            interview_readiness=interview_readiness,
            recruiter_rating_score=recruiter_rating_score,
        )
        return {
            **row,
            "overall_score": overall_score,
            "confidence_score": confidence,
            "ranking_explanation": explanation,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "risk_level": risk_level,
            "hiring_recommendation": recommendation,
            "interview_readiness": interview_readiness,
            "recruiter_rating": recruiter_rating_score if row["recruiter_rating"] is not None else None,
        }

    def _build_candidate_record(
        self,
        application: dict[str, Any],
        job: dict[str, Any],
        job_skills: dict[str, list[str]],
    ) -> dict[str, Any]:
        user_id = application["user_id"]
        resume_id = application.get("resume_id")
        resume_text = application.get("parsed_text") or ""
        resume_skills = self._resume_skills(resume_id)
        skill_text = self.skill_extractor.extract(resume_text)["skills"] if resume_text else []
        detected_skills = self._dedupe_case_insensitive([*resume_skills, *skill_text])
        required_skills = job_skills["required"]
        optional_skills = job_skills["optional"]
        matched_required = [skill for skill in required_skills if self._contains_skill(detected_skills, skill)]
        matched_optional = [skill for skill in optional_skills if self._contains_skill(detected_skills, skill)]
        missing_required = [skill for skill in required_skills if not self._contains_skill(detected_skills, skill)]
        missing_optional = [skill for skill in optional_skills if not self._contains_skill(detected_skills, skill)]
        experience_years = self._experience_years(resume_id)
        education = self._education_summary(resume_id)
        certificates = self._certificates(user_id)
        languages = self._languages(user_id)
        recruiter_rating = self._recruiter_rating(application["application_id"])
        ai_match = float(application.get("overall_score") or 0)
        skills_score = float(application.get("skills_score") or self._skill_match_score(matched_required, required_skills, matched_optional, optional_skills))
        education_score = float(application.get("education_score") or self._education_score(education, job["description"]))
        experience_score = float(application.get("experience_score") or self._experience_score(experience_years, job.get("experience_level")))
        certificate_score = float(application.get("certificate_score") or self._certificate_score(certificates, required_skills))
        job_language_hints = self._extract_language_hints(job.get("description") or "")
        return {
            "application_id": application["application_id"],
            "candidate_id": user_id,
            "candidate_name": application["candidate_name"],
            "job_id": job["job_id"],
            "job_title": job.get("title"),
            "application_date": application["application_date"],
            "status": application.get("status"),
            "ai_match_score": ai_match,
            "skills_score": skills_score,
            "education_score": education_score,
            "experience_score": experience_score,
            "certificate_score": certificate_score,
            "detected_skills": detected_skills,
            "detected_skill_score": self._skill_match_score(matched_required, required_skills, matched_optional, optional_skills),
            "matched_skill_count": len(matched_required) + len(matched_optional),
            "required_skill_count": len(required_skills),
            "optional_skill_count": len(optional_skills),
            "missing_required_count": len(missing_required),
            "missing_optional_count": len(missing_optional),
            "missing_skills": missing_required + missing_optional,
            "matched_skills": matched_required + matched_optional,
            "experience_years": experience_years,
            "education": education,
            "certificates": certificates,
            "languages": languages,
            "job_language_hints": job_language_hints,
            "recruiter_rating": recruiter_rating,
            "interview_count": self._interview_count(application["application_id"]),
            "interview_feedback_count": self._interview_feedback_count(application["application_id"]),
        }

    def _to_item(self, job: dict[str, Any], row: dict[str, Any]) -> CandidateRankingItem:
        return CandidateRankingItem(
            application_id=row["application_id"],
            candidate_id=row["candidate_id"],
            candidate_name=row["candidate_name"],
            job_id=job["job_id"],
            job_title=job.get("title"),
            ranking_position=row["ranking_position"],
            overall_score=row["overall_score"],
            confidence_score=row["confidence_score"],
            ai_match_score=round(float(row["ai_match_score"]), 1),
            detected_skills=row["detected_skills"],
            missing_skills=row["missing_skills"],
            experience_years=round(float(row["experience_years"]), 2),
            education=row["education"],
            certificates=row["certificates"],
            languages=row["languages"],
            interview_readiness=row["interview_readiness"],
            recruiter_rating=row["recruiter_rating"],
            ranking_explanation=row["ranking_explanation"],
            strengths=row["strengths"],
            weaknesses=row["weaknesses"],
            risk_level=row["risk_level"],
            hiring_recommendation=row["hiring_recommendation"],
        )

    def _build_shortlist(self, ranking: list[CandidateRankingItem]) -> CandidateRankingShortlist:
        top_5 = ranking[:5]
        top_10 = ranking[:10]
        top_20 = ranking[:20]
        best_junior = self._best_by_experience(ranking, maximum=3.0)
        best_senior = self._best_by_experience(ranking, minimum=5.0)
        best_overall = ranking[0] if ranking else None
        return CandidateRankingShortlist(
            top_5=top_5,
            top_10=top_10,
            top_20=top_20,
            best_junior_candidate=best_junior,
            best_senior_candidate=best_senior,
            best_overall_candidate=best_overall,
        )

    def _build_support(self, ranking: list[CandidateRankingItem]) -> CandidateRankingSupport:
        recommended_interview_order = sorted(
            ranking,
            key=lambda item: (-item.interview_readiness, -item.overall_score, item.ranking_position),
        )
        recommended_hiring_order = sorted(
            ranking,
            key=lambda item: (-item.overall_score, -item.confidence_score, item.ranking_position),
        )
        manual_review = [
            item
            for item in ranking
            if item.risk_level in {"High", "Critical"} or item.confidence_score < 60
        ]
        additional_interview = [
            item
            for item in ranking
            if item.interview_readiness < 65 and item.overall_score >= 60
        ]
        return CandidateRankingSupport(
            recommended_interview_order=recommended_interview_order,
            recommended_hiring_order=recommended_hiring_order,
            candidates_requiring_manual_review=manual_review,
            candidates_requiring_additional_interview=additional_interview,
        )

    def _build_export_table(self, ranking: CandidateRankingResponse) -> dict[str, Any]:
        columns = [
            "ranking_position",
            "candidate_id",
            "candidate_name",
            "job_id",
            "job_title",
            "overall_score",
            "confidence_score",
            "ai_match_score",
            "detected_skills",
            "missing_skills",
            "experience_years",
            "education",
            "certificates",
            "languages",
            "interview_readiness",
            "recruiter_rating",
            "ranking_explanation",
            "strengths",
            "weaknesses",
            "risk_level",
            "hiring_recommendation",
        ]
        rows = []
        for item in ranking.ranking:
            rows.append(
                {
                    "ranking_position": item.ranking_position,
                    "candidate_id": str(item.candidate_id),
                    "candidate_name": item.candidate_name,
                    "job_id": item.job_id,
                    "job_title": item.job_title,
                    "overall_score": item.overall_score,
                    "confidence_score": item.confidence_score,
                    "ai_match_score": item.ai_match_score,
                    "detected_skills": "; ".join(item.detected_skills),
                    "missing_skills": "; ".join(item.missing_skills),
                    "experience_years": item.experience_years,
                    "education": "; ".join(item.education),
                    "certificates": "; ".join(item.certificates),
                    "languages": "; ".join(item.languages),
                    "interview_readiness": item.interview_readiness,
                    "recruiter_rating": item.recruiter_rating,
                    "ranking_explanation": item.ranking_explanation,
                    "strengths": "; ".join(item.strengths),
                    "weaknesses": "; ".join(item.weaknesses),
                    "risk_level": item.risk_level,
                    "hiring_recommendation": item.hiring_recommendation,
                }
            )
        return {"name": "candidate_ranking", "columns": columns, "rows": rows}

    def _fetch_applications(self, job_id: int) -> list[dict[str, Any]]:
        statement = (
            select(
                Application.__table__.c.application_id,
                Application.__table__.c.user_id,
                Application.__table__.c.resume_id,
                Application.__table__.c.status,
                Application.__table__.c.created_at.label("application_date"),
                User.__table__.c.first_name,
                User.__table__.c.last_name,
                AIAnalysis.__table__.c.overall_score,
                AIAnalysis.__table__.c.skills_score,
                AIAnalysis.__table__.c.education_score,
                AIAnalysis.__table__.c.experience_score,
                AIAnalysis.__table__.c.certificate_score,
                Resume.__table__.c.parsed_text,
            )
            .select_from(
                Application.__table__
                .join(User.__table__, User.__table__.c.user_id == Application.__table__.c.user_id)
                .outerjoin(
                    AIAnalysis.__table__,
                    AIAnalysis.__table__.c.application_id == Application.__table__.c.application_id,
                )
                .outerjoin(
                    Resume.__table__,
                    Resume.__table__.c.resume_id == Application.__table__.c.resume_id,
                )
            )
            .where(Application.__table__.c.job_id == job_id)
            .order_by(Application.__table__.c.created_at.desc())
        )
        return [
            {
                **dict(row),
                "candidate_name": f"{row['first_name']} {row['last_name']}".strip(),
            }
            for row in self.db.execute(statement).mappings().all()
        ]

    def _application_count(self, job_id: int) -> int:
        statement = select(func.count()).select_from(Application.__table__).where(
            Application.__table__.c.job_id == job_id
        )
        return self.db.scalar(statement) or 0

    def _get_job(self, job_id: int) -> dict[str, Any]:
        job = self.job_repo.get_by_id(job_id)
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
        return job

    def _assert_job_access(self, job: dict[str, Any], current_user: CurrentUserResponse) -> None:
        role = str(current_user.role_name or "").casefold()
        if role == "admin":
            return
        membership = self.db.execute(
            select(CompanyUser.__table__.c.id).where(
                CompanyUser.__table__.c.company_id == job["company_id"],
                CompanyUser.__table__.c.user_id == current_user.user_id,
            )
        ).first()
        if membership is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    def _job_skills(self, job_id: int) -> dict[str, list[str]]:
        statement = (
            select(
                JobSkill.__table__.c.is_required,
                Skill.__table__.c.name,
            )
            .select_from(
                JobSkill.__table__.join(
                    Skill.__table__, Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id
                )
            )
            .where(JobSkill.__table__.c.job_id == job_id)
            .order_by(JobSkill.__table__.c.is_required.desc(), Skill.__table__.c.name)
        )
        required: list[str] = []
        optional: list[str] = []
        for row in self.db.execute(statement).mappings().all():
            if row["is_required"]:
                required.append(row["name"])
            else:
                optional.append(row["name"])
        return {"required": required, "optional": optional}

    def _resume_skills(self, resume_id: int | None) -> list[str]:
        if resume_id is None:
            return []
        statement = (
            select(Skill.__table__.c.name)
            .select_from(
                ResumeSkill.__table__.join(
                    Skill.__table__, Skill.__table__.c.skill_id == ResumeSkill.__table__.c.skill_id
                )
            )
            .where(ResumeSkill.__table__.c.resume_id == resume_id)
        )
        return list(self.db.scalars(statement))

    def _education_summary(self, resume_id: int | None) -> list[str]:
        if resume_id is None:
            return []
        statement = select(
            Education.__table__.c.degree,
            Education.__table__.c.field_of_study,
            Education.__table__.c.institution,
        ).where(Education.__table__.c.resume_id == resume_id)
        result = []
        for degree, field_of_study, institution in self.db.execute(statement):
            parts = [part for part in [degree, field_of_study, institution] if part]
            if parts:
                result.append(" - ".join(parts))
        return result

    def _experience_years(self, resume_id: int | None) -> float:
        if resume_id is None:
            return 0.0
        statement = select(
            WorkExperience.__table__.c.start_date,
            WorkExperience.__table__.c.end_date,
        ).where(WorkExperience.__table__.c.resume_id == resume_id)
        total_days = 0
        for start_date, end_date in self.db.execute(statement):
            if start_date:
                total_days += max(0, ((end_date or date.today()) - start_date).days)
        return round(total_days / 365.25, 2)

    def _certificates(self, user_id: Any) -> list[str]:
        statement = select(Certificate.__table__.c.title).where(
            Certificate.__table__.c.user_id == user_id
        )
        return list(self.db.scalars(statement))

    def _languages(self, user_id: Any) -> list[str]:
        statement = (
            select(Language.__table__.c.name, UserLanguage.__table__.c.proficiency)
            .select_from(
                UserLanguage.__table__.join(
                    Language.__table__,
                    Language.__table__.c.language_id == UserLanguage.__table__.c.language_id,
                )
            )
            .where(UserLanguage.__table__.c.user_id == user_id)
            .order_by(Language.__table__.c.name)
        )
        values = []
        for name, proficiency in self.db.execute(statement):
            if proficiency:
                values.append(f"{name} ({proficiency})")
            else:
                values.append(name)
        return values

    def _recruiter_rating(self, application_id: int) -> float | None:
        statement = (
            select(InterviewFeedback.__table__.c.score)
            .select_from(
                Interview.__table__.join(
                    InterviewFeedback.__table__,
                    InterviewFeedback.__table__.c.interview_id == Interview.__table__.c.interview_id,
                )
            )
            .where(Interview.__table__.c.application_id == application_id)
        )
        scores = [score for score in self.db.scalars(statement) if score is not None]
        if not scores:
            return None
        average_score = float(mean(scores))
        return round(self._normalize_score(average_score), 1)

    def _interview_count(self, application_id: int) -> int:
        statement = select(func.count()).select_from(Interview.__table__).where(
            Interview.__table__.c.application_id == application_id
        )
        return self.db.scalar(statement) or 0

    def _interview_feedback_count(self, application_id: int) -> int:
        statement = select(func.count()).select_from(
            Interview.__table__.join(
                InterviewFeedback.__table__,
                InterviewFeedback.__table__.c.interview_id == Interview.__table__.c.interview_id,
            )
        ).where(Interview.__table__.c.application_id == application_id)
        return self.db.scalar(statement) or 0

    def _skill_match_score(
        self,
        matched_required: Sequence[str],
        required_skills: Sequence[str],
        matched_optional: Sequence[str],
        optional_skills: Sequence[str],
    ) -> int:
        required_score = 100.0 if not required_skills else (len(matched_required) / len(required_skills)) * 100
        optional_score = 100.0 if not optional_skills else (len(matched_optional) / len(optional_skills)) * 100
        return int(round(required_score * 0.7 + optional_score * 0.3))

    def _education_score(self, education: Sequence[str], job_description: str | None) -> int:
        text = (job_description or "").casefold()
        if not education:
            return 35 if text else 25
        if any(token in text for token in ("master", "msc", "phd", "doctor")):
            return 90 if any(term.casefold() in {"master", "msc", "phd", "doctorate"} for term in education) else 70
        if any(token in text for token in ("bachelor", "bs", "ba", "degree")):
            return 85 if education else 65
        return 75 if education else 30

    def _experience_score(self, years: float, experience_level: str | None) -> int:
        level = (experience_level or "").casefold()
        target = 2.0
        if "senior" in level:
            target = 6.0
        elif "lead" in level:
            target = 8.0
        elif "mid" in level:
            target = 4.0
        elif "junior" in level or "entry" in level:
            target = 1.5
        if target <= 0:
            return 60 if years else 30
        return int(round(max(20.0, min(100.0, (years / target) * 100 if years else 25.0))))

    def _certificate_score(self, certificates: Sequence[str], required_skills: Sequence[str]) -> int:
        if not certificates:
            return 30 if required_skills else 45
        lowered = [certificate.casefold() for certificate in certificates]
        matched = 0
        for skill in required_skills:
            if any(skill.casefold() in certificate for certificate in lowered):
                matched += 1
        base = 60 + min(30, len(certificates) * 8)
        if matched:
            base += min(15, matched * 5)
        return int(min(100, base))

    def _score_missing_skills(
        self,
        required_count: int,
        optional_count: int,
        missing_required_count: int,
        missing_optional_count: int,
    ) -> int:
        if required_count + optional_count == 0:
            return 80
        required_penalty = (missing_required_count / max(1, required_count)) * 80
        optional_penalty = (missing_optional_count / max(1, optional_count or 1)) * 20
        return int(round(max(0.0, 100.0 - required_penalty - optional_penalty)))

    def _score_languages(self, languages: Sequence[str], job_language_hints: Sequence[str]) -> int:
        if not languages:
            return 40 if job_language_hints else 55
        score = 65 + min(25, len(languages) * 8)
        if job_language_hints and any(
            hint.casefold() in " ".join(languages).casefold() for hint in job_language_hints
        ):
            score += 10
        return int(min(100, score))

    def _score_interview_readiness(self, row: dict[str, Any]) -> int:
        score = 20
        if row["ai_match_score"] > 0:
            score += 25
        if row["status"] and str(row["status"]).casefold() in {"shortlisted", "interview", "interview_scheduled", "interviewed"}:
            score += 20
        if row["interview_count"]:
            score += 15
        if row["interview_feedback_count"]:
            score += 10
        if not row["missing_required_count"]:
            score += 10
        return int(min(100, score))

    def _score_recruiter_rating(self, recruiter_rating: float | None) -> float:
        if recruiter_rating is None:
            return 0.0
        if recruiter_rating <= 10:
            return round(min(100.0, recruiter_rating * 10), 1)
        return round(min(100.0, recruiter_rating), 1)

    def _confidence_score(
        self,
        row: dict[str, Any],
        *,
        base_score: float,
        missing_skill_score: int,
        language_score: int,
        interview_readiness: int,
        recruiter_rating_score: float,
    ) -> int:
        evidence = 0
        evidence += 10 if row["detected_skills"] else 0
        evidence += 10 if row["education"] else 0
        evidence += 10 if row["certificates"] else 0
        evidence += 10 if row["experience_years"] > 0 else 0
        evidence += 10 if row["languages"] else 0
        evidence += 10 if row["ai_match_score"] > 0 else 0
        evidence += 10 if row["interview_feedback_count"] else 0
        score = (
            evidence
            + base_score * 0.20
            + missing_skill_score * 0.10
            + language_score * 0.05
            + interview_readiness * 0.10
            + recruiter_rating_score * 0.05
        )
        return int(round(max(35.0, min(100.0, score))))

    def _ranking_explanation(
        self,
        row: dict[str, Any],
        *,
        overall_score: int,
        base_score: float,
        missing_skill_score: int,
        language_score: int,
        interview_readiness: int,
        recruiter_rating_score: float,
    ) -> str:
        strengths = row["matched_skills"][:3] or row["detected_skills"][:3]
        weaknesses = row["missing_skills"][:3]
        strengths_text = ", ".join(strengths) if strengths else "broad experience signals"
        weakness_text = ", ".join(weaknesses) if weaknesses else "no major gaps detected"
        return (
            f"Base AI score {base_score:.1f} with {row['detected_skill_score']} skill coverage, "
            f"language support {language_score}, interview readiness {interview_readiness}, and recruiter signal {recruiter_rating_score:.1f}. "
            f"Strengths: {strengths_text}. Weaknesses: {weakness_text}. Final score: {overall_score}."
        )

    def _build_strengths_and_weaknesses(
        self,
        row: dict[str, Any],
        base_score: float,
        missing_skill_score: int,
        language_score: int,
        interview_readiness: int,
        recruiter_rating_score: float,
    ) -> tuple[list[str], list[str]]:
        strengths = []
        weaknesses = []
        if row["ai_match_score"] >= 80:
            strengths.append("Strong AI resume match")
        elif row["ai_match_score"] >= 60:
            strengths.append("Solid AI resume match")
        if row["matched_skills"]:
            strengths.append(f"Detected skills: {', '.join(row['matched_skills'][:3])}")
        if row["experience_years"] >= 5:
            strengths.append("Senior-level experience")
        elif row["experience_years"] >= 2:
            strengths.append("Relevant hands-on experience")
        if row["education"]:
            strengths.append("Education profile available")
        if row["certificates"]:
            strengths.append("Verified certificates present")
        if row["languages"]:
            strengths.append("Language profile available")
        if interview_readiness >= 75:
            strengths.append("Interview-ready profile")
        if recruiter_rating_score >= 70:
            strengths.append("Positive recruiter feedback")
        if row["missing_skills"]:
            weaknesses.append(f"Missing skills: {', '.join(row['missing_skills'][:3])}")
        if row["experience_years"] == 0:
            weaknesses.append("No verified work experience detected")
        if not row["certificates"]:
            weaknesses.append("No certificates detected")
        if not row["languages"]:
            weaknesses.append("No language evidence detected")
        if recruiter_rating_score and recruiter_rating_score < 60:
            weaknesses.append("Recruiter feedback below target")
        if not weaknesses:
            weaknesses.append("No notable weaknesses detected")
        return self._dedupe_text(strengths)[:5], self._dedupe_text(weaknesses)[:5]

    def _risk_level(self, overall_score: int, missing_required_count: int, interview_readiness: int) -> RankingRiskLevel:
        if overall_score >= 80 and missing_required_count == 0 and interview_readiness >= 70:
            return "Low"
        if overall_score >= 65 and missing_required_count <= 1:
            return "Medium"
        if overall_score >= 50:
            return "High"
        return "Critical"

    def _hiring_recommendation(
        self,
        overall_score: int,
        risk_level: RankingRiskLevel,
        interview_readiness: int,
    ) -> HiringRecommendation:
        if overall_score >= 85 and risk_level == "Low":
            return "Hire"
        if overall_score >= 70 and interview_readiness >= 65:
            return "Interview"
        if overall_score >= 60:
            return "Manual Review"
        if overall_score >= 45:
            return "Hold"
        return "Reject"

    def _best_by_experience(
        self,
        ranking: list[CandidateRankingItem],
        *,
        minimum: float | None = None,
        maximum: float | None = None,
    ) -> CandidateRankingItem | None:
        candidates = [
            item
            for item in ranking
            if (minimum is None or item.experience_years >= minimum)
            and (maximum is None or item.experience_years < maximum)
        ]
        return candidates[0] if candidates else (ranking[0] if ranking else None)

    def _extract_language_hints(self, text: str) -> list[str]:
        lowered = text.casefold()
        hints = []
        for hint in ("english", "spanish", "french", "german", "arabic", "polish"):
            if hint in lowered:
                hints.append(hint.title())
        return hints

    def _normalize_score(self, value: float) -> float:
        if value <= 10:
            return max(0.0, min(100.0, value * 10))
        return max(0.0, min(100.0, value))

    def _contains_skill(self, skills: Sequence[str], skill_name: str) -> bool:
        target = skill_name.casefold()
        return any(target == skill.casefold() or target in skill.casefold() for skill in skills)

    def _dedupe_case_insensitive(self, values: Sequence[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for value in values:
            if not value:
                continue
            key = value.casefold()
            if key in seen:
                continue
            seen.add(key)
            result.append(value)
        return result

    def _dedupe_text(self, values: Sequence[str]) -> list[str]:
        return self._dedupe_case_insensitive([str(value).strip() for value in values if str(value).strip()])

    def _build_response_with_comparison(
        self,
        job: dict[str, Any],
        ranked: list[dict[str, Any]],
        *,
        limit: int | None = None,
        comparison_ids: Sequence[uuid.UUID] | None = None,
    ) -> CandidateRankingResponse:
        response = self._build_response(job, ranked, limit=limit, comparison_ids=comparison_ids)
        return response
