from __future__ import annotations

from csv import DictWriter
from datetime import date, datetime, time, timedelta, timezone
from io import StringIO
import csv
import json
import logging
from pathlib import Path
from time import perf_counter
from typing import Any, Iterable, Mapping, Sequence
from uuid import UUID

from fastapi import HTTPException, status
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy import insert, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.validation import clean_optional_text, clean_text, validate_http_url
from app.ml.skill_extractor import SkillExtractor
from app.models.application import AIAnalysis, Application, Notification
from app.models.interview import Interview
from app.models.job import Job, JobSkill
from app.models.resume import Resume
from app.models.skill import Skill
from app.models.user import User
from app.repositories.job_repository import JobRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.interview import (
    ExportFormat,
    InterviewExportPayload,
    InterviewGuideSnapshot,
    InterviewQuestion,
    InterviewResponse,
    InterviewScheduleRequest,
    InterviewStatus,
    InterviewTimelineEvent,
    InterviewType,
    InterviewUpdateRequest,
)
from app.services.email_service import EmailService
from app.services.interview_ai_service import InterviewAIService
from app.services.pdf_generator import GeneratedDocumentResult, PdfGenerator
from app.services.nlp_matcher import build_candidate_gaps, build_candidate_strengths, build_skill_report, calculate_similarity, score_job_fit
from app.templates.email_templates import _render_email
from app.templates.pdf_letter import build_body_paragraphs, build_bullet_list, build_letter_styles, build_separator, build_signature_table

logger = logging.getLogger("smarthire.performance")


class InterviewSchedulerError(RuntimeError):
    pass


class InterviewSchedulerValidationError(InterviewSchedulerError):
    pass


class InterviewSchedulerPersistenceError(InterviewSchedulerError):
    pass


