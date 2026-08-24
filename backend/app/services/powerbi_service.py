from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
import csv
import json
from pathlib import Path
from statistics import mean
from typing import Any, Literal, Mapping, Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.ml.analytics_engine import AnalyticsEngine
from app.models.application import AIAnalysis, Application, RecruiterNote
from app.models.certificate import Certificate
from app.models.interview import Interview
from app.models.job import Job, JobSkill
from app.models.resume import Education, Language, Resume, UserLanguage, WorkExperience
from app.models.resume_skill import ResumeSkill
from app.models.skill import Skill
from app.models.user import User
from app.repositories.job_dashboard_repository import JobDashboardRepository
from app.services.analytics_service import AnalyticsService
from app.services.job_skill_service import JobSkillService
from app.services.nlp_matcher import calculate_similarity, score_job_fit

PowerBIExportFormat = Literal["csv", "json", "powerbi"]


@dataclass(frozen=True)
class PowerBiTable:
    name: str
    columns: list[str]
    rows: list[dict[str, Any]]

    def model_dump(self) -> dict[str, Any]:
        return asdict(self)


class PowerBIServiceError(RuntimeError):
    """Base error for executive analytics preparation."""


class PowerBIExportError(PowerBIServiceError):
    """Raised when an export format or dataset is invalid."""


