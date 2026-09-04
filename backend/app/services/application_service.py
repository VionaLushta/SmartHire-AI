from __future__ import annotations

from datetime import date, datetime, timezone
import json
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import delete, func, insert, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.application import (
    AIAnalysis,
    AIRecommendation,
    Application,
    CompanyAnalytics,
    CoverLetter,
    FileUpload,
    Notification,
    ParsedDocument,
    RecruiterNote,
)
from app.models.certificate import Certificate
from app.models.company import Company
from app.models.resume import Education, Resume, WorkExperience
from app.models.interview import Interview, InterviewFeedback
from app.models.user import User
from app.repositories.application_repository import ApplicationRepository
from app.repositories.job_dashboard_repository import JobDashboardRepository
from app.repositories.job_repository import JobRepository
from app.schemas.application import ApplicationCreate, ApplicationRead
from app.schemas.auth import CurrentUserResponse
from app.services.notification_service import NotificationService
from app.services.email_service import EmailConfigurationError, EmailDeliveryError, EmailService
from app.services.ocr_pdf_parser import extract_document_text
from app.services.nlp_matcher import (
    build_candidate_gaps,
    build_candidate_strengths,
    build_skill_report,
    calculate_similarity,
    score_job_fit,
)


class ApplicationService:
    def __init__(self, db: Session, email_service: EmailService | None = None) -> None:
        self.db = db
        self.repo = ApplicationRepository(db)
        self.job_repo = JobRepository(db)
        self.job_dashboard_repo = JobDashboardRepository(db)
        self.settings = get_settings()
        self.email_service = email_service
        self.cover_letter_dir = Path(self.settings.upload_folder) / "cover_letters"
        if not self.cover_letter_dir.is_absolute():
            self.cover_letter_dir = Path(__file__).resolve().parents[1] / self.cover_letter_dir
        self.cover_letter_dir.mkdir(parents=True, exist_ok=True)

    def list_applications(self, current_user: CurrentUserResponse | None) -> list[ApplicationRead]:
        if current_user is None:
            return []

        role_name = str(current_user.role_name or "").lower()
        if role_name == "admin":
            rows = self.repo.list_all()
        elif role_name in {"company", "recruiter"}:
            if current_user.company_id is None:
                return []
            rows = self.repo.list_for_company(int(current_user.company_id))
        else:
            rows = self.repo.list_for_user(current_user.user_id)
        return [self._read(row) for row in rows]

    def update_status(self, application_id: int, new_status: str, current_user: CurrentUserResponse) -> ApplicationRead:
        if str(current_user.role_name or "").lower() not in {"admin", "company", "recruiter"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can update application status.")
        row = self.repo.get_by_id(application_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
        updated = self.repo.update_status(application_id, new_status)
        if new_status in {"interview", "accepted", "rejected"} and updated:
            self._send_status_email(updated, new_status)
        return self._read(updated or row)

    def delete_application(self, application_id: int, current_user: CurrentUserResponse) -> None:
        row = self.repo.get_by_id(application_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        role_name = str(current_user.role_name or "").lower()
        if role_name == "candidate" and row["user_id"] != current_user.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own application.")
        if role_name not in {"candidate", "admin"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to delete applications.")

        application_id_column = Application.__table__.c.application_id
        self.db.execute(
            delete(InterviewFeedback.__table__).where(
                InterviewFeedback.__table__.c.interview_id.in_(
                    select(Interview.__table__.c.interview_id).where(
                        Interview.__table__.c.application_id == application_id
                    )
                )
            )
        )
        child_tables = (
            Interview,
            RecruiterNote,
            ParsedDocument,
            AIRecommendation,
            AIAnalysis,
            CoverLetter,
            Notification,
            CompanyAnalytics,
            FileUpload,
        )
        for model in child_tables:
            self.db.execute(
                delete(model.__table__).where(
                    model.__table__.c.application_id == application_id
                )
            )
        self.db.execute(
            Application.__table__.delete().where(application_id_column == application_id)
        )
        self.db.commit()

    def create_application(
        self,
        payload: ApplicationCreate,
        current_user: CurrentUserResponse,
    ) -> ApplicationRead:
        if str(current_user.role_name or "").lower() != "candidate":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only candidates can apply.")
        if not current_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email address before applying.",
            )

        job = self.job_repo.get_by_id(payload.job_id)
        job_status = str(job.get("status") or "").lower() if job else ""
        if job is None or (job_status and job_status not in JobRepository.PUBLISHED_STATUSES):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

        if self.repo.get_by_user_and_job(current_user.user_id, payload.job_id) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already applied for this job.",
            )

        resume = self._resolve_resume(current_user.user_id, payload.resume_id)
        application_id = self._create_application_row(
            user_id=current_user.user_id,
            job_id=payload.job_id,
            resume_id=resume["resume_id"] if resume else None,
        )

        if payload.cover_letter:
            self._store_cover_letter(application_id, payload.cover_letter)

        ai_payload = self._build_ai_analysis(job, current_user, resume, application_id)
        self.db.execute(
            insert(AIAnalysis.__table__).values(
                application_id=application_id,
                overall_score=ai_payload["overall_score"],
                resume_score=ai_payload["resume_score"],
                skills_score=ai_payload["skills_score"],
                education_score=ai_payload["education_score"],
                experience_score=ai_payload["experience_score"],
                language_score=ai_payload["language_score"],
                certificate_score=ai_payload["certificate_score"],
                missing_skills=json.dumps(ai_payload["missing_skills"]),
                strengths=json.dumps(ai_payload["strengths"]),
                recommendations=ai_payload["recommendations"],
            )
        )
        self.db.execute(
            insert(AIRecommendation.__table__).values(
                application_id=application_id,
                recommendation_text=ai_payload["recommendations"],
            )
        )
        self.db.commit()

        self._send_admin_notification(current_user, job, application_id)
        self._send_application_received_email(current_user, job)

        row = self.repo.get_by_id(application_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to create application.",
            )
        response_row = dict(row)
        if str(response_row.get("status") or "").lower() == "pending":
            response_row["status"] = "submitted"
        return self._read(response_row)

    def _mailer(self) -> EmailService:
        if self.email_service is None:
            self.email_service = EmailService()
        return self.email_service

    def _send_application_received_email(self, current_user: CurrentUserResponse, job: dict) -> None:
        try:
            self._mailer().send_application_received_email(
                current_user.email,
                first_name=current_user.first_name,
                job_title=str(job.get("title") or "Selected role"),
                company_name=self._company_name(job.get("company_id")),
            )
        except (EmailConfigurationError, EmailDeliveryError, OSError):
            return

    def _company_name(self, company_id: int | None) -> str:
        if not company_id:
            return "SmartHire AI"
        return str(self.db.scalar(select(Company.__table__.c.name).where(Company.__table__.c.company_id == company_id)) or "SmartHire AI")

    def _send_status_email(self, application: dict, new_status: str) -> None:
        try:
            candidate = {
                "candidate_name": application.get("candidate_name") or "Candidate",
                "candidate_email": application.get("candidate_email"),
            }
            job = {"title": application.get("job_title") or "Selected role"}
            recruiter_name = "SmartHire AI"
            if new_status == "accepted":
                self._mailer().send_offer_email(candidate, job, recruiter_name)
            elif new_status == "rejected":
                self._mailer().send_rejection_email(candidate, job, recruiter_name)
            else:
                self._mailer().send_application_status_email(
                    application["candidate_email"],
                    first_name=str(application.get("candidate_name") or "Candidate").split(" ")[0],
                    job_title=str(application.get("job_title") or "Selected role"),
                    status_name=new_status,
                )
        except (EmailConfigurationError, EmailDeliveryError, OSError):
            return

    def _read(self, row: dict) -> ApplicationRead:
        payload = dict(row)
        for key in ("missing_skills", "strengths"):
            value = payload.get(key)
            if isinstance(value, str):
                try:
                    payload[key] = json.loads(value)
                except json.JSONDecodeError:
                    payload[key] = [item.strip() for item in value.split(",") if item.strip()]
            elif value is None:
                payload[key] = []
        return ApplicationRead.model_validate(payload)

    def _create_application_row(self, *, user_id, job_id: int, resume_id: int | None) -> int:
        row = (
            self.db.execute(
                insert(Application.__table__)
                .values(
                    user_id=user_id,
                    job_id=job_id,
                    resume_id=resume_id,
                    status="pending",
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                .returning(Application.__table__.c.application_id)
            )
            .scalar_one()
        )
        return int(row)

    def _resolve_resume(self, user_id, resume_id: int | None) -> dict | None:
        if resume_id is not None:
            row = (
                self.db.execute(
                    select(Resume.__table__).where(
                        Resume.__table__.c.resume_id == resume_id,
                        Resume.__table__.c.user_id == user_id,
                    )
                )
                .mappings()
                .first()
            )
            if row is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
            return dict(row)

        row = (
            self.db.execute(
                select(Resume.__table__)
                .where(Resume.__table__.c.user_id == user_id)
                .order_by(Resume.__table__.c.resume_id.desc())
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def _store_cover_letter(self, application_id: int, cover_letter: str) -> None:
        file_name = f"cover_letter_{application_id}_{uuid4().hex}.txt"
        file_path = self.cover_letter_dir / file_name
        file_path.write_text(cover_letter, encoding="utf-8")
        self.db.execute(
            insert(CoverLetter.__table__).values(
                application_id=application_id,
                file_path=str(file_path),
                content=cover_letter,
            )
        )

    def _build_ai_analysis(
        self,
        job: dict,
        current_user: CurrentUserResponse,
        resume: dict | None,
        application_id: int,
    ) -> dict[str, object]:
        skill_groups = self.job_dashboard_repo.get_skill_groups(int(job["job_id"]))
        skill_rows = [
            {"name": skill["name"], "is_required": True}
            for skill in skill_groups["required_skills"]
        ] + [
            {"name": skill["name"], "is_required": False}
            for skill in skill_groups["optional_skills"]
        ]

        candidate_text = self._resume_text(resume)
        if skill_rows:
            skill_report = build_skill_report(candidate_text, skill_rows)
        else:
            skill_report = {
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
        overall_score = score_job_fit(
            resume_similarity,
            float(skill_report["required_coverage"]),
            float(skill_report["optional_coverage"]),
        )

        required_skill_names = [skill["name"] for skill in skill_groups["required_skills"]]
        optional_skill_names = [skill["name"] for skill in skill_groups["optional_skills"]]
        certificates = self._candidate_certificates(current_user.user_id)
        education_score = self._education_score(resume)
        experience_score = self._experience_score(resume, job.get("experience_level"))
        certificate_score = self._certificate_score(certificates, required_skill_names)
        skills_score = round(
            float(skill_report["required_coverage"]) * 0.7
            + float(skill_report["optional_coverage"]) * 0.3,
            1,
        )

        strengths = list(skill_report.get("strengths") or build_candidate_strengths(candidate_text, skill_rows))
        missing = list(skill_report.get("missing") or [])
        recommendation = self._recommendation(overall_score, missing, strengths)

        language_score = self._language_score(current_user.user_id)
        return {
            "overall_score": overall_score,
            "resume_score": round(resume_similarity * 100, 1),
            "skills_score": skills_score,
            "education_score": education_score,
            "experience_score": experience_score,
            "language_score": language_score,
            "certificate_score": certificate_score,
            "missing_skills": missing,
            "strengths": strengths,
            "recommendations": self._format_recommendation(strengths, missing, recommendation),
        }

    def _language_score(self, user_id) -> float:
        from app.models.resume import UserLanguage
        count = self.db.scalar(
            select(func.count()).select_from(UserLanguage.__table__).where(UserLanguage.__table__.c.user_id == user_id)
        ) or 0
        return 100.0 if count else 0.0

    def _resume_text(self, resume: dict | None) -> str:
        if resume is None:
            return ""
        parsed = str(resume.get("parsed_text") or "").strip()
        if parsed:
            return parsed
        file_path = str(resume.get("file_path") or "").strip()
        if not file_path:
            return ""
        try:
            return extract_document_text(file_path)
        except Exception:
            return ""

    def _candidate_certificates(self, user_id) -> list[str]:
        statement = select(Certificate.__table__.c.title).where(Certificate.__table__.c.user_id == user_id)
        return [str(row[0]) for row in self.db.execute(statement).all() if row[0]]

    def _education_score(self, resume: dict | None) -> float:
        if resume is None:
            return 0.0
        statement = select(Education.__table__.c.degree).where(Education.__table__.c.resume_id == resume["resume_id"])
        degrees = [str(row[0]).casefold() for row in self.db.execute(statement).all() if row[0]]
        if any("phd" in degree or "doctor" in degree for degree in degrees):
            return 95.0
        if any("master" in degree or "msc" in degree for degree in degrees):
            return 88.0
        if any("bachelor" in degree or "bsc" in degree for degree in degrees):
            return 80.0
        return 55.0 if degrees else 35.0

    def _experience_score(self, resume: dict | None, experience_level: str | None) -> float:
        if resume is None:
            return 0.0
        statement = select(
            WorkExperience.__table__.c.start_date,
            WorkExperience.__table__.c.end_date,
        ).where(WorkExperience.__table__.c.resume_id == resume["resume_id"])
        total_days = 0
        for start_date, end_date in self.db.execute(statement):
            if start_date:
                total_days += max(0, ((end_date or date.today()) - start_date).days)
        years = total_days / 365.25
        level = str(experience_level or "").casefold()
        target = 2.0
        if "senior" in level:
            target = 5.0
        elif "lead" in level:
            target = 7.0
        elif "junior" in level or "entry" in level:
            target = 1.0
        if target <= 0:
            return 60.0 if years else 30.0
        return round(max(20.0, min(100.0, (years / target) * 100 if years else 25.0)), 1)

    def _certificate_score(self, certificates: list[str], required_skills: list[str]) -> float:
        if not certificates:
            return 30.0 if required_skills else 45.0
        lowered = [certificate.casefold() for certificate in certificates]
        matches = 0
        for skill in required_skills:
            if any(skill.casefold() in certificate for certificate in lowered):
                matches += 1
        base = 60 + min(30, len(certificates) * 8)
        if matches:
            base += min(15, matches * 5)
        return float(min(100, base))

    def _recommendation(self, overall_score: float, missing: list[str], strengths: list[str]) -> str:
        if overall_score >= 85:
            summary = "Recommend for interview."
        elif overall_score >= 70:
            summary = "Recommend manual review."
        elif overall_score >= 50:
            summary = "Recommend hold for further screening."
        else:
            summary = "Recommend rejection or alternative role review."
        missing_text = ", ".join(missing[:5]) if missing else "No major gaps detected"
        strengths_text = ", ".join(strengths[:5]) if strengths else "General profile signals"
        return (
            f"Strengths: {strengths_text}. "
            f"Missing skills: {missing_text}. "
            f"Recommendation: {summary}"
        )

    def _format_recommendation(self, strengths: list[str], missing: list[str], recommendation: str) -> str:
        return recommendation

    def _send_admin_notification(self, current_user: CurrentUserResponse, job: dict, application_id: int) -> None:
        candidate_name = " ".join(
            part for part in [str(current_user.first_name or "").strip(), str(current_user.last_name or "").strip()] if part
        ).strip() or "Candidate"
        try:
            NotificationService(self.db).seed_event_notification(
                recipient_user_id=None,
                recipient_role="admin",
                title="New Application",
                message=f"{candidate_name} applied for {job.get('title') or 'a role'}.",
                type="New Application",
                priority="High",
                related_candidate_id=current_user.user_id,
                related_job_id=int(job["job_id"]),
                is_system=True,
            )
        except Exception:
            # Notification delivery should never block application persistence.
            return
