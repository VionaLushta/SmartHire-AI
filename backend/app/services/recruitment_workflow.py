from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Literal, Mapping
import uuid
from time import perf_counter

from fastapi import HTTPException, status
from sqlalchemy import insert, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.application import AIAnalysis, Application, Notification, RecruiterNote
from app.models.interview import Interview
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.repositories.job_dashboard_repository import JobDashboardRepository
from app.repositories.job_repository import JobRepository
from app.services.analytics_service import AnalyticsService
from app.services.audit_log_service import record_audit_event
from app.services.email_service import EmailConfigurationError, EmailDeliveryError, EmailService
from app.services.nlp_matcher import (
    build_candidate_gaps,
    build_candidate_strengths,
    build_match_result,
    build_skill_report,
    score_job_fit,
)
from app.services.ocr_pdf_parser import extract_document_text
from app.services.pdf_generator import (
    DocumentGenerationError,
    GeneratedDocumentResult,
    PdfGenerator,
)
from app.templates.email_templates import (
    render_hold_email,
    render_interview_email,
    render_offer_email,
    render_rejection_email,
)

logger = logging.getLogger("smarthire.performance")
WorkflowDecision = Literal["Accept", "Interview", "Hold", "Reject"]


class WorkflowError(RuntimeError):
    pass


class WorkflowValidationError(WorkflowError):
    pass


class WorkflowPersistenceError(WorkflowError):
    pass


@dataclass(frozen=True)
class WorkflowHistoryEntry:
    timestamp: str
    event: str
    action: str
    recruiter: str
    candidate: str
    candidate_id: str
    application_id: int
    job_id: int
    decision: str
    document_type: str | None = None
    email_status: str | None = None
    rating: int | None = None
    details: str | None = None


@dataclass(frozen=True)
class WorkflowAuditEntry:
    timestamp: str
    recruiter: str
    candidate: str
    candidate_id: str
    job_id: int
    decision: str
    generated_document: str | None
    email_status: str
    action: str
    email_attachment: str | None = None
    rating: int | None = None
    error: str | None = None


@dataclass(frozen=True)
class WorkflowEmailEntry:
    timestamp: str
    recipient: str
    subject: str
    attachment: str
    document: str
    status: str
    recruiter: str
    candidate: str
    job_id: int
    error: str | None = None


@dataclass(frozen=True)
class WorkflowResult:
    status: str
    decision: str
    candidate_id: str
    job_id: int
    application_id: int
    recruiter: str
    candidate_name: str
    candidate_email: str
    applied_position: str
    application_status: str
    evaluation_timestamp: str
    timeline: list[dict[str, Any]]
    audit_log_path: str
    email_log_path: str
    workflow_history_path: str
    document: dict[str, Any] | None
    email: dict[str, Any] | None
    ai_evaluation: dict[str, Any]
    analytics: dict[str, Any]
    dashboard: dict[str, Any]
    error: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


