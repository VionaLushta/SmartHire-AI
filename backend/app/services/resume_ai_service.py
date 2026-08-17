from __future__ import annotations

import re
from datetime import date

import pymupdf
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ml.candidate_ranker import CandidateRanker
from app.ml.job_matcher import JobMatcher
from app.ml.recommendation_engine import RecommendationEngine
from app.ml.skill_extractor import SkillExtractor
from app.models.application import AIAnalysis, Application
from app.models.certificate import Certificate
from app.models.company import Company
from app.models.job import Job, JobSkill
from app.models.resume import Education, WorkExperience
from app.models.resume_skill import ResumeSkill
from app.models.skill import Skill
from app.models.user import User
from app.repositories.job_dashboard_repository import JobDashboardRepository
from app.repositories.job_repository import JobRepository
from app.schemas.ai_resume import (
    CandidateRankingRequest,
    CandidateRankingResponse,
    JobMatchResponse,
    ParsedResumeResponse,
    RecommendationResponse,
    SkillExtractionResponse,
)
from app.schemas.auth import CurrentUserResponse

MAX_RESUME_SIZE = 10 * 1024 * 1024


class ResumeAIService:
    def __init__(self, db: Session | None = None) -> None:
        self.db = db
        self.skill_extractor = SkillExtractor()
        self.job_matcher = JobMatcher()
        self.recommendation_engine = RecommendationEngine()
        self.candidate_ranker = CandidateRanker()
        self.job_repo = JobRepository(db) if db is not None else None

    def _validate_pdf(self, file: UploadFile, content: bytes) -> None:
        if file.content_type != "application/pdf":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="PDF files only.",
            )
        if len(content) > MAX_RESUME_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File too large.",
            )
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid PDF file."
            )

    def _detect_language(self, text: str) -> str:
        sample = text.lower()
        if not sample.strip():
            return "Unknown"
        english_markers = (
            " the ",
            " and ",
            " experience ",
            " skills ",
            " education ",
            " work ",
        )
        spanish_markers = (
            " el ",
            " la ",
            " y ",
            " experiencia ",
            " habilidades ",
            " educación ",
        )
        if any(marker in sample for marker in spanish_markers):
            return "Spanish"
        if any(marker in sample for marker in english_markers):
            return "English"
        ascii_letters = sum(1 for char in sample if char.isascii() and char.isalpha())
        total_letters = sum(1 for char in sample if char.isalpha())
        if total_letters and ascii_letters / total_letters >= 0.9:
            return "English"
        return "Unknown"

    def parse_resume(self, file: UploadFile) -> ParsedResumeResponse:
        content = file.file.read()
        self._validate_pdf(file, content)

        try:
            with pymupdf.open(stream=content, filetype="pdf") as doc:
                page_count = doc.page_count
                text = "\n".join(page.get_text("text") for page in doc).strip()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid PDF file."
            )

        if page_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Empty PDF file."
            )
        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Empty PDF file."
            )

        return ParsedResumeResponse(
            pages=page_count,
            language=self._detect_language(text),
            text=text,
            characters=len(text),
        )

    def extract_skills(self, text: str) -> SkillExtractionResponse:
        try:
            result = self.skill_extractor.extract(text)
        except ValueError as exc:
            message = str(exc)
            status_code = status.HTTP_400_BAD_REQUEST
            if "large" in message.lower():
                status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            raise HTTPException(status_code=status_code, detail=message)
        return SkillExtractionResponse(**result)

    def job_match(self, file: UploadFile, job_id: int) -> JobMatchResponse:
        if self.job_repo is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database unavailable.",
            )

        job = self.job_repo.get_by_id(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )

        parsed = self.parse_resume(file)
        _, result = self._match_resume_text(parsed.text, job, job_id)
        return JobMatchResponse(**result)

    def recommendations(self, file: UploadFile, job_id: int) -> RecommendationResponse:
        if self.job_repo is None or self.db is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database unavailable.",
            )
        job = self.job_repo.get_by_id(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )

        parsed = self.parse_resume(file)
        candidate, match_result = self._match_resume_text(parsed.text, job, job_id)
        result = self.recommendation_engine.generate(
            match_result,
            candidate_skills=candidate["candidate_skills"],
            education=candidate["education"],
            experience=candidate["experience"],
            certifications=candidate["certifications"],
            languages=candidate["languages"],
            required_skills=candidate["required_skills"],
            preferred_skills=candidate["preferred_skills"],
            job_title=job["title"],
            job_description=job.get("description") or "",
        )
        result["similar_jobs"] = self.recommendation_engine.rank_similar_jobs(
            candidate["candidate_skills"],
            candidate["education"],
            candidate["experience"],
            {
                "location": job.get("location"),
                "industry": self._company_industry(job["company_id"]),
                "employment_type": job.get("employment_type"),
            },
            self._similar_job_data(job_id),
        )
        return RecommendationResponse(**result)

    def _match_resume_text(
        self, text: str, job: dict, job_id: int
    ) -> tuple[dict, dict]:
        skills = self.extract_skills(text).skills
        if not skills:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Missing skills."
            )
        required_skills = [
            row["name"]
            for row in JobDashboardRepository(self.db).get_required_skills(job_id)
        ]
        if not required_skills:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No AI match available because the job has no required skills.",
            )
        preferred_skills = (
            self.extract_skills(job["description"]).skills[:8]
            if job.get("description")
            else []
        )
        education, experience, certifications = self._infer_profile_features(text)
        candidate = {
            "candidate_skills": skills,
            "skills": skills,
            "education": education,
            "experience": experience,
            "certifications": certifications,
            "languages": self.recommendation_engine.detect_languages(text),
            "required_skills": required_skills,
            "preferred_skills": preferred_skills,
        }
        match_result = self.job_matcher.compare(
            candidate,
            {
                "required_skills": required_skills,
                "preferred_skills": preferred_skills,
                "experience_level": job.get("experience_level") or "",
                "education": job.get("description") or "",
            },
        )
        return candidate, match_result

    def _similar_job_data(self, excluded_job_id: int) -> list[dict]:
        statement = (
            select(
                Job.__table__.c.job_id,
                Job.__table__.c.title,
                Job.__table__.c.description,
                Job.__table__.c.experience_level,
                Job.__table__.c.location,
                Job.__table__.c.employment_type,
                Company.__table__.c.industry,
                Skill.__table__.c.name,
            )
            .select_from(
                Job.__table__.join(
                    Company.__table__,
                    Company.__table__.c.company_id == Job.__table__.c.company_id,
                )
                .outerjoin(
                    JobSkill.__table__,
                    JobSkill.__table__.c.job_id == Job.__table__.c.job_id,
                )
                .outerjoin(
                    Skill.__table__,
                    Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id,
                )
            )
            .where(Job.__table__.c.job_id != excluded_job_id)
            .order_by(Job.__table__.c.job_id)
        )
        jobs: dict[int, dict] = {}
        for row in self.db.execute(statement).mappings():
            job = jobs.setdefault(
                row["job_id"],
                {
                    "job_id": row["job_id"],
                    "title": row["title"],
                    "description": row["description"],
                    "experience_level": row["experience_level"],
                    "location": row["location"],
                    "industry": row["industry"],
                    "employment_type": row["employment_type"],
                    "required_skills": [],
                },
            )
            if row["name"]:
                job["required_skills"].append(row["name"])
        return list(jobs.values())

    def _company_industry(self, company_id: int) -> str | None:
        statement = select(Company.__table__.c.industry).where(
            Company.__table__.c.company_id == company_id
        )
        return self.db.scalar(statement)

    def rank_candidates(
        self,
        payload: CandidateRankingRequest,
        current_user: CurrentUserResponse,
    ) -> CandidateRankingResponse:
        if self.job_repo is None or self.db is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database unavailable.",
            )
        job = self.job_repo.get_by_id(payload.job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found."
            )
        if (
            current_user.role_name != "Admin"
            and self.job_repo.get_company_for_user(
                job["company_id"], current_user.user_id
            )
            is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden."
            )

        applications = self._get_rankable_applications(payload.job_id)
        if not applications:
            if self._application_count(payload.job_id) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No candidates applied for this job.",
                )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No completed AI analysis found for this job's candidates.",
            )

        candidates = [
            self._build_ranking_candidate(application, payload.job_id)
            for application in applications
        ]
        ranking = self.candidate_ranker.rank(
            candidates,
            min_ai_score=payload.min_ai_score,
            min_experience=payload.min_experience,
            required_certification=payload.required_certification,
            required_degree=payload.required_degree,
            sort_by=payload.sort_by,
        )
        return CandidateRankingResponse(
            job_id=payload.job_id,
            total_candidates=len(ranking),
            ranking=ranking,
        )

    def _get_rankable_applications(self, job_id: int) -> list[dict]:
        statement = (
            select(
                Application.__table__.c.user_id,
                Application.__table__.c.resume_id,
                Application.__table__.c.created_at.label("application_date"),
                User.__table__.c.first_name,
                User.__table__.c.last_name,
                AIAnalysis.__table__.c.overall_score,
                AIAnalysis.__table__.c.skills_score,
                AIAnalysis.__table__.c.experience_score,
                AIAnalysis.__table__.c.education_score,
                AIAnalysis.__table__.c.certificate_score,
            )
            .select_from(
                Application.__table__.join(
                    User.__table__,
                    User.__table__.c.user_id == Application.__table__.c.user_id,
                ).join(
                    AIAnalysis.__table__,
                    AIAnalysis.__table__.c.application_id
                    == Application.__table__.c.application_id,
                )
            )
            .where(
                Application.__table__.c.job_id == job_id,
                AIAnalysis.__table__.c.overall_score.is_not(None),
            )
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _application_count(self, job_id: int) -> int:
        statement = (
            select(func.count())
            .select_from(Application.__table__)
            .where(Application.__table__.c.job_id == job_id)
        )
        return self.db.scalar(statement) or 0

    def _build_ranking_candidate(self, application: dict, job_id: int) -> dict:
        user_id = application["user_id"]
        resume_id = application["resume_id"]
        candidate_skills = self._resume_skills(resume_id)
        required_skills = self._job_skills(job_id)
        matched_skills = len(
            {skill.casefold() for skill in candidate_skills}
            & {skill.casefold() for skill in required_skills}
        )
        degrees = self._degrees(resume_id)
        experience_years = self._experience_years(resume_id)
        certifications = self._certifications(user_id)
        return {
            "candidate_id": str(user_id),
            "candidate_name": f"{application['first_name']} {application['last_name']}".strip(),
            "application_date": application["application_date"],
            "overall_ai_match": application["overall_score"],
            "required_skill_match": application["skills_score"],
            "experience_match": application["experience_score"],
            "education_match": application["education_score"],
            "certification_match": application["certificate_score"],
            "matched_skills": matched_skills,
            "missing_skills": max(0, len(required_skills) - matched_skills),
            "experience_years": experience_years,
            "degrees": degrees,
            "certifications": certifications,
        }

    def _resume_skills(self, resume_id: int | None) -> list[str]:
        if resume_id is None:
            return []
        statement = (
            select(Skill.__table__.c.name)
            .select_from(
                ResumeSkill.__table__.join(
                    Skill.__table__,
                    Skill.__table__.c.skill_id == ResumeSkill.__table__.c.skill_id,
                )
            )
            .where(ResumeSkill.__table__.c.resume_id == resume_id)
        )
        return list(self.db.scalars(statement))

    def _job_skills(self, job_id: int) -> list[str]:
        statement = (
            select(Skill.__table__.c.name)
            .select_from(
                JobSkill.__table__.join(
                    Skill.__table__,
                    Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id,
                )
            )
            .where(JobSkill.__table__.c.job_id == job_id)
        )
        return list(self.db.scalars(statement))

    def _degrees(self, resume_id: int | None) -> list[str]:
        if resume_id is None:
            return []
        return list(
            self.db.scalars(
                select(Education.__table__.c.degree).where(
                    Education.__table__.c.resume_id == resume_id,
                    Education.__table__.c.degree.is_not(None),
                )
            )
        )

    def _experience_years(self, resume_id: int | None) -> float:
        if resume_id is None:
            return 0
        statement = select(
            WorkExperience.__table__.c.start_date, WorkExperience.__table__.c.end_date
        ).where(WorkExperience.__table__.c.resume_id == resume_id)
        total_days = 0
        for start_date, end_date in self.db.execute(statement):
            if start_date:
                total_days += max(0, ((end_date or date.today()) - start_date).days)
        return round(total_days / 365.25, 2)

    def _certifications(self, user_id: object) -> list[str]:
        statement = select(Certificate.__table__.c.title).where(
            Certificate.__table__.c.user_id == user_id
        )
        return list(self.db.scalars(statement))

    @staticmethod
    def _infer_profile_features(text: str) -> tuple[list[str], list[str], list[str]]:
        lowered = text.lower()
        education: list[str] = []
        experience: list[str] = []
        certifications: list[str] = []

        degree_markers = {
            "phd": "PhD",
            "doctor": "Doctorate",
            "master": "Master",
            "msc": "Master",
            "bachelor": "Bachelor",
            "bsc": "Bachelor",
            "associate": "Associate",
            "diploma": "Diploma",
        }
        for marker, label in degree_markers.items():
            if marker in lowered:
                education.append(label)

        experience_markers = [
            "years of experience",
            "year experience",
            "experience in",
            "worked as",
            "responsible for",
        ]
        if any(marker in lowered for marker in experience_markers):
            experience.append("Professional Experience")
        year_match = re.search(r"(\d+)\+?\s+years?", lowered)
        if year_match:
            experience.append(f"{year_match.group(1)} Years")

        cert_markers = [
            "certified",
            "certification",
            "certificate",
            "cissp",
            "aws certified",
            "microsoft certified",
        ]
        for marker in cert_markers:
            if marker in lowered:
                certifications.append(marker.title())

        return education, experience, certifications