class InterviewSchedulerService:
    def __init__(
        self,
        db: Session,
        *,
        report_root: str | Path | None = None,
        interview_ai_service: InterviewAIService | None = None,
        email_service: EmailService | None = None,
        pdf_generator: PdfGenerator | None = None,
        skill_extractor: SkillExtractor | None = None,
    ) -> None:
        self.db = db
        self.settings = get_settings()
        self.report_root = self._resolve_report_root(report_root)
        self.interview_root = self.report_root / "interviews"
        self.interview_root.mkdir(parents=True, exist_ok=True)
        self.state_path = self.interview_root / "interviews.jsonl"
        self.audit_path = self.interview_root / "interview_audit.jsonl"
        self.pdf_generator = pdf_generator or PdfGenerator(report_root=self.report_root)
        self.email_service = email_service or EmailService(
            settings=self.settings, report_root=self.report_root
        )
        self.interview_ai_service = interview_ai_service or InterviewAIService(
            report_root=self.report_root
        )
        self.skill_extractor = skill_extractor or SkillExtractor()
        self.job_repo = JobRepository(db)
        self.styles = build_letter_styles()

    def schedule_interview(
        self,
        payload: InterviewScheduleRequest,
        current_user: CurrentUserResponse,
    ) -> InterviewResponse:
        started = perf_counter()
        candidate, job, application, resume, ai_analysis = self._load_context(
            payload.candidate_id, payload.job_id
        )
        self._assert_can_manage_job(job, current_user)
        interviewer = self._resolve_user(payload.interviewer_id or current_user.user_id)
        scheduled_at = self._combine_datetime(payload.interview_date, payload.interview_time)
        self._assert_future_schedule(scheduled_at)

        guide, questions, variant = self._build_interview_guide(
            candidate=candidate,
            job=job,
            application=application,
            resume=resume,
            ai_analysis=ai_analysis,
            regenerate_questions=payload.regenerate_questions,
            variant=0,
        )

        interview_row = self.db.execute(
            insert(Interview.__table__)
            .values(
                application_id=application["application_id"],
                interviewer_id=interviewer["user_id"],
                scheduled_at=scheduled_at,
                interview_type=self._normalize_interview_type(payload.interview_type),
                status="Scheduled",
            )
            .returning(*Interview.__table__.c)
        ).mappings().one()

        state = self._build_state(
            interview_row=dict(interview_row),
            candidate=candidate,
            job=job,
            interviewer=interviewer,
            scheduled_at=scheduled_at,
            duration_minutes=payload.duration_minutes,
            interview_type=self._normalize_interview_type(payload.interview_type),
            location=payload.location,
            meeting_link=payload.meeting_link,
            notes=payload.notes,
            guide=guide,
            questions=questions,
            variant=variant,
            current_status="Scheduled",
            actor=current_user,
            event_name="Interview Scheduled",
            message="Interview scheduled successfully.",
        )
        self._persist_state(state)
        self._update_application_status(application["application_id"], "interview_scheduled")
        self._append_timeline(
            application_id=application["application_id"],
            candidate_id=candidate["user_id"],
            actor_id=current_user.user_id,
            event_name="Interview Scheduled",
            message=self._timeline_message(state),
            status="Scheduled",
        )
        self.db.commit()

        email_result = self._send_interview_notification(
            notification_type="invitation",
            candidate=candidate,
            job=job,
            interviewer_name=self._user_name(interviewer),
            interview_date=scheduled_at.date(),
            interview_time=payload.interview_time,
            interview_type=self._normalize_interview_type(payload.interview_type),
            meeting_link=payload.meeting_link,
            notes=payload.notes,
            guide=guide,
        )
        state = self._update_state_after_email(state, email_result, scheduled_at)
        self._persist_state(state)
        self._write_audit(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": "schedule_interview",
                "candidate_id": str(candidate["user_id"]),
                "job_id": job["job_id"],
                "interview_id": state["interview_id"],
                "status": state["status"],
                "email_status": state.get("email_status"),
            }
        )
        self._log_timing("schedule_interview", started, interview_id=state["interview_id"])
        return self._to_response(state)

    def update_interview(
        self,
        interview_id: int,
        payload: InterviewUpdateRequest,
        current_user: CurrentUserResponse,
    ) -> InterviewResponse:
        interview, state, candidate, job, application, interviewer = self._load_interview_bundle(interview_id)
        self._assert_can_manage_job(job, current_user)

        if payload.status == "Cancelled":
            return self.cancel_interview(interview_id, current_user, notes=payload.notes)
        if payload.status == "Completed":
            return self.complete_interview(interview_id, current_user, notes=payload.notes)
        if payload.status == "No Show":
            return self._mark_no_show(interview_id, current_user, notes=payload.notes)

        scheduled_at = state["scheduled_at"]
        if payload.interview_date is not None or payload.interview_time is not None:
            interview_date = payload.interview_date or self._parse_iso_date(state.get("interview_date"))
            interview_time = payload.interview_time or str(state.get("interview_time") or "09:00")
            scheduled_at = self._combine_datetime(interview_date, interview_time)
            self._assert_future_schedule(scheduled_at)

        interviewer = (
            self._resolve_user(payload.interviewer_id)
            if payload.interviewer_id is not None
            else interviewer
        )
        interview_type = self._normalize_interview_type(
            payload.interview_type or state.get("interview_type") or "Online"
        )
        duration_minutes = payload.duration_minutes or int(state.get("duration_minutes") or 60)
        location = payload.location if payload.location is not None else state.get("location")
        meeting_link = payload.meeting_link if payload.meeting_link is not None else state.get("meeting_link")
        notes = payload.notes if payload.notes is not None else state.get("notes")
        if meeting_link is not None:
            meeting_link = validate_http_url(meeting_link, "Meeting link")

        guide, questions, variant = self._build_interview_guide(
            candidate=candidate,
            job=job,
            application=application,
            resume=self._load_resume(application),
            ai_analysis=self._load_ai_analysis(application["application_id"]),
            regenerate_questions=payload.regenerate_questions,
            variant=int(state.get("question_variant") or 0),
        )

        updated_at = datetime.now(timezone.utc)
        state.update(
            {
                "interviewer_id": str(interviewer["user_id"]) if interviewer else None,
                "interviewer_name": self._user_name(interviewer) if interviewer else None,
                "scheduled_at": scheduled_at.isoformat(),
                "interview_date": scheduled_at.date().isoformat(),
                "interview_time": self._format_time_string(scheduled_at),
                "duration_minutes": duration_minutes,
                "interview_type": interview_type,
                "location": location,
                "meeting_link": meeting_link,
                "notes": notes,
                "status": "Rescheduled",
                "guide": guide.model_dump(),
                "questions": [question.model_dump() for question in questions],
                "question_variant": variant,
                "reminder_at": (scheduled_at - timedelta(hours=24)).isoformat(),
                "reminder_sent_at": None,
                "updated_at": updated_at.isoformat(),
                "timeline": self._append_state_timeline(
                    state,
                    event_name="Interview Updated",
                    message="Interview details were updated.",
                    status="Rescheduled",
                    actor=current_user,
                ),
            }
        )
        self._persist_state(state)
        self.db.execute(
            update(Interview.__table__)
            .where(Interview.__table__.c.interview_id == interview_id)
            .values(
                interviewer_id=interviewer["user_id"] if interviewer else interview["interviewer_id"],
                scheduled_at=scheduled_at,
                interview_type=interview_type,
                status="Rescheduled",
            )
        )
        self._update_application_status(application["application_id"], "interview_scheduled")
        self._append_timeline(
            application_id=application["application_id"],
            candidate_id=candidate["user_id"],
            actor_id=current_user.user_id,
            event_name="Interview Updated",
            message=self._timeline_message(state),
            status="Rescheduled",
        )
        self.db.commit()

        email_result = self._send_interview_notification(
            notification_type="rescheduled",
            candidate=candidate,
            job=job,
            interviewer_name=self._user_name(interviewer),
            interview_date=scheduled_at.date(),
            interview_time=self._format_time_string(scheduled_at),
            interview_type=interview_type,
            meeting_link=meeting_link,
            notes=notes,
            guide=guide,
        )
        state = self._update_state_after_email(state, email_result, scheduled_at)
        self._persist_state(state)
        return self._to_response(state)

    def cancel_interview(
        self,
        interview_id: int,
        current_user: CurrentUserResponse,
        *,
        notes: str | None = None,
    ) -> InterviewResponse:
        interview, state, candidate, job, application, interviewer = self._load_interview_bundle(interview_id)
        self._assert_can_manage_job(job, current_user)

        updated_at = datetime.now(timezone.utc)
        state.update(
            {
                "status": "Cancelled",
                "notes": notes if notes is not None else state.get("notes"),
                "updated_at": updated_at.isoformat(),
                "timeline": self._append_state_timeline(
                    state,
                    event_name="Interview Cancelled",
                    message=notes or "Interview cancelled.",
                    status="Cancelled",
                    actor=current_user,
                ),
            }
        )
        self._persist_state(state)
        self.db.execute(
            update(Interview.__table__)
            .where(Interview.__table__.c.interview_id == interview_id)
            .values(status="Cancelled")
        )
        self._update_application_status(application["application_id"], "interview_cancelled")
        self._append_timeline(
            application_id=application["application_id"],
            candidate_id=candidate["user_id"],
            actor_id=current_user.user_id,
            event_name="Interview Cancelled",
            message=self._timeline_message(state),
            status="Cancelled",
        )
        self.db.commit()

        email_result = self._send_cancel_email(
            candidate=candidate,
            job=job,
            interviewer_name=self._user_name(interviewer),
            interview=state,
            notes=notes,
        )
        state = self._update_state_after_email(state, email_result, self._parse_state_datetime(state["scheduled_at"]))
        self._persist_state(state)
        return self._to_response(state)

    def _mark_no_show(
        self,
        interview_id: int,
        current_user: CurrentUserResponse,
        *,
        notes: str | None = None,
    ) -> InterviewResponse:
        interview, state, candidate, job, application, interviewer = self._load_interview_bundle(interview_id)
        self._assert_can_manage_job(job, current_user)

        updated_at = datetime.now(timezone.utc)
        state.update(
            {
                "status": "No Show",
                "notes": notes if notes is not None else state.get("notes"),
                "updated_at": updated_at.isoformat(),
                "timeline": self._append_state_timeline(
                    state,
                    event_name="Interview Marked No Show",
                    message=notes or "Interview marked as no show.",
                    status="No Show",
                    actor=current_user,
                ),
            }
        )
        self._persist_state(state)
        self.db.execute(
            update(Interview.__table__)
            .where(Interview.__table__.c.interview_id == interview_id)
            .values(status="No Show")
        )
        self._update_application_status(application["application_id"], "interview_no_show")
        self._append_timeline(
            application_id=application["application_id"],
            candidate_id=candidate["user_id"],
            actor_id=current_user.user_id,
            event_name="Interview No Show",
            message=self._timeline_message(state),
            status="No Show",
        )
        self.db.commit()
        return self._to_response(state)

    def complete_interview(
        self,
        interview_id: int,
        current_user: CurrentUserResponse,
        *,
        notes: str | None = None,
    ) -> InterviewResponse:
        interview, state, candidate, job, application, interviewer = self._load_interview_bundle(interview_id)
        self._assert_can_manage_job(job, current_user)

        updated_at = datetime.now(timezone.utc)
        state.update(
            {
                "status": "Completed",
                "notes": notes if notes is not None else state.get("notes"),
                "updated_at": updated_at.isoformat(),
                "timeline": self._append_state_timeline(
                    state,
                    event_name="Interview Completed",
                    message=notes or "Interview completed.",
                    status="Completed",
                    actor=current_user,
                ),
            }
        )
        self._persist_state(state)
        self.db.execute(
            update(Interview.__table__)
            .where(Interview.__table__.c.interview_id == interview_id)
            .values(status="Completed")
        )
        self._update_application_status(application["application_id"], "interviewed")
        self._append_timeline(
            application_id=application["application_id"],
            candidate_id=candidate["user_id"],
            actor_id=current_user.user_id,
            event_name="Interview Completed",
            message=self._timeline_message(state),
            status="Completed",
        )
        self.db.commit()
        return self._to_response(state)

    def list_interviews(self, current_user: CurrentUserResponse) -> list[InterviewResponse]:
        self.send_due_reminders(current_user=current_user)
        return self._filter_and_build(current_user=current_user)

    def upcoming_interviews(self, current_user: CurrentUserResponse) -> list[InterviewResponse]:
        self.send_due_reminders(current_user=current_user)
        now = datetime.now(timezone.utc)
        interviews = [
            item
            for item in self._filter_and_build(current_user=current_user)
            if item.scheduled_at is not None
            and item.scheduled_at >= now
            and item.status not in {"Cancelled", "Completed", "No Show"}
        ]
        return sorted(interviews, key=lambda item: item.scheduled_at or datetime.max.replace(tzinfo=timezone.utc))

    def today_interviews(self, current_user: CurrentUserResponse) -> list[InterviewResponse]:
        self.send_due_reminders(current_user=current_user)
        today = datetime.now(timezone.utc).date()
        interviews = [
            item
            for item in self._filter_and_build(current_user=current_user)
            if item.scheduled_at is not None and item.scheduled_at.date() == today
        ]
        return sorted(interviews, key=lambda item: item.scheduled_at or datetime.max.replace(tzinfo=timezone.utc))

    def candidate_interviews(
        self,
        candidate_id: UUID,
        current_user: CurrentUserResponse,
    ) -> list[InterviewResponse]:
        role = str(current_user.role_name or "").casefold()
        if role == "candidate" and current_user.user_id != candidate_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
        if role not in {"admin", "recruiter", "candidate"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
        self.send_due_reminders(current_user=current_user)
        interviews = [
            item
            for item in self._filter_and_build(current_user=current_user)
            if item.candidate_id == candidate_id
        ]
        if role == "candidate":
            interviews = [item for item in interviews if item.candidate_id == current_user.user_id]
        return sorted(interviews, key=lambda item: item.scheduled_at or datetime.max.replace(tzinfo=timezone.utc))

    def export_interviews(
        self,
        current_user: CurrentUserResponse,
        *,
        report_format: ExportFormat = "json",
    ) -> tuple[bytes, str, str]:
        interviews = self._filter_and_build(current_user=current_user)
        started = perf_counter()
        columns = [
            "interview_id",
            "candidate_name",
            "candidate_email",
            "job_title",
            "interviewer_name",
            "scheduled_at",
            "duration_minutes",
            "interview_type",
            "location",
            "meeting_link",
            "status",
            "notes",
        ]
        rows = [
            {
                "interview_id": item.interview_id,
                "candidate_name": item.candidate_name,
                "candidate_email": str(item.candidate_email),
                "job_title": item.job_title,
                "interviewer_name": item.interviewer_name,
                "scheduled_at": item.scheduled_at.isoformat() if item.scheduled_at else "",
                "duration_minutes": item.duration_minutes,
                "interview_type": item.interview_type,
                "location": item.location or "",
                "meeting_link": item.meeting_link or "",
                "status": item.status,
                "notes": item.notes or "",
            }
            for item in interviews
        ]
        if report_format == "csv":
            buffer = StringIO()
            writer = DictWriter(buffer, fieldnames=columns)
            writer.writeheader()
            writer.writerows(rows)
            content = buffer.getvalue().encode("utf-8")
            media_type = "text/csv"
            filename = "interview_schedule.csv"
        elif report_format == "json":
            payload = {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "dataset": "interview_schedule",
                "columns": columns,
                "rows": rows,
            }
            content = json.dumps(payload, default=str, indent=2).encode("utf-8")
            media_type = "application/json"
            filename = "interview_schedule.json"
        elif report_format == "powerbi":
            payload = {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "dataset": {"name": "interview_schedule", "columns": columns, "rows": rows},
            }
            content = json.dumps(payload, default=str, indent=2).encode("utf-8")
            media_type = "application/json"
            filename = "interview_schedule_powerbi.json"
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported export format.")
        self._log_timing("export_interviews", started, format=report_format)
        return content, media_type, filename

    def send_due_reminders(
        self,
        current_user: CurrentUserResponse | None = None,
        *,
        now: datetime | None = None,
    ) -> int:
        now = now or datetime.now(timezone.utc)
        sent = 0
        for state in self._load_states().values():
            reminder_at = self._parse_state_datetime(state.get("reminder_at"))
            if reminder_at is None or reminder_at > now:
                continue
            if state.get("reminder_sent_at"):
                continue
            if state.get("status") in {"Cancelled", "Completed", "No Show"}:
                continue
            candidate, job, application, resume, ai_analysis = self._load_context(
                UUID(str(state["candidate_id"])), int(state["job_id"])
            )
            guide = self._guide_from_state(state)
            email_result = self._send_interview_notification(
                notification_type="reminder",
                candidate=candidate,
                job=job,
                interviewer_name=state.get("interviewer_name"),
                interview_date=self._parse_state_datetime(state.get("scheduled_at")).date(),
                interview_time=str(state.get("interview_time") or self._format_time_string(self._parse_state_datetime(state.get("scheduled_at")))),
                interview_type=str(state.get("interview_type") or "Online"),
                meeting_link=state.get("meeting_link"),
                notes=state.get("notes"),
                guide=guide,
                attachment_override=self._build_reminder_attachment(state, candidate, job, guide),
            )
            state["reminder_sent_at"] = now.isoformat()
            state["email_status"] = str(email_result.get("status") or "sent")
            state["email_error"] = None
            state["updated_at"] = now.isoformat()
            state["timeline"] = self._append_state_timeline(
                state,
                event_name="Interview Reminder Sent",
                message="Interview reminder sent automatically.",
                status=state.get("status"),
                actor=current_user or self._system_user(),
            )
            self._persist_state(state)
            self.db.execute(
                insert(Notification.__table__).values(
                    application_id=application["application_id"],
                    user_id=candidate["user_id"],
                    title="Interview Reminder Sent",
                    message="Your interview reminder was sent automatically.",
                    is_read=False,
                )
            )
            self.db.commit()
            sent += 1
        return sent

    def _load_context(
        self, candidate_id: UUID, job_id: int
    ) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any] | None, dict[str, Any]]:
        candidate = self._get_user(candidate_id)
        job = self._get_job(job_id)
        application = self._get_application(candidate_id, job_id)
        resume = self._load_resume(application)
        ai_analysis = self._load_ai_analysis(application["application_id"])
        return candidate, job, application, resume, ai_analysis

    def _load_interview_bundle(
        self, interview_id: int
    ) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any] | None]:
        row = (
            self.db.execute(
                select(Interview.__table__).where(Interview.__table__.c.interview_id == interview_id)
            )
            .mappings()
            .first()
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
        interview = dict(row)
        application = self._get_application_by_id(interview["application_id"])
        candidate = self._get_user(application["user_id"])
        job = self._get_job(application["job_id"])
        interviewer = self._get_user(interview["interviewer_id"]) if interview.get("interviewer_id") else None
        state = self._load_state(interview_id)
        if state is None:
            state = self._build_state(
                interview_row=interview,
                candidate=candidate,
                job=job,
                interviewer=interviewer or self._system_user(),
                scheduled_at=interview.get("scheduled_at") or datetime.now(timezone.utc),
                duration_minutes=60,
                interview_type=self._normalize_interview_type(interview.get("interview_type") or "Online"),
                location=None,
                meeting_link=None,
                notes=None,
                guide=None,
                questions=[],
                variant=0,
                current_status=self._normalize_status(interview.get("status") or "Scheduled"),
                actor=self._system_user(),
                event_name="Interview Loaded",
                message="Interview loaded from database.",
            )
        return interview, state, candidate, job, application, interviewer

    def _filter_and_build(self, current_user: CurrentUserResponse) -> list[InterviewResponse]:
        records = []
        states = self._load_states()
        role = str(current_user.role_name or "").casefold()
        for row in self.db.execute(select(Interview.__table__)).mappings().all():
            interview = dict(row)
            application = self._get_application_by_id(interview["application_id"])
            candidate = self._get_user(application["user_id"])
            job = self._get_job(application["job_id"])
            if not self._can_view_job(job, current_user):
                continue
            if role == "candidate" and current_user.user_id != candidate["user_id"]:
                continue
            state = states.get(int(interview["interview_id"])) or self._build_state(
                interview_row=interview,
                candidate=candidate,
                job=job,
                interviewer=self._get_user(interview["interviewer_id"]) if interview.get("interviewer_id") else None,
                scheduled_at=interview.get("scheduled_at") or datetime.now(timezone.utc),
                duration_minutes=60,
                interview_type=self._normalize_interview_type(interview.get("interview_type") or "Online"),
                location=None,
                meeting_link=None,
                notes=None,
                guide=None,
                questions=[],
                variant=0,
                current_status=self._normalize_status(interview.get("status") or "Scheduled"),
                actor=current_user,
                event_name="Interview Loaded",
                message="Interview loaded from database.",
            )
            records.append(self._to_response(state))
        return sorted(records, key=lambda item: item.scheduled_at or datetime.max.replace(tzinfo=timezone.utc))

    def _build_interview_guide(
        self,
        *,
        candidate: dict[str, Any],
        job: dict[str, Any],
        application: dict[str, Any],
        resume: dict[str, Any] | None,
        ai_analysis: dict[str, Any],
        regenerate_questions: bool,
        variant: int,
    ) -> tuple[InterviewGuideSnapshot, list[InterviewQuestion], int]:
        candidate_text = self._candidate_text(candidate, resume, job)
        job_description = str(job.get("description") or job.get("title") or "Interview description").strip()
        skill_report = self._job_skill_report(candidate_text, job["job_id"])
        detected_skills = skill_report["detected"]
        missing_skills = skill_report["missing"]
        matched_skills = skill_report["detected"][:3]
        overall_match = self._score_overall_match(candidate_text, job_description, ai_analysis, skill_report)
        ai_match_result = {
            "overall_match": overall_match,
            "candidate_strengths": build_candidate_strengths(candidate_text, skill_report["report"]),
            "candidate_risks": build_candidate_gaps(skill_report["report"], candidate_text),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
        }
        guide = self.interview_ai_service.generate_interview_guide(
            candidate_cv=candidate_text,
            job_description=job_description,
            ai_match_result=ai_match_result,
            candidate_name=self._user_name(candidate),
            job_title=str(job.get("title") or "Interview").strip(),
            detected_skills=detected_skills,
            missing_skills=missing_skills,
            variant=variant + (1 if regenerate_questions else 0),
        )
        questions = [
            InterviewQuestion.model_validate(question.model_dump())
            for question in guide.questions
        ]
        return (
            InterviewGuideSnapshot.model_validate(guide.model_dump()),
            questions,
            variant + (1 if regenerate_questions else 0),
        )

    def _build_state(
        self,
        *,
        interview_row: dict[str, Any],
        candidate: dict[str, Any],
        job: dict[str, Any],
        interviewer: dict[str, Any] | None,
        scheduled_at: datetime,
        duration_minutes: int,
        interview_type: str,
        location: str | None,
        meeting_link: str | None,
        notes: str | None,
        guide: InterviewGuideSnapshot | None,
        questions: list[InterviewQuestion],
        variant: int,
        current_status: str,
        actor: CurrentUserResponse | dict[str, Any],
        event_name: str,
        message: str,
    ) -> dict[str, Any]:
        actor_name = self._user_name(actor)
        now = datetime.now(timezone.utc)
        timeline = [
            {
                "timestamp": now.isoformat(),
                "event": event_name,
                "message": message,
                "status": current_status,
                "actor": actor_name,
            }
        ]
        state = {
            "interview_id": int(interview_row["interview_id"]),
            "application_id": int(interview_row["application_id"]),
            "candidate_id": str(candidate["user_id"]),
            "candidate_name": self._user_name(candidate),
            "candidate_email": candidate["email"],
            "job_id": int(job["job_id"]),
            "job_title": job.get("title"),
            "interviewer_id": str(interviewer["user_id"]) if interviewer else None,
            "interviewer_name": self._user_name(interviewer) if interviewer else None,
            "scheduled_at": scheduled_at.isoformat(),
            "interview_date": scheduled_at.date().isoformat(),
            "interview_time": self._format_time_string(scheduled_at),
            "duration_minutes": duration_minutes,
            "interview_type": interview_type,
            "location": location,
            "meeting_link": meeting_link,
            "status": current_status,
            "notes": notes,
            "questions": [question.model_dump() for question in questions],
            "guide": guide.model_dump() if guide else None,
            "timeline": timeline,
            "reminder_at": (scheduled_at - timedelta(hours=24)).isoformat(),
            "reminder_sent_at": None,
            "email_status": None,
            "email_error": None,
            "created_at": self._to_iso(interview_row.get("created_at")),
            "updated_at": now.isoformat(),
            "question_variant": variant,
            "document_path": None,
        }
        return state

    def _update_state_after_email(
        self,
        state: dict[str, Any],
        email_result: dict[str, Any] | None,
        scheduled_at: datetime,
    ) -> dict[str, Any]:
        updated = dict(state)
        updated["email_status"] = str(email_result.get("status") or "sent") if email_result else "failed"
        updated["email_error"] = None
        if email_result is None:
            updated["email_error"] = "Email delivery failed."
        updated["updated_at"] = datetime.now(timezone.utc).isoformat()
        if email_result and email_result.get("attachment"):
            updated["document_path"] = str(email_result["attachment"])
        event_name = "Interview Invitation Sent" if updated["status"] == "Scheduled" else "Interview Notification Sent"
        updated["timeline"] = self._append_state_timeline(
            updated,
            event_name=event_name,
            message="Interview email delivered." if email_result else "Interview email delivery failed.",
            status=updated["status"],
            actor=self._system_user(),
        )
        return updated

    def _append_state_timeline(
        self,
        state: dict[str, Any],
        *,
        event_name: str,
        message: str,
        status: str | None,
        actor: CurrentUserResponse | dict[str, Any],
    ) -> list[dict[str, Any]]:
        timeline = list(state.get("timeline") or [])
        timeline.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event": event_name,
                "message": message,
                "status": status,
                "actor": self._user_name(actor),
            }
        )
        return timeline

    def _send_interview_notification(
        self,
        *,
        notification_type: str,
        candidate: dict[str, Any],
        job: dict[str, Any],
        interviewer_name: str | None,
        interview_date: date,
        interview_time: str,
        interview_type: str,
        meeting_link: str | None,
        notes: str | None,
        guide: InterviewGuideSnapshot,
        attachment_override: GeneratedDocumentResult | None = None,
    ) -> dict[str, Any] | None:
        candidate_name = self._user_name(candidate)
        title = {
            "invitation": "Interview Invitation",
            "rescheduled": "Interview Rescheduled",
            "reminder": "Interview Reminder",
            "cancelled": "Interview Cancelled",
        }.get(notification_type, "Interview Notification")
        attachment_note = {
            "invitation": "The interview invitation PDF is attached to this email.",
            "rescheduled": "The updated interview guide PDF is attached to this email.",
            "reminder": "The reminder PDF is attached to this email.",
            "cancelled": "A cancellation notice PDF is attached to this email.",
        }.get(notification_type, "The interview PDF is attached to this email.")
        body_lines = [
            f"Applied position: {job.get('title') or 'Interview'}",
            f"Interview date: {interview_date.strftime('%B %d, %Y')}",
            f"Interview time: {interview_time}",
            f"Interview type: {interview_type}",
        ]
        if meeting_link:
            body_lines.append(f"Meeting link: {meeting_link}")
        if interviewer_name:
            body_lines.append(f"Interviewer: {interviewer_name}")
        if notes:
            body_lines.append(f"Notes: {notes}")
        if notification_type == "reminder":
            body_lines.insert(0, "This is a reminder for your upcoming interview within the next 24 hours.")
        if notification_type == "rescheduled":
            body_lines.insert(0, "Your interview has been rescheduled.")
        if notification_type == "invitation":
            body_lines.insert(0, "Your interview has been scheduled.")

        template = _render_email(
            document_label=title,
            subject_label=title,
            candidate_name=candidate_name,
            applied_position=str(job.get("title") or "Interview"),
            recruiter_name=interviewer_name or "Recruitment Team",
            company_name=self.settings.app_name if hasattr(self.settings, "app_name") else "SmartHire AI",
            company_address="1200 Market Street, Suite 400, San Francisco, CA 94103",
            company_email="hr@smarthire.ai",
            company_phone="+1 (555) 013-2048",
            company_website="www.smarthire.ai",
            body_lines=body_lines,
            closing_line="Thank you for your continued interest in SmartHire AI.",
            attachment_note=attachment_note,
        )
        document = attachment_override or self.pdf_generator.generate_interview_letter(
            candidate,
            job,
            interviewer_name or "Recruitment Team",
            interview_date=interview_date,
            interview_time=interview_time,
            interview_type=interview_type,
            meeting_link=meeting_link,
            interviewer_name=interviewer_name,
            preparation_instructions=(
                [notes] if notes else None
            ),
        )
        try:
            result = self.email_service._deliver(candidate["email"], document, template)
            if isinstance(result, dict):
                result.setdefault("file_path", document.file_path)
            return result
        except Exception as exc:  # pragma: no cover - delivery failures are logged and surfaced in state
            logger.warning("interview email delivery failed: %s", exc)
            return {
                "status": "failed",
                "recipient": candidate["email"],
                "document": document.document_type,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message_id": None,
                "subject": template.subject,
                "attachment": Path(document.file_path).name,
                "file_path": document.file_path,
                "error": str(exc),
            }

    def _send_cancel_email(
        self,
        *,
        candidate: dict[str, Any],
        job: dict[str, Any],
        interviewer_name: str | None,
        interview: dict[str, Any],
        notes: str | None,
    ) -> dict[str, Any] | None:
        scheduled_at = self._parse_state_datetime(interview["scheduled_at"])
        document = self._generate_cancellation_notice_pdf(candidate, job, interview, notes)
        return self._send_interview_notification(
            notification_type="cancelled",
            candidate=candidate,
            job=job,
            interviewer_name=interviewer_name,
            interview_date=scheduled_at.date(),
            interview_time=str(interview.get("interview_time") or self._format_time_string(scheduled_at)),
            interview_type=str(interview.get("interview_type") or "Online"),
            meeting_link=interview.get("meeting_link"),
            notes=notes or str(interview.get("notes") or ""),
            guide=self._guide_from_state(interview),
            attachment_override=document,
        )

    def _build_reminder_attachment(
        self,
        state: dict[str, Any],
        candidate: dict[str, Any],
        job: dict[str, Any],
        guide: InterviewGuideSnapshot,
    ) -> GeneratedDocumentResult:
        scheduled_at = self._parse_state_datetime(state["scheduled_at"])
        return self.pdf_generator.generate_interview_letter(
            candidate,
            job,
            state.get("interviewer_name") or "Recruitment Team",
            interview_date=scheduled_at.date(),
            interview_time=str(state.get("interview_time") or self._format_time_string(scheduled_at)),
            interview_type=str(state.get("interview_type") or "Online"),
            meeting_link=state.get("meeting_link"),
            interviewer_name=state.get("interviewer_name"),
            preparation_instructions=guide.overall_interview_plan[:3]
            or ["Review the interview details", "Join on time", "Prepare questions"],
        )

    def _generate_cancellation_notice_pdf(
        self,
        candidate: dict[str, Any],
        job: dict[str, Any],
        interview: dict[str, Any],
        notes: str | None,
    ) -> GeneratedDocumentResult:
        output_dir = self.interview_root / "documents"
        output_dir.mkdir(parents=True, exist_ok=True)
        candidate_name = self._user_name(candidate)
        filename = f"Interview_Cancellation_{self._slugify(candidate_name)}_{interview['interview_id']}.pdf"
        path = output_dir / filename
        story: list[Any] = [
            Paragraph("Interview Cancellation Notice", self.styles["LetterTitle"]),
            Paragraph(
                f"{self.settings.app_name if hasattr(self.settings, 'app_name') else 'SmartHire AI'} | {candidate_name}",
                self.styles["LetterSubtitle"],
            ),
            Spacer(1, 6),
            build_separator(),
            Spacer(1, 6),
        ]
        story.extend(
            build_body_paragraphs(
                [
                    f"The scheduled interview for {job.get('title') or 'the role'} has been cancelled.",
                    f"Original interview date: {self._parse_state_datetime(interview['scheduled_at']).strftime('%B %d, %Y')}",
                    f"Original interview time: {interview.get('interview_time') or self._format_time_string(self._parse_state_datetime(interview['scheduled_at']))}",
                ],
                self.styles,
            )
        )
        story.append(Paragraph("Interview Details", self.styles["LetterSection"]))
        story.append(
            build_bullet_list(
                [
                    f"Interview type: {interview.get('interview_type') or 'Online'}",
                    f"Location: {interview.get('location') or 'To be confirmed'}",
                    f"Meeting link: {interview.get('meeting_link') or 'To be shared separately'}",
                    f"Notes: {notes or interview.get('notes') or 'No additional notes provided.'}",
                ],
                self.styles,
            )
        )
        story.append(Spacer(1, 6))
        story.append(build_signature_table("Recruitment Team", "SmartHire AI", styles=self.styles))
        doc = SimpleDocTemplate(
            str(path),
            pagesize=A4,
            leftMargin=16 * mm,
            rightMargin=16 * mm,
            topMargin=16 * mm,
            bottomMargin=16 * mm,
            title="Interview Cancellation Notice",
            author="SmartHire AI",
        )
        doc.build(story)
        return GeneratedDocumentResult(
            file_path=str(path),
            generated_at=datetime.now(timezone.utc),
            document_type="Interview Cancellation Notice",
        )

    def _to_response(self, state: dict[str, Any]) -> InterviewResponse:
        payload = dict(state)
        payload.setdefault("timeline", [])
        payload.setdefault("questions", [])
        payload.setdefault("guide", None)
        payload.setdefault("email_status", None)
        payload.setdefault("email_error", None)
        payload.setdefault("document_path", None)
        return InterviewResponse.model_validate(payload)

    def _load_states(self) -> dict[int, dict[str, Any]]:
        records: dict[int, dict[str, Any]] = {}
        if not self.state_path.exists():
            return records
        try:
            for line in self.state_path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                payload = json.loads(line)
                interview_id = payload.get("interview_id")
                if interview_id is None:
                    continue
                records[int(interview_id)] = payload
        except OSError as exc:
            raise InterviewSchedulerPersistenceError(
                f"Unable to read interview state file: {self.state_path}"
            ) from exc
        return records

    def _load_state(self, interview_id: int) -> dict[str, Any] | None:
        return self._load_states().get(int(interview_id))

    def _persist_state(self, state: dict[str, Any]) -> None:
        try:
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            with self.state_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(state, default=str, ensure_ascii=False))
                handle.write("\n")
        except OSError as exc:
            raise InterviewSchedulerPersistenceError(
                f"Unable to write interview state file: {self.state_path}"
            ) from exc

    def _write_audit(self, payload: Mapping[str, Any]) -> None:
        try:
            self.audit_path.parent.mkdir(parents=True, exist_ok=True)
            with self.audit_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(payload, default=str, ensure_ascii=False))
                handle.write("\n")
        except OSError as exc:
            raise InterviewSchedulerPersistenceError(
                f"Unable to write interview audit file: {self.audit_path}"
            ) from exc

    def _append_timeline(
        self,
        *,
        application_id: int,
        candidate_id: UUID,
        actor_id: UUID,
        event_name: str,
        message: str,
        status: str,
    ) -> None:
        for user_id in {candidate_id, actor_id}:
            self.db.execute(
                insert(Notification.__table__).values(
                    application_id=application_id,
                    user_id=user_id,
                    title=event_name,
                    message=message,
                    is_read=False,
                )
            )

    def _update_application_status(self, application_id: int, status_name: str) -> None:
        self.db.execute(
            update(Application.__table__)
            .where(Application.__table__.c.application_id == application_id)
            .values(status=status_name, updated_at=datetime.now(timezone.utc))
        )

    def _build_resume_text(self, resume: dict[str, Any] | None) -> str:
        if not resume:
            return ""
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

    def _candidate_text(
        self,
        candidate: dict[str, Any],
        resume: dict[str, Any] | None,
        job: dict[str, Any],
    ) -> str:
        text = self._build_resume_text(resume)
        if text:
            return text
        return " ".join(
            part
            for part in [
                self._user_name(candidate),
                str(job.get("title") or ""),
                str(job.get("description") or ""),
            ]
            if part
        )

    def _job_skill_report(self, candidate_text: str, job_id: int) -> dict[str, Any]:
        skills = self._job_skills(job_id)
        if not skills:
            return {
                "report": [],
                "detected": [],
                "partial": [],
                "missing": [],
                "strengths": build_candidate_strengths(candidate_text, []),
                "gaps": build_candidate_gaps([], candidate_text),
            }
        try:
            return build_skill_report(candidate_text, skills)
        except Exception:
            return {
                "report": [],
                "detected": [],
                "partial": [],
                "missing": [skill["name"] for skill in skills if skill.get("is_required")],
                "strengths": build_candidate_strengths(candidate_text, []),
                "gaps": build_candidate_gaps([], candidate_text),
            }

    def _score_overall_match(
        self,
        candidate_text: str,
        job_description: str,
        ai_analysis: dict[str, Any],
        skill_report: dict[str, Any],
    ) -> float:
        ai_score = self._float(ai_analysis.get("overall_score"))
        if ai_score > 0:
            return ai_score
        similarity = calculate_similarity(job_description, candidate_text)
        return score_job_fit(
            similarity,
            float(skill_report.get("required_coverage") or 0.0),
            float(skill_report.get("optional_coverage") or 0.0),
        )

    def _load_resume(self, application: dict[str, Any]) -> dict[str, Any] | None:
        resume_id = application.get("resume_id")
        if resume_id is None:
            return None
        row = (
            self.db.execute(select(Resume.__table__).where(Resume.__table__.c.resume_id == resume_id))
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def _load_ai_analysis(self, application_id: int) -> dict[str, Any]:
        row = (
            self.db.execute(
                select(AIAnalysis.__table__).where(AIAnalysis.__table__.c.application_id == application_id)
            )
            .mappings()
            .first()
        )
        return dict(row) if row else {}

    def _job_skills(self, job_id: int) -> list[dict[str, Any]]:
        statement = (
            select(
                Skill.__table__.c.name,
                JobSkill.__table__.c.is_required,
            )
            .select_from(
                JobSkill.__table__.join(
                    Skill.__table__, Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id
                )
            )
            .where(JobSkill.__table__.c.job_id == job_id)
            .order_by(JobSkill.__table__.c.is_required.desc(), Skill.__table__.c.name)
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _get_application(self, candidate_id: UUID, job_id: int) -> dict[str, Any]:
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

    def _get_application_by_id(self, application_id: int) -> dict[str, Any]:
        row = (
            self.db.execute(
                select(Application.__table__).where(Application.__table__.c.application_id == application_id)
            )
            .mappings()
            .first()
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate application not found.")
        return dict(row)

    def _get_job(self, job_id: int) -> dict[str, Any]:
        job = self.job_repo.get_by_id(job_id)
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
        return job

    def _get_user(self, user_id: UUID) -> dict[str, Any]:
        row = (
            self.db.execute(select(User.__table__).where(User.__table__.c.user_id == user_id))
            .mappings()
            .first()
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return dict(row)

    def _resolve_user(self, user_id: UUID) -> dict[str, Any]:
        return self._get_user(user_id)

    def _can_view_job(self, job: dict[str, Any], current_user: CurrentUserResponse) -> bool:
        role = str(current_user.role_name or "").casefold()
        if role == "admin":
            return True
        if role == "candidate":
            return True
        membership = self.db.execute(
            select(Job.__table__.c.job_id)
            .select_from(
                Job.__table__.join(
                    self._company_user_table(),
                    self._company_user_table().c.company_id == Job.__table__.c.company_id,
                )
            )
            .where(
                Job.__table__.c.job_id == job["job_id"],
                self._company_user_table().c.user_id == current_user.user_id,
            )
        ).first()
        return membership is not None

    def _assert_can_manage_job(self, job: dict[str, Any], current_user: CurrentUserResponse) -> None:
        role = str(current_user.role_name or "").casefold()
        if role == "admin":
            return
        membership = self.db.execute(
            select(self._company_user_table().c.id).where(
                self._company_user_table().c.company_id == job["company_id"],
                self._company_user_table().c.user_id == current_user.user_id,
            )
        ).first()
        if membership is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    def _company_user_table(self):
        from app.models.company_user import CompanyUser

        return CompanyUser.__table__

    def _guide_from_state(self, state: dict[str, Any]) -> InterviewGuideSnapshot:
        guide = state.get("guide")
        if guide:
            return InterviewGuideSnapshot.model_validate(guide)
        return InterviewGuideSnapshot(
            interview_summary="Interview guide unavailable.",
            candidate_strengths=[],
            candidate_risks=[],
            recommended_focus_areas=[],
            overall_interview_plan=[],
            overall_match=0.0,
        )

    def _normalize_interview_type(self, value: InterviewType | str) -> str:
        normalized = str(value or "Online").strip().casefold()
        mapping = {
            "on-site": "On-site",
            "onsite": "On-site",
            "online": "Online",
            "video": "Online",
            "phone": "Phone",
            "technical": "Technical",
            "hr": "HR",
            "final": "Final",
        }
        return mapping.get(normalized, "Online")

    def _normalize_status(self, value: str) -> InterviewStatus:
        normalized = str(value or "Scheduled").strip().casefold()
        mapping = {
            "scheduled": "Scheduled",
            "rescheduled": "Rescheduled",
            "completed": "Completed",
            "cancelled": "Cancelled",
            "canceled": "Cancelled",
            "no show": "No Show",
            "no-show": "No Show",
            "noshow": "No Show",
        }
        return mapping.get(normalized, "Scheduled")

    def _combine_datetime(self, interview_date: date, interview_time: str) -> datetime:
        hour, minute = self._parse_time(interview_time)
        return datetime(
            interview_date.year,
            interview_date.month,
            interview_date.day,
            hour,
            minute,
            tzinfo=timezone.utc,
        )

    def _parse_time(self, value: str) -> tuple[int, int]:
        text = clean_text(value, "Interview time", max_length=32).lower().replace(" ", "")
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

    def _format_time_string(self, scheduled_at: datetime) -> str:
        return scheduled_at.strftime("%I:%M %p").lstrip("0")

    def _assert_future_schedule(self, scheduled_at: datetime) -> None:
        if scheduled_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Interview date and time must be in the future.",
            )

    def _parse_state_datetime(self, value: Any) -> datetime:
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if value is None:
            return datetime.now(timezone.utc)
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return datetime.now(timezone.utc)
            parsed = datetime.fromisoformat(text)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        raise InterviewSchedulerValidationError("Invalid datetime value.")

    def _parse_iso_date(self, value: Any) -> date:
        if isinstance(value, date):
            return value
        if isinstance(value, str) and value:
            return date.fromisoformat(value[:10])
        raise InterviewSchedulerValidationError("Invalid interview date.")

    def _to_iso(self, value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        return str(value)

    def _timeline_message(self, state: dict[str, Any]) -> str:
        return (
            f"{state.get('status')} interview for {state.get('candidate_name')} "
            f"scheduled on {state.get('interview_date')} at {state.get('interview_time')}."
        )

    def _user_name(self, value: Mapping[str, Any] | CurrentUserResponse | None) -> str:
        if value is None:
            return "SmartHire System"
        if isinstance(value, CurrentUserResponse):
            first = str(value.first_name or "").strip()
            last = str(value.last_name or "").strip()
            return " ".join(part for part in [first, last] if part).strip() or str(value.email)
        first = str(value.get("first_name") or "").strip()
        last = str(value.get("last_name") or "").strip()
        return " ".join(part for part in [first, last] if part).strip() or str(value.get("email") or "SmartHire System")

    def _system_user(self) -> CurrentUserResponse:
        now = datetime.now(timezone.utc)
        return CurrentUserResponse(
            user_id=UUID("00000000-0000-0000-0000-000000000000"),
            role_id=0,
            role_name="System",
            first_name="SmartHire",
            last_name="System",
            email="system@smarthire.ai",
            phone=None,
            profile_picture_url=None,
            city=None,
            country=None,
            linkedin_url=None,
            github_url=None,
            portfolio_url=None,
            created_at=now,
            updated_at=now,
        )

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        base = Path(report_root) if report_root else Path(self.settings.report_folder)
        if not base.is_absolute():
            base = Path(__file__).resolve().parents[2] / base
        base.mkdir(parents=True, exist_ok=True)
        return base

    def _float(self, value: Any) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    def _log_timing(self, operation: str, started: float, **context: Any) -> None:
        details = " ".join(f"{key}={value}" for key, value in context.items() if value is not None)
        logger.info(
            "%s duration_ms=%.1f%s",
            operation,
            (perf_counter() - started) * 1000,
            f" {details}" if details else "",
        )

    def _slugify(self, value: str) -> str:
        text = clean_text(value, "Filename", max_length=255)
        text = "".join(char if char.isalnum() else "_" for char in text)
        while "__" in text:
            text = text.replace("__", "_")
        return text.strip("_").lower() or "interview"