class PowerBIService:
    """Builds flat, Power BI-friendly recruitment datasets.

    Dataset contract:
    - Each table is intentionally flat and column-stable.
    - `powerbi` export returns a bundle of named tables, suitable for
      mapping into separate Power BI queries or SQL views.
    - CSV/JSON export returns one table at a time so column order stays stable.
    """

    def __init__(
        self,
        db: Session,
        *,
        report_root: str | Path | None = None,
        analytics_service: AnalyticsService | None = None,
        job_skill_service: JobSkillService | None = None,
    ) -> None:
        self.db = db
        self.settings = get_settings()
        self.report_root = self._resolve_report_root(report_root)
        self.workflow_root = self.report_root / "workflow"
        self.workflow_root.mkdir(parents=True, exist_ok=True)
        self.analytics_service = analytics_service or AnalyticsService(db)
        self.job_skill_service = job_skill_service or JobSkillService(db)
        self.job_dashboard_repo = JobDashboardRepository(db)
        self.analytics_engine = AnalyticsEngine()

    def executive(self, current_user: Any) -> dict[str, Any]:
        self._require_admin(current_user)
        applications = self._application_rows()
        ai_scores = [float(row.get("overall_score") or 0) for row in applications if row.get("overall_score") is not None]
        status_counts = Counter(self._normalize_status(row.get("status")) for row in applications)
        emails = self._email_logs()
        audits = self._audit_logs()
        pdf_documents = [entry for entry in audits if entry.get("generated_document")]
        return {
            "generated_at": self._timestamp(),
            "kpis": {
                "total_applications": len(applications),
                "accepted": status_counts.get("accepted", 0),
                "rejected": status_counts.get("rejected", 0),
                "interview": status_counts.get("interview_scheduled", 0),
                "hold": status_counts.get("on_hold", 0),
                "average_match_score": round(mean(ai_scores), 2) if ai_scores else 0.0,
                "highest_match_score": round(max(ai_scores), 2) if ai_scores else 0.0,
                "lowest_match_score": round(min(ai_scores), 2) if ai_scores else 0.0,
                "applications_today": self._applications_in_window(days=0),
                "applications_this_week": self._applications_in_window(days=7),
                "applications_this_month": self._applications_in_window(days=30),
                "emails_sent": sum(1 for entry in emails if entry.get("status") == "sent"),
                "pdf_documents_generated": len(pdf_documents),
            },
            "funnel": self._funnel_table().model_dump(),
            "powerbi": self.powerbi_dataset(current_user).model_dump(),
        }

    def funnel(self, current_user: Any) -> dict[str, Any]:
        self._require_admin(current_user)
        return self._funnel_table().model_dump()

    def jobs(self, current_user: Any) -> dict[str, Any]:
        self._require_admin(current_user)
        return self._jobs_table().model_dump()

    def skills(self, current_user: Any) -> dict[str, Any]:
        self._require_admin(current_user)
        return self._skills_bundle()

    def recruiters(self, current_user: Any) -> dict[str, Any]:
        self._require_admin(current_user)
        return self._recruiters_table().model_dump()

    def education(self, current_user: Any) -> dict[str, Any]:
        self._require_admin(current_user)
        return self._education_table().model_dump()

    def ai(self, current_user: Any) -> dict[str, Any]:
        self._require_admin(current_user)
        return self._ai_table().model_dump()

    def workflow(self, current_user: Any) -> dict[str, Any]:
        self._require_admin(current_user)
        return self._workflow_table().model_dump()

    def powerbi_dataset(self, current_user: Any) -> PowerBiTable:
        self._require_admin(current_user)
        tables = [
            self._executive_table(),
            self._funnel_table(),
            self._jobs_table(),
            *self._skill_tables(),
            self._education_table(),
            self._recruiters_table(),
            self._ai_table(),
            self._email_table(),
            self._workflow_table(),
        ]
        rows = [table.model_dump() for table in tables]
        return PowerBiTable(
            name="powerbi_dataset",
            columns=["name", "columns", "rows"],
            rows=rows,
        )

    def export(
        self,
        current_user: Any,
        *,
        report_format: PowerBIExportFormat = "json",
        dataset: str = "powerbi",
    ) -> tuple[bytes, str, str]:
        self._require_admin(current_user)
        if report_format not in {"csv", "json", "powerbi"}:
            raise PowerBIExportError("Unsupported export format.")
        if report_format == "powerbi":
            payload = self.powerbi_dataset(current_user).model_dump()
            return (
                json.dumps(payload, default=str, indent=2).encode("utf-8"),
                "application/json",
                "powerbi_dataset.json",
            )

        if dataset.casefold() == "powerbi":
            dataset = "executive_kpis"
        table = self._dataset_lookup(dataset)
        if table is None:
            raise PowerBIExportError(f"Unknown dataset '{dataset}'.")
        if report_format == "json":
            payload = {
                "generated_at": self._timestamp(),
                "dataset": table.name,
                "columns": table.columns,
                "rows": table.rows,
            }
            filename = f"{table.name}.json"
            return json.dumps(payload, default=str, indent=2).encode("utf-8"), "application/json", filename
        if report_format == "csv":
            output = []
            from io import StringIO

            buffer = StringIO()
            writer = csv.DictWriter(buffer, fieldnames=table.columns)
            writer.writeheader()
            writer.writerows(table.rows)
            output_bytes = buffer.getvalue().encode("utf-8")
            return output_bytes, "text/csv", f"{table.name}.csv"
        raise PowerBIExportError("Unsupported export format.")

    def _executive_table(self) -> PowerBiTable:
        applications = self._application_rows()
        ai_scores = [float(row.get("overall_score") or 0) for row in applications if row.get("overall_score") is not None]
        status_counts = Counter(self._normalize_status(row.get("status")) for row in applications)
        emails = self._email_logs()
        audits = self._audit_logs()
        row = {
            "total_applications": len(applications),
            "accepted": status_counts.get("accepted", 0),
            "rejected": status_counts.get("rejected", 0),
            "interview": status_counts.get("interview_scheduled", 0),
            "hold": status_counts.get("on_hold", 0),
            "average_match_score": round(mean(ai_scores), 2) if ai_scores else 0.0,
            "highest_match_score": round(max(ai_scores), 2) if ai_scores else 0.0,
            "lowest_match_score": round(min(ai_scores), 2) if ai_scores else 0.0,
            "applications_today": self._applications_in_window(days=0),
            "applications_this_week": self._applications_in_window(days=7),
            "applications_this_month": self._applications_in_window(days=30),
            "emails_sent": sum(1 for entry in emails if entry.get("status") == "sent"),
            "pdf_documents_generated": sum(1 for entry in audits if entry.get("generated_document")),
        }
        return PowerBiTable(
            name="executive_kpis",
            columns=list(row.keys()),
            rows=[row],
        )

    def _funnel_table(self) -> PowerBiTable:
        applications = self._application_rows()
        ai_reviewed = sum(1 for row in applications if row.get("overall_score") is not None)
        recruiter_reviewed = len(self._audit_logs())
        interviews = sum(1 for row in applications if self._normalize_status(row.get("status")) == "interview_scheduled")
        accepted = sum(1 for row in applications if self._normalize_status(row.get("status")) == "accepted")
        rejected = sum(1 for row in applications if self._normalize_status(row.get("status")) == "rejected")
        rows = [
            {"stage": "Applied", "count": len(applications)},
            {"stage": "AI Reviewed", "count": ai_reviewed},
            {"stage": "Recruiter Reviewed", "count": recruiter_reviewed},
            {"stage": "Interview", "count": interviews},
            {"stage": "Accepted", "count": accepted},
            {"stage": "Rejected", "count": rejected},
        ]
        return PowerBiTable(name="hiring_funnel", columns=["stage", "count"], rows=rows)

    def _jobs_table(self) -> PowerBiTable:
        applications = self._application_rows()
        rows: list[dict[str, Any]] = []
        by_job: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for row in applications:
            by_job[int(row["job_id"])].append(row)
        for job_id, items in sorted(by_job.items()):
            total = len(items)
            scores = [float(item.get("overall_score") or 0) for item in items if item.get("overall_score") is not None]
            accepted = sum(1 for item in items if self._normalize_status(item.get("status")) == "accepted")
            rejected = sum(1 for item in items if self._normalize_status(item.get("status")) == "rejected")
            interviews = sum(1 for item in items if self._normalize_status(item.get("status")) == "interview_scheduled")
            rows.append(
                {
                    "job_id": job_id,
                    "job_title": items[0]["job_title"],
                    "applications": total,
                    "average_match": round(mean(scores), 2) if scores else 0.0,
                    "accepted": accepted,
                    "rejected": rejected,
                    "interview_rate": round((interviews / total) * 100, 2) if total else 0.0,
                    "acceptance_rate": round((accepted / total) * 100, 2) if total else 0.0,
                }
            )
        return PowerBiTable(
            name="position_analytics",
            columns=["job_id", "job_title", "applications", "average_match", "accepted", "rejected", "interview_rate", "acceptance_rate"],
            rows=rows,
        )

    def _skill_tables(self) -> list[PowerBiTable]:
        detected = Counter()
        for row in self._resume_skill_rows():
            detected[row["skill_name"]] += 1
        missing = Counter()
        coverage_required: list[float] = []
        coverage_optional: list[float] = []
        match_distribution = Counter()
        applications = self._application_rows()
        detected_by_user = self._detected_skill_map()
        job_skills = self._job_skill_map()
        for application in applications:
            required, optional = job_skills.get(application["job_id"], ([], []))
            user_skills = detected_by_user.get(application["user_id"], set())
            if required:
                coverage_required.append((len(set(required) & user_skills) / len(required)) * 100)
            if optional:
                coverage_optional.append((len(set(optional) & user_skills) / len(optional)) * 100)
            for skill in required:
                if skill not in user_skills:
                    missing[skill] += 1
            score = float(application.get("skills_score") or 0)
            bucket = self._distribution_bucket(score)
            match_distribution[bucket] += 1

        return [
            PowerBiTable(
                name="top_detected_skills",
                columns=["skill", "count"],
                rows=[{"skill": skill, "count": count} for skill, count in detected.most_common(20)],
            ),
            PowerBiTable(
                name="top_missing_skills",
                columns=["skill", "count"],
                rows=[{"skill": skill, "count": count} for skill, count in missing.most_common(20)],
            ),
            PowerBiTable(
                name="skill_coverage",
                columns=["metric", "value"],
                rows=[
                    {"metric": "required_skill_coverage", "value": round(mean(coverage_required), 2) if coverage_required else 0.0},
                    {"metric": "optional_skill_coverage", "value": round(mean(coverage_optional), 2) if coverage_optional else 0.0},
                    {"metric": "skill_frequency", "value": float(sum(detected.values()))},
                ],
            ),
            PowerBiTable(
                name="skill_match_distribution",
                columns=["bucket", "count"],
                rows=[{"bucket": bucket, "count": count} for bucket, count in sorted(match_distribution.items())],
            ),
        ]

    def _skills_bundle(self) -> dict[str, Any]:
        tables = [table.model_dump() for table in self._skill_tables()]
        return {"generated_at": self._timestamp(), "tables": tables}

    def _education_table(self) -> PowerBiTable:
        universities = Counter()
        degrees = Counter()
        certificates = Counter()
        languages = Counter()
        experience_levels = Counter()
        for row in self._education_rows():
            if row.get("institution"):
                universities[str(row["institution"])] += 1
            if row.get("degree"):
                degrees[str(row["degree"])] += 1
        for row in self._certificate_rows():
            if row.get("title"):
                certificates[str(row["title"])] += 1
        for row in self._language_rows():
            if row.get("language_name"):
                languages[str(row["language_name"])] += 1
        for bucket, count in self._experience_level_distribution().items():
            experience_levels[bucket] += count
        rows = [
            {"category": "universities", "label": label, "count": count}
            for label, count in universities.most_common(20)
        ]
        rows.extend({"category": "degrees", "label": label, "count": count} for label, count in degrees.most_common(20))
        rows.extend({"category": "certificates", "label": label, "count": count} for label, count in certificates.most_common(20))
        rows.extend({"category": "languages", "label": label, "count": count} for label, count in languages.most_common(20))
        rows.extend({"category": "experience_levels", "label": label, "count": count} for label, count in experience_levels.most_common())
        return PowerBiTable(
            name="education_analytics",
            columns=["category", "label", "count"],
            rows=rows,
        )

    def _recruiters_table(self) -> PowerBiTable:
        audits = self._audit_logs()
        app_lookup = {row["application_id"]: row for row in self._application_rows()}
        decision_counter: dict[str, Counter] = defaultdict(Counter)
        email_sent = Counter()
        interviews = Counter()
        accepted = Counter()
        rejected = Counter()
        review_times: dict[str, list[float]] = defaultdict(list)
        for entry in audits:
            recruiter = str(entry.get("recruiter") or "Unknown")
            decision = str(entry.get("decision") or "Unknown")
            decision_counter[recruiter][decision] += 1
            if decision == "Accept":
                accepted[recruiter] += 1
            elif decision == "Reject":
                rejected[recruiter] += 1
            elif decision == "Interview":
                interviews[recruiter] += 1
            if entry.get("email_status") == "sent":
                email_sent[recruiter] += 1
            application = app_lookup.get(int(entry.get("application_id") or 0))
            if application is not None:
                created_at = self._coerce_datetime(application.get("created_at"))
                timestamp = self._coerce_datetime(entry.get("timestamp"))
                if created_at is not None and timestamp is not None:
                    review_times[recruiter].append((timestamp - created_at).total_seconds() / 3600.0)
        rows = []
        for recruiter in sorted(decision_counter):
            decisions = decision_counter[recruiter]
            rows.append(
                {
                    "recruiter": recruiter,
                    "recruiter_decisions": sum(decisions.values()),
                    "average_review_time_hours": round(mean(review_times[recruiter]), 2) if review_times[recruiter] else 0.0,
                    "emails_sent": email_sent.get(recruiter, 0),
                    "interviews_scheduled": interviews.get(recruiter, 0),
                    "accepted_candidates": accepted.get(recruiter, 0),
                    "rejected_candidates": rejected.get(recruiter, 0),
                }
            )
        return PowerBiTable(
            name="recruiter_analytics",
            columns=[
                "recruiter",
                "recruiter_decisions",
                "average_review_time_hours",
                "emails_sent",
                "interviews_scheduled",
                "accepted_candidates",
                "rejected_candidates",
            ],
            rows=rows,
        )

    def _ai_table(self) -> PowerBiTable:
        applications = self._application_rows()
        resume_similarities: list[float] = []
        skill_scores: list[float] = []
        education_scores: list[float] = []
        experience_scores: list[float] = []
        confidence_scores: list[float] = []
        recommendation_counter = Counter()
        for row in applications:
            if row.get("resume_text") and row.get("job_description"):
                resume_similarities.append(calculate_similarity(str(row["job_description"]), str(row["resume_text"])))
            if row.get("skills_score") is not None:
                skill_scores.append(float(row["skills_score"]))
            if row.get("education_score") is not None:
                education_scores.append(float(row["education_score"]))
            if row.get("experience_score") is not None:
                experience_scores.append(float(row["experience_score"]))
            if row.get("overall_score") is not None:
                confidence_scores.append(float(row["overall_score"]))
            recommendation_counter[self._recommendation_bucket(row.get("recommendations"))] += 1
        rows = [
            {"metric": "average_resume_similarity", "value": round(mean(resume_similarities), 2) if resume_similarities else 0.0},
            {"metric": "average_skill_match", "value": round(mean(skill_scores), 2) if skill_scores else 0.0},
            {"metric": "average_education_match", "value": round(mean(education_scores), 2) if education_scores else 0.0},
            {"metric": "average_experience_match", "value": round(mean(experience_scores), 2) if experience_scores else 0.0},
            {"metric": "average_confidence_score", "value": round(mean(confidence_scores), 2) if confidence_scores else 0.0},
        ]
        rows.extend({"metric": f"recommendation_{label}", "value": count} for label, count in sorted(recommendation_counter.items()))
        return PowerBiTable(
            name="ai_analytics",
            columns=["metric", "value"],
            rows=rows,
        )

    def _email_table(self) -> PowerBiTable:
        logs = self._email_logs()
        counter = Counter(entry.get("document") or "Unknown" for entry in logs)
        rows = [
            {"metric": "emails_sent", "value": sum(1 for entry in logs if entry.get("status") == "sent")},
            {"metric": "failed_emails", "value": sum(1 for entry in logs if entry.get("status") == "failed")},
            {"metric": "offer_letters", "value": counter.get("Offer of Employment", 0)},
            {"metric": "interview_invitations", "value": counter.get("Interview Invitation", 0)},
            {"metric": "rejection_letters", "value": counter.get("Application Status Notice", 0)},
            {"metric": "hold_notices", "value": counter.get("Application On Hold Notice", 0)},
        ]
        return PowerBiTable(name="email_analytics", columns=["metric", "value"], rows=rows)

    def _workflow_table(self) -> PowerBiTable:
        history = self._history_logs()
        audits = self._audit_logs()
        applications = self._application_rows()
        app_lookup = {row["application_id"]: row for row in applications}
        processing_times: list[float] = []
        completed = 0
        for entry in audits:
            application = app_lookup.get(int(entry.get("application_id") or 0))
            if application is None:
                continue
            created_at = self._coerce_datetime(application.get("created_at"))
            timestamp = self._coerce_datetime(entry.get("timestamp"))
            if created_at is not None and timestamp is not None:
                processing_times.append((timestamp - created_at).total_seconds() / 3600.0)
            if str(application.get("status") or "").lower() in {"accepted", "rejected", "interview_scheduled", "on_hold"}:
                completed += 1
        rows = [
            {"metric": "timeline_events", "value": len(history)},
            {"metric": "average_processing_time_hours", "value": round(mean(processing_times), 2) if processing_times else 0.0},
            {"metric": "workflow_completion_rate", "value": round((completed / len(applications)) * 100, 2) if applications else 0.0},
            {"metric": "audit_events", "value": len(audits)},
        ]
        return PowerBiTable(name="workflow_analytics", columns=["metric", "value"], rows=rows)

    def _dataset_lookup(self, dataset: str) -> PowerBiTable | None:
        lookup = {
            "executive": self._executive_table,
            "executive_kpis": self._executive_table,
            "funnel": self._funnel_table,
            "hiring_funnel": self._funnel_table,
            "jobs": self._jobs_table,
            "position_analytics": self._jobs_table,
            "skills": lambda: self._skill_tables()[0],
            "top_detected_skills": lambda: self._skill_tables()[0],
            "top_missing_skills": lambda: self._skill_tables()[1],
            "skill_coverage": lambda: self._skill_tables()[2],
            "skill_match_distribution": lambda: self._skill_tables()[3],
            "education": self._education_table,
            "education_analytics": self._education_table,
            "recruiters": self._recruiters_table,
            "recruiter_analytics": self._recruiters_table,
            "ai": self._ai_table,
            "ai_analytics": self._ai_table,
            "email": self._email_table,
            "email_analytics": self._email_table,
            "workflow": self._workflow_table,
            "workflow_analytics": self._workflow_table,
        }
        builder = lookup.get(dataset.casefold())
        return builder() if builder is not None else None

    def _application_rows(self) -> list[dict[str, Any]]:
        statement = (
            select(
                Application.__table__.c.application_id,
                Application.__table__.c.user_id,
                Application.__table__.c.job_id,
                Application.__table__.c.status,
                Application.__table__.c.created_at,
                Job.__table__.c.title.label("job_title"),
                Job.__table__.c.description.label("job_description"),
                Job.__table__.c.experience_level,
                User.__table__.c.first_name,
                User.__table__.c.last_name,
                User.__table__.c.email,
                AIAnalysis.__table__.c.overall_score,
                AIAnalysis.__table__.c.skills_score,
                AIAnalysis.__table__.c.education_score,
                AIAnalysis.__table__.c.experience_score,
                AIAnalysis.__table__.c.certificate_score,
                AIAnalysis.__table__.c.recommendations,
                Resume.__table__.c.parsed_text.label("resume_text"),
            )
            .select_from(
                Application.__table__.join(
                    Job.__table__, Job.__table__.c.job_id == Application.__table__.c.job_id
                )
                .join(
                    User.__table__, User.__table__.c.user_id == Application.__table__.c.user_id
                )
                .outerjoin(
                    AIAnalysis.__table__,
                    AIAnalysis.__table__.c.application_id == Application.__table__.c.application_id,
                )
                .outerjoin(
                    Resume.__table__, Resume.__table__.c.resume_id == Application.__table__.c.resume_id
                )
            )
            .order_by(Application.__table__.c.created_at.asc())
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _resume_skill_rows(self) -> list[dict[str, Any]]:
        statement = (
            select(
                ResumeSkill.__table__.c.resume_id,
                ResumeSkill.__table__.c.confidence,
                Skill.__table__.c.name.label("skill_name"),
            )
            .select_from(
                ResumeSkill.__table__.join(
                    Skill.__table__, Skill.__table__.c.skill_id == ResumeSkill.__table__.c.skill_id
                )
            )
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _job_skill_map(self) -> dict[int, tuple[list[str], list[str]]]:
        statement = (
            select(
                JobSkill.__table__.c.job_id,
                JobSkill.__table__.c.is_required,
                Skill.__table__.c.name.label("skill_name"),
            )
            .select_from(
                JobSkill.__table__.join(
                    Skill.__table__, Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id
                )
            )
        )
        mapping: dict[int, tuple[list[str], list[str]]] = defaultdict(lambda: ([], []))
        for row in self.db.execute(statement).mappings():
            job_id = int(row["job_id"])
            required, optional = mapping[job_id]
            if row["is_required"]:
                required.append(str(row["skill_name"]))
            else:
                optional.append(str(row["skill_name"]))
            mapping[job_id] = (required, optional)
        return mapping

    def _detected_skill_map(self) -> dict[Any, set[str]]:
        mapping: dict[Any, set[str]] = defaultdict(set)
        for row in self._resume_skill_rows():
            resume_id = row["resume_id"]
            user_id = self.db.scalar(select(Resume.__table__.c.user_id).where(Resume.__table__.c.resume_id == resume_id))
            if user_id is not None:
                mapping[user_id].add(str(row["skill_name"]))
        return mapping

    def _education_rows(self) -> list[dict[str, Any]]:
        statement = (
            select(Education.__table__.c.institution, Education.__table__.c.degree)
            .select_from(
                Education.__table__.join(
                    Resume.__table__, Resume.__table__.c.resume_id == Education.__table__.c.resume_id
                )
            )
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _certificate_rows(self) -> list[dict[str, Any]]:
        statement = select(Certificate.__table__.c.title).select_from(Certificate.__table__)
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _language_rows(self) -> list[dict[str, Any]]:
        statement = (
            select(Language.__table__.c.name.label("language_name"))
            .select_from(
                UserLanguage.__table__.join(
                    Language.__table__, Language.__table__.c.language_id == UserLanguage.__table__.c.language_id
                )
            )
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _experience_level_distribution(self) -> Counter:
        rows = self.db.execute(
            select(
                WorkExperience.__table__.c.resume_id,
                WorkExperience.__table__.c.start_date,
                WorkExperience.__table__.c.end_date,
            ).select_from(WorkExperience.__table__)
        ).mappings().all()
        by_resume: dict[int, list[tuple[Any, Any]]] = defaultdict(list)
        for row in rows:
            by_resume[int(row["resume_id"])].append((row["start_date"], row["end_date"]))
        counter = Counter()
        for periods in by_resume.values():
            years = self._experience_years(periods)
            counter[self._experience_bucket(years)] += 1
        return counter

    def _email_logs(self) -> list[dict[str, Any]]:
        return self._load_jsonl(self.workflow_root / "email_log.jsonl")

    def _audit_logs(self) -> list[dict[str, Any]]:
        return self._load_jsonl(self.workflow_root / "audit_log.jsonl")

    def _history_logs(self) -> list[dict[str, Any]]:
        return self._load_jsonl(self.workflow_root / "workflow_history.jsonl")

    def _load_jsonl(self, path: Path) -> list[dict[str, Any]]:
        if not path.exists():
            return []
        records: list[dict[str, Any]] = []
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return records

    def _applications_in_window(self, *, days: int) -> int:
        now = datetime.now(timezone.utc)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if days > 0:
            start = start - timedelta(days=days - 1)
        count = 0
        for row in self._application_rows():
            created_at = self._coerce_datetime(row.get("created_at"))
            if created_at is None:
                continue
            if created_at >= start:
                count += 1
        return count

    def _experience_years(self, periods: Sequence[tuple[Any, Any]]) -> float:
        total_days = 0.0
        for start, end in periods:
            start_dt = self._coerce_date(start)
            end_dt = self._coerce_date(end) or datetime.now(timezone.utc).date()
            if start_dt is None:
                continue
            total_days += max((end_dt - start_dt).days, 0)
        return total_days / 365.0

    def _experience_bucket(self, years: float) -> str:
        if years < 2:
            return "Entry"
        if years < 5:
            return "Junior"
        if years < 8:
            return "Mid"
        return "Senior"

    def _recommendation_bucket(self, text: Any) -> str:
        lowered = str(text or "").casefold()
        if not lowered:
            return "Unspecified"
        if any(keyword in lowered for keyword in ("interview", "offer", "hire", "accept")):
            return "Positive"
        if any(keyword in lowered for keyword in ("reject", "decline", "hold")):
            return "Negative"
        return "Review"

    def _distribution_bucket(self, score: float) -> str:
        if score < 20:
            return "0-19"
        if score < 40:
            return "20-39"
        if score < 60:
            return "40-59"
        if score < 80:
            return "60-79"
        return "80-100"

    def _normalize_status(self, status_value: Any) -> str:
        value = str(status_value or "").casefold()
        if value in {"accepted", "accept"}:
            return "accepted"
        if value in {"rejected", "reject"}:
            return "rejected"
        if value in {"interview_scheduled", "interview"}:
            return "interview_scheduled"
        if value in {"on_hold", "hold"}:
            return "on_hold"
        return value or "submitted"

    def _require_admin(self, current_user: Any) -> None:
        if getattr(current_user, "role_name", None) != "Admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    def _admin_user(self) -> Any:
        return type("_Admin", (), {"role_name": "Admin"})()

    def _coerce_datetime(self, value: Any) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        try:
            parsed = datetime.fromisoformat(str(value))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    def _coerce_date(self, value: Any) -> datetime.date | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        try:
            return datetime.fromisoformat(str(value)).date()
        except ValueError:
            return None

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        base = Path(report_root) if report_root else Path(self.settings.report_folder)
        if not base.is_absolute():
            base = Path(__file__).resolve().parents[2] / base
        base.mkdir(parents=True, exist_ok=True)
        return base

    def _timestamp(self) -> str:
        return datetime.now(timezone.utc).isoformat()
