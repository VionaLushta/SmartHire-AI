from __future__ import annotations

import json
import logging
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from typing import Any, Iterable, Mapping, Sequence
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.validation import clean_optional_text, clean_text
from app.ml.skill_extractor import SkillExtractor
from app.models.certificate import Certificate, CertificateSkill
from app.models.resume import Education, Language, Project, Resume, UserLanguage, WorkExperience
from app.models.resume_skill import ResumeSkill
from app.models.skill import Skill
from app.models.user import User
from app.repositories.candidate_dashboard_repository import CandidateDashboardRepository
from app.repositories.resume_repository import ResumeRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.resume_advisor import (
    ExportFormat,
    ResumeAdvisorExportResponse,
    ResumeAdvisorQualityCheck,
    ResumeAdvisorReport,
    ResumeAdvisorRoadmapItem,
)
from app.templates.pdf_letter import (
    build_body_paragraphs,
    build_bullet_list,
    build_key_value_table,
    build_letter_styles,
    build_separator,
)

logger = logging.getLogger("smarthire.performance")


class ResumeAdvisorError(RuntimeError):
    pass


class ResumeAdvisorValidationError(ResumeAdvisorError):
    pass


class ResumeAdvisorPersistenceError(ResumeAdvisorError):
    pass


@dataclass(frozen=True)
class _ResumeAdvisorContext:
    candidate_id: UUID
    candidate_name: str
    resume_id: int
    resume_text: str
    source_resume_file: str | None
    education: list[str]
    projects: list[dict[str, Any]]
    experiences: list[dict[str, Any]]
    certificates: list[str]
    certificate_skills: list[str]
    languages: list[str]
    detected_skills: list[str]
    profile_skills: list[str]
    years_of_experience: float
    target_context: str
    user: dict[str, Any]