class RecruitmentWorkflowService:
    def __init__(
        self,
        db: Session,
        *,
        report_root: str | Path | None = None,
        pdf_generator: PdfGenerator | None = None,
        email_service: EmailService | None = None,
        analytics_service: AnalyticsService | None = None,
    ) -> None:
        self.db = db
        self.settings = get_settings()
        self.report_root = self._resolve_report_root(report_root)
        self.workflow_root = self.report_root / "workflow"
        self.workflow_root.mkdir(parents=True, exist_ok=True)
        self.history_path = self.workflow_root / "workflow_history.jsonl"
        self.audit_path = self.workflow_root / "audit_log.jsonl"
        self.email_log_path = self.workflow_root / "email_log.jsonl"
        self.pdf_generator = pdf_generator or PdfGenerator(report_root=self.report_root)
        self.email_service = email_service or EmailService(
            settings=self.settings, report_root=self.report_root
        )
        self.analytics_service = analytics_service or AnalyticsService(db)
        self.job_repo = JobRepository(db)
        self.job_dashboard_repo = JobDashboardRepository(db)

    def process_recruiter_decision(
        self,
        *,
        candidate_id: uuid.UUID,
        job_id: int,
        decision: WorkflowDecision,
        recruiter_name: str,
        recruiter_email: str | None = None,
        notes: str | None = None,
        rating: int | None = None,
        interview_date: date | datetime | str | None = None,
        interview_time: str | None = None,
        interviewer_name: str | None = None,
        interview_type: str | None = None,
        expected_start_date: date | datetime | str | None = None,
        department: str | None = None,
        work_location: str | None = None,
        employment_type: str | None = None,
        acceptance_instructions: list[str] | None = None,
    ) -> dict[str, Any]:
        started = perf_counter()
        candidate = self._get_candidate(candidate_id)
        job = self._get_job(job_id)
        application = self._get_application(candidate_id, job_id)
        resume = self._get_resume(application)
        ai_analysis = self._get_ai_analysis(application["application_id"])

        candidate_text = self._candidate_text(resume)
        skill_groups = self.job_dashboard_repo.get_skill_groups(job_id)
        skill_rows = skill_groups["required_skills"] + skill_groups["optional_skills"]
        skill_report = (
            build_skill_report(candidate_text, skill_rows)
            if skill_rows
            else self._empty_skill_report(candidate_text)
        )
        match_result = build_match_result(
            self._candidate_name(candidate), candidate_text, job, self.job_repo.list()
        )
        overall_match = self._score(ai_analysis.get("overall_score"), match_result["primary_match"])
        resume_similarity = self._score(match_result["primary_match"], 0.0)
        required_coverage = float(skill_report["required_coverage"])
        optional_coverage = float(skill_report["optional_coverage"])
        skill_match = score_job_fit(resume_similarity, required_coverage, optional_coverage)
        experience_match = self._score(ai_analysis.get("experience_score"), max(skill_match, resume_similarity))
        education_match = self._score(ai_analysis.get("education_score"), skill_match)
        certificates_match = self._score(ai_analysis.get("certificate_score"), skill_match)
        evaluation_timestamp = self._timestamp()

        if notes:
            self.db.execute(
                insert(RecruiterNote.__table__).values(
                    application_id=application["application_id"], note=notes
                )
            )

        interview_payload = self._interview_payload(
            decision, interview_date, interview_time, interviewer_name, interview_type
        )
        application_status = self._decision_status(decision)
        self.db.execute(
            update(Application.__table__)
            .where(Application.__table__.c.application_id == application["application_id"])
            .values(status=application_status, updated_at=datetime.now(timezone.utc))
        )
        if decision == "Interview":
            self.db.execute(
                insert(Interview.__table__).values(
                    application_id=application["application_id"],
                    interviewer_id=self._lookup_user_id(interviewer_name or recruiter_name),
                    scheduled_at=self._normalize_datetime(
                        interview_payload["interview_date"], interview_payload["interview_time"]
                    ),
                    interview_type=interview_payload["interview_type"] or "Online",
                    status="scheduled",
                )
            )

        timeline = self._record_timeline(
            candidate=candidate,
            job=job,
            recruiter_name=recruiter_name,
            decision=decision,
            application_id=application["application_id"],
            notes=notes,
            application_status=application_status,
            rating=rating,
        )
        self.db.commit()

        document: GeneratedDocumentResult | None = None
        email_result: dict[str, Any] | None = None
        email_status = "not_sent"
        error_message: str | None = None
        try:
            document = self._generate_document(
                decision=decision,
                candidate=candidate,
                job=job,
                recruiter_name=recruiter_name,
                interview_payload=interview_payload,
                expected_start_date=expected_start_date,
                department=department,
                work_location=work_location,
                employment_type=employment_type,
                acceptance_instructions=acceptance_instructions,
            )
        except DocumentGenerationError as exc:
            error_message = str(exc)
            self._append_audit(
                WorkflowAuditEntry(
                    timestamp=evaluation_timestamp,
                    recruiter=recruiter_name,
                    candidate=self._candidate_name(candidate),
                    candidate_id=str(candidate_id),
                    job_id=job_id,
                    decision=decision,
                    generated_document=None,
                    email_status="not_sent",
                    action="pdf_generation_failed",
                    rating=rating,
                    error=error_message,
                )
            )
            result = self._result(
                status="pdf_failed",
                decision=decision,
                candidate=candidate,
                job=job,
                application=application,
                recruiter_name=recruiter_name,
                timeline=timeline,
                document=None,
                email_result=None,
                email_status="not_sent",
                error=error_message,
                evaluation_timestamp=evaluation_timestamp,
                ai_evaluation=self._ai_evaluation(
                    overall_match,
                    resume_similarity,
                    skill_match,
                    required_coverage,
                    optional_coverage,
                    experience_match,
                    education_match,
                    certificates_match,
                    0.0,
                    match_result,
                    skill_report,
                    ai_analysis,
                ),
            )
            self._log_timing(
                "process_recruiter_decision",
                started,
                status="pdf_failed",
                decision=decision,
                job_id=job_id,
            )
            return result

        try:
            email_result = self._send_email(
                decision=decision,
                candidate=candidate,
                job=job,
                recruiter_name=recruiter_name,
                document=document,
            )
            email_status = str(email_result.get("status") or "sent")
            timeline.extend(
                self._record_timeline(
                    candidate=candidate,
                    job=job,
                    recruiter_name=recruiter_name,
                    decision=decision,
                    application_id=application["application_id"],
                    notes=f"Email delivered: {document.document_type}",
                    application_status=application_status,
                    rating=rating,
                    event_name="Email Sent",
                    email_status=email_status,
                )
            )
            self._append_email(
                WorkflowEmailEntry(
                    timestamp=str(email_result.get("timestamp") or self._timestamp()),
                    recipient=str(email_result.get("recipient") or candidate["email"]),
                    subject=str(
                        email_result.get(
                            "subject",
                            self._subject(decision, self._candidate_name(candidate)),
                        )
                    ),
                    attachment=str(email_result.get("attachment") or Path(document.file_path).name),
                    document=str(email_result.get("document") or document.document_type),
                    status=email_status,
                    recruiter=recruiter_name,
                    candidate=self._candidate_name(candidate),
                    job_id=job_id,
                )
            )
        except (EmailConfigurationError, EmailDeliveryError) as exc:
            email_status = "failed"
            error_message = str(exc)
            timeline.extend(
                self._record_timeline(
                    candidate=candidate,
                    job=job,
                    recruiter_name=recruiter_name,
                    decision=decision,
                    application_id=application["application_id"],
                    notes=f"Email delivery failed: {error_message}",
                    application_status=application_status,
                    rating=rating,
                    event_name="Email Failed",
                    email_status=email_status,
                )
            )
            self._append_email(
                WorkflowEmailEntry(
                    timestamp=self._timestamp(),
                    recipient=str(candidate["email"]),
                    subject=self._subject(decision, self._candidate_name(candidate)),
                    attachment=Path(document.file_path).name,
                    document=document.document_type,
                    status=email_status,
                    recruiter=recruiter_name,
                    candidate=self._candidate_name(candidate),
                    job_id=job_id,
                    error=error_message,
                )
            )

        self._append_audit(
            WorkflowAuditEntry(
                timestamp=evaluation_timestamp,
                recruiter=recruiter_name,
                candidate=self._candidate_name(candidate),
                candidate_id=str(candidate_id),
                job_id=job_id,
                decision=decision,
                generated_document=document.document_type,
                email_status=email_status,
                action="process_recruiter_decision",
                email_attachment=Path(document.file_path).name,
                rating=rating,
                error=error_message,
            )
        )
        self.db.commit()

        result = self._result(
            status="completed" if email_status == "sent" else "partial_success",
            decision=decision,
            candidate=candidate,
            job=job,
            application=application,
            recruiter_name=recruiter_name,
            timeline=timeline,
            document=document,
            email_result=email_result,
            email_status=email_status,
            error=error_message,
            evaluation_timestamp=evaluation_timestamp,
            ai_evaluation=self._ai_evaluation(
                overall_match,
                resume_similarity,
                skill_match,
                required_coverage,
                optional_coverage,
                experience_match,
                education_match,
                certificates_match,
                0.0,
                match_result,
                skill_report,
                ai_analysis,
            ),
            analytics=self._refresh_analytics(),
            dashboard=self._refresh_dashboard(job_id, candidate_id),
        )
        self._log_timing(
            "process_recruiter_decision",
            started,
            status=str(result.get("status") or "unknown"),
            decision=decision,
            job_id=job_id,
        )
        return result

    def resend_notification(
        self,
        *,
        candidate_id: uuid.UUID,
        job_id: int,
        decision: WorkflowDecision | None = None,
        recruiter_name: str | None = None,
    ) -> dict[str, Any]:
        started = perf_counter()
        candidate = self._get_candidate(candidate_id)
        job = self._get_job(job_id)
        application = self._get_application(candidate_id, job_id)
        decision = decision or self._decision_from_status(application["status"])
        recruiter_name = recruiter_name or "SmartHire Recruiter"
        document = self._generate_document(
            decision=decision,
            candidate=candidate,
            job=job,
            recruiter_name=recruiter_name,
            interview_payload=self._interview_payload(decision, None, None, None, None),
            expected_start_date=None,
            department=None,
            work_location=None,
            employment_type=None,
            acceptance_instructions=None,
        )
        email_result = self._send_email(
            decision=decision,
            candidate=candidate,
            job=job,
            recruiter_name=recruiter_name,
            document=document,
        )
        self._append_audit(
            WorkflowAuditEntry(
                timestamp=self._timestamp(),
                recruiter=recruiter_name,
                candidate=self._candidate_name(candidate),
                candidate_id=str(candidate_id),
                job_id=job_id,
                decision=decision,
                generated_document=document.document_type,
                email_status=str(email_result.get("status") or "sent"),
                action="resend_notification",
                email_attachment=str(
                    email_result.get("attachment") or Path(document.file_path).name
                ),
            )
        )
        self._append_email(
            WorkflowEmailEntry(
                timestamp=str(email_result.get("timestamp") or self._timestamp()),
                recipient=str(email_result.get("recipient") or candidate["email"]),
                subject=str(
                    email_result.get(
                        "subject", self._subject(decision, self._candidate_name(candidate))
                    )
                ),
                attachment=str(email_result.get("attachment") or Path(document.file_path).name),
                document=str(email_result.get("document") or document.document_type),
                status=str(email_result.get("status") or "sent"),
                recruiter=recruiter_name,
                candidate=self._candidate_name(candidate),
                job_id=job_id,
            )
        )
        self.db.commit()
        result = {
            "status": email_result.get("status", "sent"),
            "recipient": email_result.get("recipient", candidate["email"]),
            "document": email_result.get("document", document.document_type),
            "timestamp": email_result.get("timestamp", self._timestamp()),
            "message_id": email_result.get("message_id"),
        }
        self._log_timing(
            "resend_notification",
            started,
            status=str(result.get("status") or "sent"),
            decision=decision,
            job_id=job_id,
        )
        return result

    def get_workflow_history(
        self,
        *,
        candidate_id: uuid.UUID | None = None,
        job_id: int | None = None,
    ) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        for path in (self.history_path, self.audit_path, self.email_log_path):
            if not path.exists():
                continue
            for line in path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if candidate_id is not None and record.get("candidate_id") != str(candidate_id):
                    continue
                if job_id is not None and record.get("job_id") != job_id:
                    continue
                records.append(record)
        records.sort(key=lambda item: item.get("timestamp", ""))
        return records

    def _record_timeline(
        self,
        *,
        candidate: dict[str, Any],
        job: dict[str, Any],
        recruiter_name: str,
        decision: WorkflowDecision,
        application_id: int,
        notes: str | None,
        application_status: str,
        rating: int | None = None,
        event_name: str | None = None,
        email_status: str | None = None,
    ) -> list[dict[str, Any]]:
        entries = [
            WorkflowHistoryEntry(
                timestamp=self._timestamp(),
                event=event_name or "Recruiter Evaluation Saved",
                action="timeline_event",
                recruiter=recruiter_name,
                candidate=self._candidate_name(candidate),
                candidate_id=str(candidate["user_id"]),
                application_id=application_id,
                job_id=job["job_id"],
                decision=decision,
                details=notes or application_status,
                email_status=email_status,
                rating=rating,
            )
        ]
        if event_name is None:
            entries.append(
                WorkflowHistoryEntry(
                    timestamp=self._timestamp(),
                    event=self._decision_event_name(decision),
                    action="timeline_event",
                    recruiter=recruiter_name,
                    candidate=self._candidate_name(candidate),
                    candidate_id=str(candidate["user_id"]),
                    application_id=application_id,
                    job_id=job["job_id"],
                    decision=decision,
                    document_type=self._document_type(decision),
                    details=application_status,
                    rating=rating,
                )
            )
        for entry in entries:
            self._append_history(entry)
        return [asdict(entry) for entry in entries]

    def _append_history(self, entry: WorkflowHistoryEntry) -> None:
        self._write_jsonl(self.history_path, asdict(entry))
        self.db.execute(
            insert(Notification.__table__).values(
                application_id=entry.application_id,
                user_id=uuid.UUID(entry.candidate_id),
                title=entry.event,
                message=entry.details or entry.decision,
                is_read=False,
            )
        )

    def _append_audit(self, entry: WorkflowAuditEntry) -> None:
        self._write_jsonl(self.audit_path, asdict(entry))
        record_audit_event(
            self.db,
            user_id=None,
            user_role="Recruiter",
            action=entry.action,
            entity_type="Workflow",
            entity_id=str(entry.application_id if hasattr(entry, "application_id") else entry.job_id),
            description=entry.decision,
            status="Failed" if entry.error else "Success",
            metadata=asdict(entry),
        )

    def _append_email(self, entry: WorkflowEmailEntry) -> None:
        self._write_jsonl(self.email_log_path, asdict(entry))

    def _generate_document(
        self,
        *,
        decision: WorkflowDecision,
        candidate: dict[str, Any],
        job: dict[str, Any],
        recruiter_name: str,
        interview_payload: Mapping[str, Any],
        expected_start_date: date | datetime | str | None,
        department: str | None,
        work_location: str | None,
        employment_type: str | None,
        acceptance_instructions: list[str] | None,
    ) -> GeneratedDocumentResult:
        company = self._job_company(job)
        if decision == "Accept":
            return self.pdf_generator.generate_offer_letter(
                candidate,
                job,
                recruiter_name,
                expected_start_date=expected_start_date,
                employment_type=employment_type,
                department=department,
                work_location=work_location,
                acceptance_instructions=acceptance_instructions,
                company=company,
            )
        if decision == "Interview":
            return self.pdf_generator.generate_interview_letter(
                candidate,
                job,
                recruiter_name,
                interview_date=interview_payload.get("interview_date"),
                interview_time=interview_payload.get("interview_time"),
                interview_type=interview_payload.get("interview_type"),
                interviewer_name=interview_payload.get("interviewer_name"),
                meeting_link="Meeting link to be shared by recruiting team",
                company=company,
            )
        if decision == "Hold":
            return self.pdf_generator.generate_hold_letter(
                candidate, job, recruiter_name, company=company
            )
        if decision == "Reject":
            return self.pdf_generator.generate_rejection_letter(
                candidate, job, recruiter_name, company=company
            )
        raise WorkflowValidationError(f"Unsupported decision: {decision}")

    def _send_email(
        self,
        *,
        decision: WorkflowDecision,
        candidate: dict[str, Any],
        job: dict[str, Any],
        recruiter_name: str,
        document: GeneratedDocumentResult,
    ) -> dict[str, Any]:
        candidate_name = self._candidate_name(candidate)
        company = self._job_company(job)
        company_name = self._company_value(company, "name", "SmartHire AI")
        company_address = self._company_value(company, "address", "")
        company_email = self._company_value(company, "email", "")
        company_phone = self._company_value(company, "phone", "")
        company_website = self._company_value(company, "website", "")
        if decision == "Accept":
            template = render_offer_email(
                candidate_name=candidate_name,
                applied_position=str(job.get("title") or ""),
                recruiter_name=recruiter_name,
                company_name=company_name,
                company_address=company_address,
                company_email=company_email,
                company_phone=company_phone,
                company_website=company_website,
            )
        elif decision == "Interview":
            template = render_interview_email(
                candidate_name=candidate_name,
                applied_position=str(job.get("title") or ""),
                recruiter_name=recruiter_name,
                company_name=company_name,
                company_address=company_address,
                company_email=company_email,
                company_phone=company_phone,
                company_website=company_website,
            )
        elif decision == "Hold":
            template = render_hold_email(
                candidate_name=candidate_name,
                applied_position=str(job.get("title") or ""),
                recruiter_name=recruiter_name,
                company_name=company_name,
                company_address=company_address,
                company_email=company_email,
                company_phone=company_phone,
                company_website=company_website,
            )
        else:
            template = render_rejection_email(
                candidate_name=candidate_name,
                applied_position=str(job.get("title") or ""),
                recruiter_name=recruiter_name,
                company_name=company_name,
                company_address=company_address,
                company_email=company_email,
                company_phone=company_phone,
                company_website=company_website,
            )
        return self.email_service._deliver(str(candidate["email"]), document, template)

    def _refresh_analytics(self) -> dict[str, Any]:
        return {
            "overview": self.analytics_service._dashboard("overview").model_dump(),
            "trends": self.analytics_service._dashboard("trends").model_dump(),
            "skills": self.analytics_service._dashboard("skills").model_dump(),
        }

    def _refresh_dashboard(self, job_id: int, candidate_id: uuid.UUID) -> dict[str, Any]:
        return {
            "candidate": self.analytics_service._dashboard(
                f"candidate:{candidate_id}", user_id=candidate_id
            ).model_dump(),
            "job": self.analytics_service._dashboard(f"job:{job_id}", job_id=job_id).model_dump(),
        }

    def _result(
        self,
        *,
        status: str,
        decision: WorkflowDecision,
        candidate: dict[str, Any],
        job: dict[str, Any],
        application: dict[str, Any],
        recruiter_name: str,
        timeline: list[dict[str, Any]],
        document: GeneratedDocumentResult | None,
        email_result: dict[str, Any] | None,
        email_status: str,
        error: str | None,
        evaluation_timestamp: str,
        ai_evaluation: dict[str, Any],
        analytics: dict[str, Any] | None = None,
        dashboard: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return WorkflowResult(
            status=status,
            decision=decision,
            candidate_id=str(candidate["user_id"]),
            job_id=job["job_id"],
            application_id=application["application_id"],
            recruiter=recruiter_name,
            candidate_name=self._candidate_name(candidate),
            candidate_email=str(candidate.get("email") or ""),
            applied_position=str(job.get("title") or ""),
            application_status=str(application.get("status") or ""),
            evaluation_timestamp=evaluation_timestamp,
            timeline=timeline,
            audit_log_path=str(self.audit_path),
            email_log_path=str(self.email_log_path),
            workflow_history_path=str(self.history_path),
            document=self._document(document),
            email=email_result,
            ai_evaluation=ai_evaluation,
            analytics=analytics or {},
            dashboard=dashboard or {},
            error=error,
        ).as_dict()

    def _ai_evaluation(
        self,
        overall_match_score: float,
        resume_similarity: float,
        skill_match: float,
        required_coverage: float,
        optional_coverage: float,
        experience_match: float,
        education_match: float,
        certificates_match: float,
        language_match: float,
        match_result: dict[str, Any],
        skill_report: dict[str, Any],
        ai_analysis: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "overall_match_score": overall_match_score,
            "resume_similarity": resume_similarity,
            "skill_match": skill_match,
            "required_skill_coverage": required_coverage,
            "optional_skill_coverage": optional_coverage,
            "experience_match": experience_match,
            "education_match": education_match,
            "certificates_match": certificates_match,
            "language_match": language_match,
            "primary_match": match_result.get("primary_match"),
            "secondary_role": match_result.get("secondary_position"),
            "secondary_match": match_result.get("secondary_match"),
            "strengths": skill_report.get("strengths", []),
            "gaps": skill_report.get("gaps", []),
            "analysis": ai_analysis,
        }

    def _get_candidate(self, candidate_id: uuid.UUID) -> dict[str, Any]:
        row = (
            self.db.execute(
                select(User.__table__).where(User.__table__.c.user_id == candidate_id)
            )
            .mappings()
            .first()
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
        return dict(row)

    def _get_job(self, job_id: int) -> dict[str, Any]:
        job = self.job_repo.get_by_id(job_id)
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
        return job

    def _get_application(self, candidate_id: uuid.UUID, job_id: int) -> dict[str, Any]:
        row = (
            self.db.execute(
                select(Application.__table__).where(
                    Application.__table__.c.user_id == candidate_id,
                    Application.__table__.c.job_id == job_id,
                )
            )
            .mappings()
            .first()
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Candidate application not found."
            )
        return dict(row)

    def _get_resume(self, application: dict[str, Any]) -> dict[str, Any] | None:
        resume_id = application.get("resume_id")
        if resume_id is None:
            return None
        row = (
            self.db.execute(
                select(Resume.__table__).where(Resume.__table__.c.resume_id == resume_id)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def _get_ai_analysis(self, application_id: int) -> dict[str, Any]:
        row = (
            self.db.execute(
                select(AIAnalysis.__table__).where(
                    AIAnalysis.__table__.c.application_id == application_id
                )
            )
            .mappings()
            .first()
        )
        return dict(row) if row else {}

    def _candidate_text(self, resume: dict[str, Any] | None) -> str:
        if resume is None:
            return ""
        parsed = str(resume.get("parsed_text") or "").strip()
        if parsed:
            return parsed
        file_path = resume.get("file_path")
        if not file_path:
            return ""
        try:
            return extract_document_text(file_path)
        except Exception:
            return ""

    def _empty_skill_report(self, candidate_text: str) -> dict[str, Any]:
        return {
            "report": [],
            "detected": [],
            "partial": [],
            "missing": [],
            "required_coverage": 0.0,
            "optional_coverage": 0.0,
            "strengths": build_candidate_strengths(candidate_text, []),
            "gaps": build_candidate_gaps([], candidate_text),
        }

    def _lookup_user_id(self, name_or_email: str) -> uuid.UUID:
        normalized = name_or_email.strip().casefold()
        for row in self.db.execute(select(User.__table__)).mappings():
            full_name = f"{row['first_name']} {row['last_name']}".strip().casefold()
            if full_name == normalized or str(row["email"]).casefold() == normalized:
                return row["user_id"]
        return uuid.uuid4()

    def _job_company(self, job: Mapping[str, Any]):
        company = self.job_repo.get_company(int(job["company_id"]))
        return company or self.pdf_generator.company

    def _company_value(self, company: Any, field: str, default: str = "") -> str:
        if isinstance(company, Mapping):
            value = company.get(field)
        else:
            value = getattr(company, field, None)
        text = str(value or "").strip()
        return text or default

    def _interview_payload(
        self,
        decision: WorkflowDecision,
        interview_date: date | datetime | str | None,
        interview_time: str | None,
        interviewer_name: str | None,
        interview_type: str | None,
    ) -> dict[str, Any]:
        if decision != "Interview":
            return {"interview_date": None, "interview_time": None, "interviewer_name": None, "interview_type": None}
        return {
            "interview_date": interview_date,
            "interview_time": interview_time,
            "interviewer_name": interviewer_name,
            "interview_type": interview_type or "Online",
        }

    def _normalize_datetime(self, interview_date: date | datetime | str | None, interview_time: str | None) -> datetime | None:
        if interview_date is None:
            return None
        if isinstance(interview_date, datetime):
            return interview_date
        if isinstance(interview_date, str):
            interview_date = date.fromisoformat(interview_date[:10])
        if interview_time:
            hour, minute = self._parse_time(interview_time)
            return datetime(interview_date.year, interview_date.month, interview_date.day, hour, minute, tzinfo=timezone.utc)
        return datetime(interview_date.year, interview_date.month, interview_date.day, tzinfo=timezone.utc)

    def _parse_time(self, value: str) -> tuple[int, int]:
        text = value.strip().lower().replace(" ", "")
        if text.endswith(("am", "pm")):
            suffix = text[-2:]
            hour_str, minute_str = text[:-2].split(":", 1)
            hour, minute = int(hour_str), int(minute_str)
            if suffix == "pm" and hour != 12:
                hour += 12
            if suffix == "am" and hour == 12:
                hour = 0
            return hour, minute
        hour_str, minute_str = text.split(":", 1)
        return int(hour_str), int(minute_str)

    def _decision_status(self, decision: WorkflowDecision) -> str:
        return {
            "Accept": "accepted",
            "Interview": "interview_scheduled",
            "Hold": "on_hold",
            "Reject": "rejected",
        }[decision]

    def _decision_event(self, decision: WorkflowDecision) -> str:
        return {
            "Accept": "Candidate Accepted",
            "Interview": "Interview Scheduled",
            "Hold": "Application On Hold",
            "Reject": "Candidate Rejected",
        }[decision]

    def _document_type(self, decision: WorkflowDecision) -> str:
        return {
            "Accept": "Offer of Employment",
            "Interview": "Interview Invitation",
            "Hold": "Application On Hold Notice",
            "Reject": "Application Status Notice",
        }[decision]

    def _subject(self, decision: WorkflowDecision, candidate_name: str) -> str:
        return {
            "Accept": f"SmartHire AI | Offer of Employment - {candidate_name}",
            "Interview": f"SmartHire AI | Interview Invitation - {candidate_name}",
            "Hold": f"SmartHire AI | Application On Hold - {candidate_name}",
            "Reject": f"SmartHire AI | Application Status Notice - {candidate_name}",
        }[decision]

    def _document(self, document: GeneratedDocumentResult | None) -> dict[str, Any] | None:
        if document is None:
            return None
        return {
            "file_path": document.file_path,
            "generated_at": document.generated_at.isoformat(),
            "document_type": document.document_type,
        }

    def _score(self, preferred: Any, fallback: float) -> float:
        try:
            return round(float(preferred), 1) if preferred not in (None, "") else round(float(fallback), 1)
        except (TypeError, ValueError):
            return round(float(fallback), 1)

    def _timestamp(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _log_timing(self, operation: str, started: float, **context: Any) -> None:
        details = " ".join(f"{key}={value}" for key, value in context.items() if value is not None)
        logger.info(
            "%s duration_ms=%.1f%s",
            operation,
            (perf_counter() - started) * 1000,
            f" {details}" if details else "",
        )

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        base = Path(report_root) if report_root else Path(self.settings.report_folder)
        if not base.is_absolute():
            base = Path(__file__).resolve().parents[2] / base
        base.mkdir(parents=True, exist_ok=True)
        return base

    def _write_jsonl(self, path: Path, payload: Mapping[str, Any]) -> None:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(payload, default=str, ensure_ascii=False))
                handle.write("\n")
        except OSError as exc:
            raise WorkflowPersistenceError(f"Unable to write workflow log: {path}") from exc

    def _append_history(self, entry: WorkflowHistoryEntry) -> None:
        self._write_jsonl(self.history_path, asdict(entry))
        self.db.execute(
            insert(Notification.__table__).values(
                application_id=entry.application_id,
                user_id=uuid.UUID(entry.candidate_id),
                title=entry.event,
                message=entry.details or entry.decision,
                is_read=False,
            )
        )

    def _append_audit(self, entry: WorkflowAuditEntry) -> None:
        self._write_jsonl(self.audit_path, asdict(entry))
        record_audit_event(
            self.db,
            user_id=None,
            user_role="Recruiter",
            action=entry.action,
            entity_type="Workflow",
            entity_id=str(entry.application_id if hasattr(entry, "application_id") else entry.job_id),
            description=entry.decision,
            status="Failed" if entry.error else "Success",
            metadata=asdict(entry),
        )

    def _append_email(self, entry: WorkflowEmailEntry) -> None:
        self._write_jsonl(self.email_log_path, asdict(entry))

    def _record_timeline(
        self,
        *,
        candidate: dict[str, Any],
        job: dict[str, Any],
        recruiter_name: str,
        decision: WorkflowDecision,
        application_id: int,
        notes: str | None,
        application_status: str,
        rating: int | None = None,
        event_name: str | None = None,
        email_status: str | None = None,
    ) -> list[dict[str, Any]]:
        entries = [
            WorkflowHistoryEntry(
                timestamp=self._timestamp(),
                event=event_name or "Recruiter Evaluation Saved",
                action="timeline_event",
                recruiter=recruiter_name,
                candidate=self._candidate_name(candidate),
                candidate_id=str(candidate["user_id"]),
                application_id=application_id,
                job_id=job["job_id"],
                decision=decision,
                details=notes or application_status,
                email_status=email_status,
                rating=rating,
            )
        ]
        if event_name is None:
            entries.append(
                WorkflowHistoryEntry(
                    timestamp=self._timestamp(),
                    event=self._decision_event(decision),
                    action="timeline_event",
                    recruiter=recruiter_name,
                    candidate=self._candidate_name(candidate),
                    candidate_id=str(candidate["user_id"]),
                    application_id=application_id,
                    job_id=job["job_id"],
                    decision=decision,
                    document_type=self._document_type(decision),
                    details=application_status,
                    rating=rating,
                )
            )
        for entry in entries:
            self._append_history(entry)
        return [asdict(entry) for entry in entries]

    def _generate_document(
        self,
        *,
        decision: WorkflowDecision,
        candidate: dict[str, Any],
        job: dict[str, Any],
        recruiter_name: str,
        interview_payload: Mapping[str, Any],
        expected_start_date: date | datetime | str | None,
        department: str | None,
        work_location: str | None,
        employment_type: str | None,
        acceptance_instructions: list[str] | None,
    ) -> GeneratedDocumentResult:
        company = self._job_company(job)
        if decision == "Accept":
            return self.pdf_generator.generate_offer_letter(
                candidate,
                job,
                recruiter_name,
                expected_start_date=expected_start_date,
                employment_type=employment_type,
                department=department,
                work_location=work_location,
                acceptance_instructions=acceptance_instructions,
                company=company,
            )
        if decision == "Interview":
            return self.pdf_generator.generate_interview_letter(
                candidate,
                job,
                recruiter_name,
                interview_date=interview_payload.get("interview_date"),
                interview_time=interview_payload.get("interview_time"),
                interview_type=interview_payload.get("interview_type"),
                interviewer_name=interview_payload.get("interviewer_name"),
                meeting_link="Meeting link to be shared by recruiting team",
                company=company,
            )
        if decision == "Hold":
            return self.pdf_generator.generate_hold_letter(candidate, job, recruiter_name, company=company)
        if decision == "Reject":
            return self.pdf_generator.generate_rejection_letter(candidate, job, recruiter_name, company=company)
        raise WorkflowValidationError(f"Unsupported decision: {decision}")

    def _send_email(
        self,
        *,
        decision: WorkflowDecision,
        candidate: dict[str, Any],
        job: dict[str, Any],
        recruiter_name: str,
        document: GeneratedDocumentResult,
    ) -> dict[str, Any]:
        candidate_name = self._candidate_name(candidate)
        company = self._job_company(job)
        company_name = self._company_value(company, "name", "SmartHire AI")
        company_address = self._company_value(company, "address", "")
        company_email = self._company_value(company, "email", "")
        company_phone = self._company_value(company, "phone", "")
        company_website = self._company_value(company, "website", "")
        renderers = {
            "Accept": render_offer_email,
            "Interview": render_interview_email,
            "Hold": render_hold_email,
            "Reject": render_rejection_email,
        }
        template = renderers[decision](
            candidate_name=candidate_name,
            applied_position=str(job.get("title") or ""),
            recruiter_name=recruiter_name,
            company_name=company_name,
            company_address=company_address,
            company_email=company_email,
            company_phone=company_phone,
            company_website=company_website,
        )
        return self.email_service._deliver(str(candidate["email"]), document, template)

    def _refresh_analytics(self) -> dict[str, Any]:
        return {
            "overview": self.analytics_service._dashboard("overview").model_dump(),
            "trends": self.analytics_service._dashboard("trends").model_dump(),
            "skills": self.analytics_service._dashboard("skills").model_dump(),
        }

    def _refresh_dashboard(self, job_id: int, candidate_id: uuid.UUID) -> dict[str, Any]:
        return {
            "candidate": self.analytics_service._dashboard(f"candidate:{candidate_id}", user_id=candidate_id).model_dump(),
            "job": self.analytics_service._dashboard(f"job:{job_id}", job_id=job_id).model_dump(),
        }

    def _get_application(self, candidate_id: uuid.UUID, job_id: int) -> dict[str, Any]:
        row = (
            self.db.execute(
                select(Application.__table__).where(
                    Application.__table__.c.user_id == candidate_id,
                    Application.__table__.c.job_id == job_id,
                )
            )
            .mappings()
            .first()
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate application not found.")
        return dict(row)

    def _result(
        self,
        *,
        status: str,
        decision: WorkflowDecision,
        candidate: dict[str, Any],
        job: dict[str, Any],
        application: dict[str, Any],
        recruiter_name: str,
        timeline: list[dict[str, Any]],
        document: GeneratedDocumentResult | None,
        email_result: dict[str, Any] | None,
        email_status: str,
        error: str | None,
        evaluation_timestamp: str,
        ai_evaluation: dict[str, Any],
        analytics: dict[str, Any] | None = None,
        dashboard: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return WorkflowResult(
            status=status,
            decision=decision,
            candidate_id=str(candidate["user_id"]),
            job_id=job["job_id"],
            application_id=application["application_id"],
            recruiter=recruiter_name,
            candidate_name=self._candidate_name(candidate),
            candidate_email=str(candidate.get("email") or ""),
            applied_position=str(job.get("title") or ""),
            application_status=str(application.get("status") or ""),
            evaluation_timestamp=evaluation_timestamp,
            timeline=timeline,
            audit_log_path=str(self.audit_path),
            email_log_path=str(self.email_log_path),
            workflow_history_path=str(self.history_path),
            document=self._document(document),
            email=email_result,
            ai_evaluation=ai_evaluation,
            analytics=analytics or {},
            dashboard=dashboard or {},
            error=error,
        ).as_dict()

    def _ai_evaluation(
        self,
        overall_match_score: float,
        resume_similarity: float,
        skill_match: float,
        required_coverage: float,
        optional_coverage: float,
        experience_match: float,
        education_match: float,
        certificates_match: float,
        language_match: float,
        match_result: dict[str, Any],
        skill_report: dict[str, Any],
        ai_analysis: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "overall_match_score": overall_match_score,
            "resume_similarity": resume_similarity,
            "skill_match": skill_match,
            "required_skill_coverage": required_coverage,
            "optional_skill_coverage": optional_coverage,
            "experience_match": experience_match,
            "education_match": education_match,
            "certificates_match": certificates_match,
            "language_match": language_match,
            "primary_match": match_result.get("primary_match"),
            "secondary_role": match_result.get("secondary_position"),
            "secondary_match": match_result.get("secondary_match"),
            "strengths": skill_report.get("strengths", []),
            "gaps": skill_report.get("gaps", []),
            "analysis": ai_analysis,
        }

    def _get_candidate(self, candidate_id: uuid.UUID) -> dict[str, Any]:
        row = (
            self.db.execute(select(User.__table__).where(User.__table__.c.user_id == candidate_id))
            .mappings()
            .first()
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
        return dict(row)

    def _get_job(self, job_id: int) -> dict[str, Any]:
        job = self.job_repo.get_by_id(job_id)
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
        return job

    def _get_resume(self, application: dict[str, Any]) -> dict[str, Any] | None:
        resume_id = application.get("resume_id")
        if resume_id is None:
            return None
        row = (
            self.db.execute(select(Resume.__table__).where(Resume.__table__.c.resume_id == resume_id))
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def _get_ai_analysis(self, application_id: int) -> dict[str, Any]:
        row = (
            self.db.execute(
                select(AIAnalysis.__table__).where(AIAnalysis.__table__.c.application_id == application_id)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else {}

    def _candidate_name(self, candidate: Mapping[str, Any]) -> str:
        parts = [str(candidate.get("first_name") or "").strip(), str(candidate.get("last_name") or "").strip()]
        return " ".join(part for part in parts if part).strip() or "Candidate"

    def _candidate_text(self, resume: dict[str, Any] | None) -> str:
        if resume is None:
            return ""
        parsed = str(resume.get("parsed_text") or "").strip()
        if parsed:
            return parsed
        try:
            return extract_document_text(resume["file_path"]) if resume.get("file_path") else ""
        except Exception:
            return ""

    def _empty_skill_report(self, candidate_text: str) -> dict[str, Any]:
        return {
            "report": [],
            "detected": [],
            "partial": [],
            "missing": [],
            "required_coverage": 0.0,
            "optional_coverage": 0.0,
            "strengths": build_candidate_strengths(candidate_text, []),
            "gaps": build_candidate_gaps([], candidate_text),
        }

    def _interview_payload(
        self,
        decision: WorkflowDecision,
        interview_date: date | datetime | str | None,
        interview_time: str | None,
        interviewer_name: str | None,
        interview_type: str | None,
    ) -> dict[str, Any]:
        if decision != "Interview":
            return {"interview_date": None, "interview_time": None, "interviewer_name": None, "interview_type": None}
        return {
            "interview_date": interview_date,
            "interview_time": interview_time,
            "interviewer_name": interviewer_name,
            "interview_type": interview_type or "Online",
        }

    def _normalize_datetime(self, interview_date: date | datetime | str | None, interview_time: str | None) -> datetime | None:
        if interview_date is None:
            return None
        if isinstance(interview_date, datetime):
            return interview_date
        if isinstance(interview_date, str):
            interview_date = date.fromisoformat(interview_date[:10])
        if interview_time:
            hour, minute = self._parse_time(interview_time)
            return datetime(interview_date.year, interview_date.month, interview_date.day, hour, minute, tzinfo=timezone.utc)
        return datetime(interview_date.year, interview_date.month, interview_date.day, tzinfo=timezone.utc)

    def _parse_time(self, value: str) -> tuple[int, int]:
        text = value.strip().lower().replace(" ", "")
        if text.endswith(("am", "pm")):
            suffix = text[-2:]
            hour_str, minute_str = text[:-2].split(":", 1)
            hour, minute = int(hour_str), int(minute_str)
            if suffix == "pm" and hour != 12:
                hour += 12
            if suffix == "am" and hour == 12:
                hour = 0
            return hour, minute
        hour_str, minute_str = text.split(":", 1)
        return int(hour_str), int(minute_str)

    def _decision_status(self, decision: WorkflowDecision) -> str:
        return {"Accept": "accepted", "Interview": "interview_scheduled", "Hold": "on_hold", "Reject": "rejected"}[decision]

    def _decision_event(self, decision: WorkflowDecision) -> str:
        return {"Accept": "Candidate Accepted", "Interview": "Interview Scheduled", "Hold": "Application On Hold", "Reject": "Candidate Rejected"}[decision]

    def _document_type(self, decision: WorkflowDecision) -> str:
        return {"Accept": "Offer of Employment", "Interview": "Interview Invitation", "Hold": "Application On Hold Notice", "Reject": "Application Status Notice"}[decision]

    def _subject(self, decision: WorkflowDecision, candidate_name: str) -> str:
        return {
            "Accept": f"SmartHire AI | Offer of Employment - {candidate_name}",
            "Interview": f"SmartHire AI | Interview Invitation - {candidate_name}",
            "Hold": f"SmartHire AI | Application On Hold - {candidate_name}",
            "Reject": f"SmartHire AI | Application Status Notice - {candidate_name}",
        }[decision]

    def _document(self, document: GeneratedDocumentResult | None) -> dict[str, Any] | None:
        if document is None:
            return None
        return {"file_path": document.file_path, "generated_at": document.generated_at.isoformat(), "document_type": document.document_type}

    def _score(self, preferred: Any, fallback: float) -> float:
        try:
            return round(float(preferred), 1) if preferred not in (None, "") else round(float(fallback), 1)
        except (TypeError, ValueError):
            return round(float(fallback), 1)

    def _timestamp(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        base = Path(report_root) if report_root else Path(self.settings.report_folder)
        if not base.is_absolute():
            base = Path(__file__).resolve().parents[2] / base
        base.mkdir(parents=True, exist_ok=True)
        return base

    def _write_jsonl(self, path: Path, payload: Mapping[str, Any]) -> None:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(payload, default=str, ensure_ascii=False))
                handle.write("\n")
        except OSError as exc:
            raise WorkflowPersistenceError(f"Unable to write workflow log: {path}") from exc