class ResumeAdvisorService:
    def __init__(self, db: Session, *, report_root: str | Path | None = None) -> None:
        self.db = db
        self.settings = get_settings()
        self.dashboard_repo = CandidateDashboardRepository(db)
        self.resume_repo = ResumeRepository(db)
        self.skill_extractor = SkillExtractor()
        self.styles = build_letter_styles()
        self.report_root = self._resolve_report_root(report_root)
        self.advisor_root = self.report_root / "resume_advisor"
        self.snapshot_root = self.advisor_root / "snapshots"
        self.export_root = self.advisor_root / "exports"
        self.snapshot_root.mkdir(parents=True, exist_ok=True)
        self.export_root.mkdir(parents=True, exist_ok=True)

    def generate_report(self, current_user: CurrentUserResponse) -> ResumeAdvisorReport:
        self._assert_candidate_access(current_user)
        return self._build_and_persist_report(current_user.user_id)

    def regenerate_report(self, current_user: CurrentUserResponse) -> ResumeAdvisorReport:
        self._assert_candidate_access(current_user)
        return self._build_and_persist_report(current_user.user_id, regenerate=True)

    def generate_report_for_user(self, user_id: UUID) -> ResumeAdvisorReport:
        return self._build_and_persist_report(user_id)

    def export_report(
        self,
        current_user: CurrentUserResponse,
        *,
        report_format: ExportFormat = "json",
    ) -> ResumeAdvisorExportResponse:
        self._assert_candidate_access(current_user)
        report = self._build_and_persist_report(current_user.user_id)
        started = perf_counter()
        export_path = (
            self._export_json(report)
            if report_format == "json"
            else self._export_pdf(report)
        )
        logger.info(
            "resume advisor exported format=%s candidate_id=%s duration_ms=%.1f",
            report_format,
            current_user.user_id,
            (perf_counter() - started) * 1000,
        )
        return ResumeAdvisorExportResponse(
            format=report_format,
            file_path=str(export_path),
            generated_at=datetime.now(timezone.utc),
        )

    def _build_and_persist_report(
        self, user_id: UUID, *, regenerate: bool = False
    ) -> ResumeAdvisorReport:
        started = perf_counter()
        context = self._load_context(user_id)
        report = self._build_report(context)
        self._persist_snapshot(report, regenerate=regenerate)
        logger.info(
            "resume advisor report generated candidate_id=%s resume_id=%s score=%s duration_ms=%.1f",
            report.candidate_id,
            report.resume_id,
            report.resume_score,
            (perf_counter() - started) * 1000,
        )
        return report

    def _build_report(self, context: _ResumeAdvisorContext) -> ResumeAdvisorReport:
        summary_skills = context.detected_skills[:5] or ["practical experience"]
        strengths = self._build_strengths(context)
        weaknesses = self._build_weaknesses(context)
        relevant_pool = self._relevant_skill_pool(context.target_context)
        missing_skills = [
            skill
            for skill in relevant_pool
            if skill.casefold() not in {value.casefold() for value in context.profile_skills}
        ]
        suggested_skills = self._dedupe(
            [skill for skill in missing_skills[:8] if skill not in context.detected_skills]
        )
        suggested_technologies = self._suggest_technologies(context, suggested_skills)
        suggested_certificates = self._suggest_certificates(suggested_skills, context.target_context)
        suggested_projects = self._suggest_projects(context, suggested_skills)
        career_advice = self._career_advice(context, suggested_skills)
        roadmap = self._build_roadmap(suggested_skills, context.target_context)
        quality_check = self._quality_check(context)
        resume_score = quality_check.overall_quality_score
        cv_summary = self._summary_text(context, summary_skills, suggested_skills, resume_score)

        return ResumeAdvisorReport(
            report_id=uuid4(),
            candidate_id=context.candidate_id,
            candidate_name=context.candidate_name,
            resume_id=context.resume_id,
            source_resume_file=context.source_resume_file,
            generated_at=datetime.now(timezone.utc),
            resume_score=resume_score,
            cv_summary=cv_summary,
            strengths=strengths,
            weaknesses=weaknesses,
            missing_skills=self._dedupe(missing_skills)[:10],
            suggested_skills=suggested_skills[:10],
            suggested_certificates=suggested_certificates[:8],
            suggested_technologies=suggested_technologies[:8],
            suggested_projects=suggested_projects[:6],
            career_advice=career_advice[:6],
            learning_roadmap=roadmap,
            quality_check=quality_check,
            detected_skills=context.detected_skills,
            education=context.education,
            certificates=context.certificates,
            languages=context.languages,
            years_of_experience=round(context.years_of_experience, 2),
        )

    def _load_context(self, user_id: UUID) -> _ResumeAdvisorContext:
        user = self.dashboard_repo.get_user(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

        resume = self.dashboard_repo.latest_resume(user_id)
        if resume is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No resume available for this candidate.",
            )

        resume_text = self._resume_text(resume)
        if not resume_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume text could not be extracted.",
            )

        education = self._education(resume["resume_id"])
        projects = self._projects(resume["resume_id"])
        experiences = self._experiences(resume["resume_id"])
        certificates = self._certificates(user_id)
        certificate_skills = self._certificate_skills(user_id)
        languages = self._languages(user_id)
        detected_skills = self._detected_skills(resume, resume_text, certificates, certificate_skills)
        profile_skills = self._dedupe([*detected_skills, *certificate_skills])
        target_context = self._infer_target_context(resume_text, detected_skills, education, projects)

        return _ResumeAdvisorContext(
            candidate_id=user_id,
            candidate_name=self._candidate_name(user),
            resume_id=resume["resume_id"],
            resume_text=resume_text,
            source_resume_file=resume.get("file_path"),
            education=education,
            projects=projects,
            experiences=experiences,
            certificates=certificates,
            certificate_skills=certificate_skills,
            languages=languages,
            detected_skills=detected_skills,
            profile_skills=profile_skills,
            years_of_experience=self._experience_years(experiences),
            target_context=target_context,
            user=user,
        )

    def _resume_text(self, resume: Mapping[str, Any]) -> str:
        parsed_text = str(resume.get("parsed_text") or "").strip()
        if parsed_text:
            return parsed_text
        file_path = str(resume.get("file_path") or "").strip()
        if not file_path:
            return ""
        try:
            from app.services.ocr_pdf_parser import extract_document_text

            return extract_document_text(file_path)
        except Exception:
            return ""

    def _detected_skills(
        self,
        resume: Mapping[str, Any],
        resume_text: str,
        certificates: Sequence[str],
        certificate_skills: Sequence[str],
    ) -> list[str]:
        extracted: list[str] = []
        try:
            extracted = list(self.skill_extractor.extract(resume_text)["skills"])
        except ValueError:
            extracted = []

        resume_skill_rows = self.db.execute(
            select(Skill.__table__.c.name)
            .select_from(
                ResumeSkill.__table__.join(
                    Skill.__table__,
                    Skill.__table__.c.skill_id == ResumeSkill.__table__.c.skill_id,
                )
            )
            .where(ResumeSkill.__table__.c.resume_id == resume["resume_id"])
        ).scalars()
        resume_skill_names = list(resume_skill_rows)

        profile_skills = self._dedupe([*extracted, *resume_skill_names, *certificate_skills])
        if certificates and "GitHub" not in profile_skills and (
            self._has_portfolio_signal(resume_text)
            or self._has_github_signal(resume_text)
        ):
            profile_skills.append("GitHub")
        return self._dedupe(profile_skills)

    def _education(self, resume_id: int) -> list[str]:
        statement = select(
            Education.__table__.c.degree,
            Education.__table__.c.field_of_study,
            Education.__table__.c.institution,
        ).where(Education.__table__.c.resume_id == resume_id)
        rows = []
        for degree, field_of_study, institution in self.db.execute(statement):
            parts = [part for part in [degree, field_of_study, institution] if part]
            if parts:
                rows.append(" - ".join(parts))
        return self._dedupe(rows)

    def _projects(self, resume_id: int) -> list[dict[str, Any]]:
        statement = select(
            Project.__table__.c.name,
            Project.__table__.c.description,
            Project.__table__.c.url,
        ).where(Project.__table__.c.resume_id == resume_id)
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _experiences(self, resume_id: int) -> list[dict[str, Any]]:
        statement = select(
            WorkExperience.__table__.c.company_name,
            WorkExperience.__table__.c.title,
            WorkExperience.__table__.c.start_date,
            WorkExperience.__table__.c.end_date,
            WorkExperience.__table__.c.description,
        ).where(WorkExperience.__table__.c.resume_id == resume_id)
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _certificates(self, user_id: UUID) -> list[str]:
        statement = select(Certificate.__table__.c.title).where(Certificate.__table__.c.user_id == user_id)
        return self._dedupe(list(self.db.scalars(statement)))

    def _certificate_skills(self, user_id: UUID) -> list[str]:
        statement = (
            select(Skill.__table__.c.name)
            .select_from(
                Certificate.__table__
                .join(CertificateSkill.__table__, CertificateSkill.__table__.c.certificate_id == Certificate.__table__.c.cert_id)
                .join(Skill.__table__, Skill.__table__.c.skill_id == CertificateSkill.__table__.c.skill_id)
            )
            .where(Certificate.__table__.c.user_id == user_id)
        )
        return self._dedupe(list(self.db.scalars(statement)))

    def _languages(self, user_id: UUID) -> list[str]:
        statement = (
            select(
                UserLanguage.__table__.c.proficiency,
                Language.__table__.c.name.label("language_name"),
            )
            .select_from(
                UserLanguage.__table__
                .join(
                    Language.__table__,
                    Language.__table__.c.language_id == UserLanguage.__table__.c.language_id,
                )
            )
            .where(UserLanguage.__table__.c.user_id == user_id)
        )
        values = []
        for proficiency, language_name in self.db.execute(statement):
            label = f"{language_name} ({proficiency})" if proficiency else str(language_name)
            values.append(label)
        return self._dedupe(values)

    def _experience_years(self, experiences: Sequence[Mapping[str, Any]]) -> float:
        total_days = 0
        for experience in experiences:
            start_date = experience.get("start_date")
            end_date = experience.get("end_date") or datetime.now(timezone.utc).date()
            if start_date:
                total_days += max(0, (end_date - start_date).days)
        return total_days / 365.25 if total_days else 0.0

    def _infer_target_context(
        self,
        resume_text: str,
        detected_skills: Sequence[str],
        education: Sequence[str],
        projects: Sequence[Mapping[str, Any]],
    ) -> str:
        lowered = f"{resume_text} {' '.join(detected_skills)} {' '.join(education)} {' '.join(str(project.get('name') or '') for project in projects)}".casefold()
        if any(term in lowered for term in ("frontend", "ui", "react", "css", "javascript", "typescript")):
            return "frontend"
        if any(term in lowered for term in ("data", "analysis", "analytics", "power bi", "excel", "bi")):
            return "data"
        if any(term in lowered for term in ("cloud", "aws", "azure", "gcp", "devops", "docker", "kubernetes")):
            return "cloud"
        if any(term in lowered for term in ("backend", "api", "fastapi", "django", "flask", "postgresql", "sql")):
            return "backend"
        return "general"

    def _relevant_skill_pool(self, context: str) -> list[str]:
        catalog = self.skill_extractor.catalog.categories()
        if context == "frontend":
            categories = ("Programming Languages", "Frameworks", "Soft Skills", "Office Tools")
        elif context == "data":
            categories = ("Programming Languages", "Databases", "AI / Data Science", "Soft Skills", "Office Tools")
        elif context == "cloud":
            categories = ("Programming Languages", "Cloud", "DevOps", "Networking", "Soft Skills")
        elif context == "backend":
            categories = ("Programming Languages", "Frameworks", "Databases", "Cloud", "DevOps", "Soft Skills")
        else:
            categories = ("Programming Languages", "Soft Skills", "Office Tools")
        pool: list[str] = []
        for category in categories:
            pool.extend(list(catalog.get(category, ())))
        return self._dedupe(pool)

    def _build_strengths(self, context: _ResumeAdvisorContext) -> list[str]:
        strengths: list[str] = []
        primary_skills = context.detected_skills[:3]
        if primary_skills:
            strengths.append(f"Strong signal in {', '.join(primary_skills)}")
        if context.projects:
            strengths.append(f"Project experience included ({len(context.projects)} project(s))")
        if context.education:
            strengths.append("Education section is present")
        if context.certificates:
            strengths.append("Certificates are listed")
        if context.languages:
            strengths.append("Language coverage is documented")
        if context.years_of_experience >= 2:
            strengths.append(f"Approximately {context.years_of_experience:.1f} years of experience")
        if self._has_github_signal(context.resume_text) or self._has_portfolio_signal(context.resume_text):
            strengths.append("Portfolio or GitHub evidence detected")
        if context.user.get("github_url") or context.user.get("portfolio_url"):
            strengths.append("Public portfolio links are present")
        if "Communication" in context.detected_skills:
            strengths.append("Communication skills are visible")
        return self._dedupe(strengths)[:6] or ["The resume contains enough signal to improve further."]

    def _build_weaknesses(self, context: _ResumeAdvisorContext) -> list[str]:
        weaknesses: list[str] = []
        relevant_pool = self._relevant_skill_pool(context.target_context)
        missing = [
            skill
            for skill in relevant_pool
            if skill.casefold() not in {value.casefold() for value in context.profile_skills}
        ]
        weaknesses.extend(f"Missing skill: {skill}" for skill in missing[:4])
        if not context.projects:
            weaknesses.append("No project examples detected")
        if not context.certificates:
            weaknesses.append("No certificates listed")
        if not context.languages:
            weaknesses.append("No language section detected")
        if not self._has_github_signal(context.resume_text) and not self._has_portfolio_signal(context.resume_text):
            weaknesses.append("No GitHub portfolio or portfolio link detected")
        if not context.user.get("github_url") and not context.user.get("portfolio_url"):
            weaknesses.append("Profile links for GitHub or portfolio are missing")
        if context.years_of_experience < 1:
            weaknesses.append("Work experience section is limited or missing")
        return self._dedupe(weaknesses)[:6] or ["No major weaknesses were detected from the current CV."]

    def _quality_check(self, context: _ResumeAdvisorContext) -> ResumeAdvisorQualityCheck:
        formatting = self._score_formatting(context.resume_text)
        readability = self._score_readability(context.resume_text)
        completeness = self._score_completeness(context)
        technical = self._score_technical_skills(context)
        soft = self._score_soft_skills(context)
        projects = self._score_projects(context)
        certificates = self._score_certificates(context)
        languages = self._score_languages(context)
        overall = round(
            (
                formatting * 0.15
                + readability * 0.10
                + completeness * 0.20
                + technical * 0.25
                + soft * 0.10
                + projects * 0.08
                + certificates * 0.06
                + languages * 0.06
            )
        )
        notes = [
            self._score_note("Formatting", formatting, "Use clearer headings and bullet points."),
            self._score_note("Readability", readability, "Shorter, outcome-focused bullets will help."),
            self._score_note("Completeness", completeness, "Add the missing resume sections."),
            self._score_note("Technical skills", technical, "Highlight in-demand technical skills more explicitly."),
            self._score_note("Soft skills", soft, "Add collaboration and communication proof."),
            self._score_note("Projects", projects, "Add more project depth and measurable outcomes."),
            self._score_note("Certificates", certificates, "Add relevant certificates or training evidence."),
            self._score_note("Languages", languages, "List additional languages or proficiency levels."),
        ]
        return ResumeAdvisorQualityCheck(
            formatting_score=formatting,
            readability_score=readability,
            completeness_score=completeness,
            technical_skills_score=technical,
            soft_skills_score=soft,
            projects_score=projects,
            certificates_score=certificates,
            languages_score=languages,
            overall_quality_score=overall,
            notes=notes,
        )

    def _score_formatting(self, text: str) -> int:
        if not text.strip():
            return 0
        lines = [line for line in text.splitlines() if line.strip()]
        bullets = sum(1 for line in lines if line.lstrip().startswith(("-", "*", "•")))
        sections = sum(
            1
            for token in ("experience", "education", "skills", "projects", "certificates", "languages")
            if token in text.casefold()
        )
        score = 45 + min(20, len(lines) * 2) + min(10, bullets * 4) + min(20, sections * 3)
        return int(min(100, score))

    def _score_readability(self, text: str) -> int:
        if not text.strip():
            return 0
        sentences = [segment for segment in re.split(r"[.!?]+", text) if segment.strip()]
        words = re.findall(r"\b\w+\b", text)
        avg_words = len(words) / max(1, len(sentences))
        score = 100 - max(0.0, avg_words - 22) * 2.2
        if len(words) < 150:
            score -= 8
        return int(max(35, min(100, round(score))))

    def _score_completeness(self, context: _ResumeAdvisorContext) -> int:
        indicators = [
            context.education,
            context.experiences,
            context.projects,
            context.certificates,
            context.languages,
            context.detected_skills,
        ]
        score = 20
        for item in indicators:
            if item:
                score += 12
        if self._has_github_signal(context.resume_text) or self._has_portfolio_signal(context.resume_text):
            score += 8
        return int(min(100, score))

    def _score_technical_skills(self, context: _ResumeAdvisorContext) -> int:
        technical_categories = {
            "Programming Languages",
            "Frameworks",
            "Databases",
            "Cloud",
            "DevOps",
            "AI / Data Science",
            "Networking",
            "Cybersecurity",
        }
        pool = [
            skill
            for category, skills in self.skill_extractor.catalog.categories().items()
            if category in technical_categories
            for skill in skills
        ]
        detected = {skill.casefold() for skill in context.detected_skills}
        matched = sum(1 for skill in pool if skill.casefold() in detected)
        return int(min(100, 30 + matched * 8))

    def _score_soft_skills(self, context: _ResumeAdvisorContext) -> int:
        soft_pool = self.skill_extractor.catalog.soft_skills
        detected = {skill.casefold() for skill in context.detected_skills}
        matched = sum(1 for skill in soft_pool if skill.casefold() in detected)
        return int(min(100, 25 + matched * 15))

    def _score_projects(self, context: _ResumeAdvisorContext) -> int:
        if not context.projects:
            return 25 if context.years_of_experience > 0 else 10
        score = 55 + len(context.projects) * 12
        if any(project.get("url") for project in context.projects):
            score += 8
        return int(min(100, score))

    def _score_certificates(self, context: _ResumeAdvisorContext) -> int:
        if not context.certificates:
            return 20
        score = 45 + len(context.certificates) * 15
        if context.certificate_skills:
            score += min(15, len(context.certificate_skills) * 5)
        return int(min(100, score))

    def _score_languages(self, context: _ResumeAdvisorContext) -> int:
        if not context.languages:
            return 25
        score = 40 + len(context.languages) * 15
        return int(min(100, score))

    def _suggest_technologies(
        self, context: _ResumeAdvisorContext, suggested_skills: Sequence[str]
    ) -> list[str]:
        technology_markers = {
            "Python",
            "Java",
            "C#",
            "C++",
            "JavaScript",
            "TypeScript",
            "SQL",
            "React",
            "Next.js",
            "Vue",
            "Angular",
            "FastAPI",
            "Django",
            "Flask",
            "PostgreSQL",
            "MySQL",
            "MongoDB",
            "Docker",
            "Kubernetes",
            "AWS",
            "Azure",
            "Google Cloud",
            "Power BI",
        }
        suggestions = [
            skill
            for skill in suggested_skills
            if skill in technology_markers or skill.casefold() in {marker.casefold() for marker in technology_markers}
        ]
        if not suggestions:
            if context.target_context == "backend":
                suggestions = ["FastAPI", "PostgreSQL", "Docker", "AWS"]
            elif context.target_context == "data":
                suggestions = ["SQL", "Power BI", "Pandas", "Excel"]
            elif context.target_context == "frontend":
                suggestions = ["React", "TypeScript", "CSS", "JavaScript"]
            elif context.target_context == "cloud":
                suggestions = ["Docker", "AWS", "Kubernetes", "CI/CD"]
            else:
                suggestions = ["GitHub", "Docker", "SQL"]
        return self._dedupe(suggestions)

    def _suggest_certificates(self, suggested_skills: Sequence[str], context_name: str) -> list[str]:
        mapping = {
            "Python": "Python Institute PCAP Certification",
            "FastAPI": "Python Web API Certification",
            "PostgreSQL": "PostgreSQL Associate Certification",
            "SQL": "Database Fundamentals Certification",
            "Docker": "Docker Certified Associate",
            "AWS": "AWS Certified Developer Associate",
            "Azure": "Microsoft Azure Fundamentals",
            "Google Cloud": "Google Cloud Associate Cloud Engineer",
            "Kubernetes": "Certified Kubernetes Administrator",
            "React": "Meta Front-End Developer Professional Certificate",
            "TypeScript": "Advanced JavaScript and TypeScript Certificate",
            "Power BI": "Microsoft Power BI Data Analyst Associate",
            "GitHub": "GitHub Foundations Certification",
        }
        suggestions = [mapping[skill] for skill in suggested_skills if skill in mapping]
        if not suggestions:
            if context_name == "data":
                suggestions = ["Microsoft Power BI Data Analyst Associate", "Database Fundamentals Certification"]
            elif context_name == "cloud":
                suggestions = ["AWS Certified Developer Associate", "Certified Kubernetes Administrator"]
            elif context_name == "frontend":
                suggestions = ["Meta Front-End Developer Professional Certificate"]
            else:
                suggestions = ["GitHub Foundations Certification", "Python Institute PCAP Certification"]
        return self._dedupe(suggestions)

    def _suggest_projects(
        self, context: _ResumeAdvisorContext, suggested_skills: Sequence[str]
    ) -> list[str]:
        if context.target_context == "backend":
            base = [
                "Build a Dockerized FastAPI resume API with JWT authentication.",
                "Create a PostgreSQL-backed job matching or career advisor project.",
                "Deploy a small backend service with logging and validation.",
            ]
        elif context.target_context == "data":
            base = [
                "Build a Power BI hiring analytics dashboard with SQL data sources.",
                "Create a Python data-cleaning and reporting pipeline.",
                "Publish a portfolio project that highlights dashboards and insights.",
            ]
        elif context.target_context == "frontend":
            base = [
                "Build a responsive React portfolio with project case studies.",
                "Create a dashboard UI with strong component structure and state management.",
                "Add a polished resume presentation page with downloadable assets.",
            ]
        elif context.target_context == "cloud":
            base = [
                "Containerize a FastAPI application and deploy it to AWS.",
                "Add CI/CD for a small service with Docker and GitHub Actions.",
                "Document an infrastructure diagram and deployment guide.",
            ]
        else:
            base = [
                "Create a personal GitHub portfolio with 2-3 polished projects.",
                "Build a resume-focused project that demonstrates measurable outcomes.",
                "Add a deployment or documentation story to show engineering discipline.",
            ]
        if suggested_skills:
            first = suggested_skills[0]
            base.insert(0, f"Add a project that demonstrates practical use of {first}.")
        return self._dedupe(base)[:4]

    def _career_advice(
        self, context: _ResumeAdvisorContext, suggested_skills: Sequence[str]
    ) -> list[str]:
        advice = [
            "Quantify your work experience with measurable results whenever possible.",
            "Tailor the CV summary to the target role before applying.",
            "Keep the resume concise and make the most relevant skills easy to scan.",
        ]
        if not self._has_github_signal(context.resume_text) and not self._has_portfolio_signal(context.resume_text):
            advice.append("Add a GitHub portfolio or project link so recruiters can review your work.")
        if context.projects:
            advice.append("Strengthen project bullets with the problem, your approach, and the result.")
        if suggested_skills:
            advice.append(f"Prioritize learning {suggested_skills[0]} before the next application.")
        if context.target_context == "backend":
            advice.append("Show deployment, APIs, and database work to fit backend roles better.")
        elif context.target_context == "data":
            advice.append("Emphasize dashboards, SQL, and analytics outcomes for data roles.")
        elif context.target_context == "frontend":
            advice.append("Show visual polish and React implementation details in your portfolio.")
        elif context.target_context == "cloud":
            advice.append("Highlight Docker, cloud deployment, and automation work.")
        return self._dedupe(advice)

    def _build_roadmap(self, suggested_skills: Sequence[str], context_name: str) -> list[ResumeAdvisorRoadmapItem]:
        focus_items = list(suggested_skills[:4])
        if len(focus_items) < 4:
            defaults = {
                "backend": ["FastAPI", "PostgreSQL", "Docker", "AWS"],
                "data": ["SQL", "Power BI", "Python Advanced", "Data Visualization"],
                "frontend": ["React", "TypeScript", "Portfolio", "CSS"],
                "cloud": ["Docker", "AWS", "Kubernetes", "CI/CD"],
                "general": ["Python Advanced", "GitHub Portfolio", "SQL", "Professional Communication"],
            }
            for item in defaults.get(context_name, defaults["general"]):
                if item not in focus_items:
                    focus_items.append(item)
                if len(focus_items) >= 4:
                    break
        return [
            ResumeAdvisorRoadmapItem(
                week=index,
                focus=focus,
                goals=[
                    f"Complete a focused learning module on {focus}.",
                    f"Apply {focus} in a small project or resume update.",
                    "Capture the outcome on your portfolio or CV.",
                ],
            )
            for index, focus in enumerate(focus_items[:4], start=1)
        ]

    def _summary_text(
        self,
        context: _ResumeAdvisorContext,
        summary_skills: Sequence[str],
        suggested_skills: Sequence[str],
        resume_score: int,
    ) -> str:
        experience_text = (
            f"{context.years_of_experience:.1f} years of experience"
            if context.years_of_experience
            else "limited verified experience"
        )
        strength_text = ", ".join(summary_skills[:3]) if summary_skills else "practical experience"
        improvement_text = ", ".join(suggested_skills[:3]) if suggested_skills else "portfolio, skill depth, and measurable outcomes"
        return (
            f"{context.candidate_name}'s resume currently scores {resume_score}/100. "
            f"It shows {experience_text}, with strongest signals around {strength_text}. "
            f"The main improvement areas are {improvement_text}."
        )

    def _persist_snapshot(
        self, report: ResumeAdvisorReport, *, regenerate: bool = False
    ) -> Path:
        path = self._snapshot_path(report)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(report.model_dump_json(indent=2), encoding="utf-8")
        except OSError as exc:
            raise ResumeAdvisorPersistenceError(
                f"Unable to persist resume advisor snapshot: {path}"
            ) from exc
        return path

    def _export_json(self, report: ResumeAdvisorReport) -> Path:
        path = self._export_path(report, "json")
        try:
            path.write_text(report.model_dump_json(indent=2), encoding="utf-8")
        except OSError as exc:
            raise ResumeAdvisorPersistenceError(
                f"Unable to export JSON report: {path}"
            ) from exc
        return path

    def _export_pdf(self, report: ResumeAdvisorReport) -> Path:
        path = self._export_path(report, "pdf")
        story: list[Any] = []
        story.append(Paragraph("SmartHire AI Resume Advisor", self.styles["LetterTitle"]))
        story.append(
            Paragraph(
                f"{report.candidate_name} | Resume Score {report.resume_score}/100",
                self.styles["LetterSubtitle"],
            )
        )
        story.append(Spacer(1, 4 * mm))
        story.append(build_separator())
        story.append(Paragraph("Resume Summary", self.styles["LetterSection"]))
        story.extend(build_body_paragraphs([report.cv_summary], self.styles))
        story.append(Paragraph("Quality Check", self.styles["LetterSection"]))
        story.append(
            build_key_value_table(
                [
                    ("Formatting", str(report.quality_check.formatting_score)),
                    ("Readability", str(report.quality_check.readability_score)),
                    ("Completeness", str(report.quality_check.completeness_score)),
                    ("Technical Skills", str(report.quality_check.technical_skills_score)),
                    ("Soft Skills", str(report.quality_check.soft_skills_score)),
                    ("Projects", str(report.quality_check.projects_score)),
                    ("Certificates", str(report.quality_check.certificates_score)),
                    ("Languages", str(report.quality_check.languages_score)),
                    ("Overall Score", str(report.quality_check.overall_quality_score)),
                ],
                self.styles,
            )
        )
        story.append(Paragraph("Strengths", self.styles["LetterSection"]))
        story.append(build_bullet_list(report.strengths, self.styles))
        story.append(Paragraph("Weaknesses", self.styles["LetterSection"]))
        story.append(build_bullet_list(report.weaknesses, self.styles))
        story.append(Paragraph("Missing Skills", self.styles["LetterSection"]))
        story.append(build_bullet_list(report.missing_skills, self.styles))
        story.append(Paragraph("Suggested Skills", self.styles["LetterSection"]))
        story.append(build_bullet_list(report.suggested_skills, self.styles))
        story.append(Paragraph("Suggested Certificates", self.styles["LetterSection"]))
        story.append(build_bullet_list(report.suggested_certificates, self.styles))
        story.append(Paragraph("Suggested Technologies", self.styles["LetterSection"]))
        story.append(build_bullet_list(report.suggested_technologies, self.styles))
        story.append(Paragraph("Suggested Projects", self.styles["LetterSection"]))
        story.append(build_bullet_list(report.suggested_projects, self.styles))
        story.append(Paragraph("Career Advice", self.styles["LetterSection"]))
        story.append(build_bullet_list(report.career_advice, self.styles))
        story.append(Paragraph("Learning Roadmap", self.styles["LetterSection"]))
        roadmap_lines = [
            f"Week {item.week}: {item.focus} - {', '.join(item.goals)}"
            for item in report.learning_roadmap
        ]
        story.append(build_bullet_list(roadmap_lines, self.styles))
        doc = SimpleDocTemplate(
            str(path),
            pagesize=A4,
            leftMargin=16 * mm,
            rightMargin=16 * mm,
            topMargin=16 * mm,
            bottomMargin=16 * mm,
            title="SmartHire AI Resume Advisor",
            author="SmartHire AI",
        )
        doc.build(story)
        return path

    def _snapshot_path(self, report: ResumeAdvisorReport) -> Path:
        folder = self.snapshot_root / str(report.candidate_id)
        folder.mkdir(parents=True, exist_ok=True)
        return folder / f"resume_advisor_{report.resume_id}.json"

    def _export_path(self, report: ResumeAdvisorReport, extension: str) -> Path:
        folder = self.export_root / str(report.candidate_id)
        folder.mkdir(parents=True, exist_ok=True)
        suffix = "pdf" if extension.lower() == "pdf" else "json"
        return folder / f"resume_advisor_{report.resume_id}.{suffix}"

    def _assert_candidate_access(self, current_user: CurrentUserResponse) -> None:
        if str(current_user.role_name or "").casefold() != "candidate":
            logger.warning(
                "security_event type=permission_denied module=resume_advisor user_id=%s role=%s",
                current_user.user_id,
                current_user.role_name,
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    def _candidate_name(self, user: Mapping[str, Any]) -> str:
        first = str(user.get("first_name") or "").strip()
        last = str(user.get("last_name") or "").strip()
        return " ".join(part for part in [first, last] if part).strip() or "Candidate"

    def _has_github_signal(self, text: str) -> bool:
        lowered = text.casefold()
        return "github" in lowered or "git hub" in lowered

    def _has_portfolio_signal(self, text: str) -> bool:
        lowered = text.casefold()
        return "portfolio" in lowered or "website" in lowered or "website:" in lowered

    def _score_note(self, label: str, score: int, suggestion: str) -> str:
        if score >= 80:
            return f"{label}: strong."
        if score >= 60:
            return f"{label}: acceptable."
        return f"{label}: {suggestion}"

    def _dedupe(self, values: Iterable[Any]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for value in values:
            text = clean_optional_text(value, "Resume advisor item", max_length=255)
            if not text:
                continue
            key = text.casefold()
            if key in seen:
                continue
            seen.add(key)
            result.append(text)
        return result

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        base = Path(report_root) if report_root else Path(self.settings.report_folder)
        if not base.is_absolute():
            base = Path(__file__).resolve().parents[2] / base
        base.mkdir(parents=True, exist_ok=True)
        return base
