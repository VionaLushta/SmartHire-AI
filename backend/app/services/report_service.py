from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import date, datetime, time, timezone
from pathlib import Path
from statistics import mean
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import exists, func, literal, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.ml.analytics_engine import AnalyticsEngine
from app.models.application import AIAnalysis, Application
from app.models.interview import Interview
from app.models.job import Department, Job, JobSkill
from app.models.resume import Resume
from app.models.resume_skill import ResumeSkill
from app.models.skill import Skill
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.schemas.reports import ReportFilters, ReportOption, ReportPoint, ReportRecord


class ReportService:
    def __init__(self, db: Session, *, report_root: str | Path | None = None) -> None:
        self.db = db
        self.settings = get_settings()
        self.report_root = self._resolve_report_root(report_root)
        self.exports_root = self.report_root / "exports"
        self.exports_root.mkdir(parents=True, exist_ok=True)
        self.registry_path = self.report_root / "reports_registry.json"
        self.analytics_engine = AnalyticsEngine()
        self._cache: dict[str, Any] = {}

    def list_reports(self, current_user: CurrentUserResponse) -> list[ReportRecord]:
        self._require_admin(current_user)
        self._ensure_seeded(current_user)
        return [self._to_record(item) for item in self._load_registry()]

    def analytics(self, current_user: CurrentUserResponse, filters: ReportFilters) -> dict[str, Any]:
        self._require_admin(current_user)
        rows = self._application_rows(filters)
        charts = self._build_charts(rows)
        ai_analytics = self._build_ai_analytics(rows)
        kpis = self._build_kpis(rows, filters)
        summary = self._build_summary(kpis, charts, ai_analytics, filters)
        return {
            "generated_at": datetime.now(timezone.utc),
            "filters": filters,
            "kpis": kpis,
            "charts": charts,
            "ai_analytics": ai_analytics,
            "filter_options": self._filter_options(),
            "summary": summary,
            "recent_applications": self._recent_applications(rows),
        }

    @staticmethod
    def _recent_applications(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                "application_id": int(row["application_id"]),
                "candidate_name": row.get("candidate_name") or "Candidate",
                "job_title": row.get("job_title") or "Untitled job",
                "location": row.get("location") or "Unknown",
                "overall_score": row.get("overall_score"),
                "created_at": row.get("created_at"),
                "status": row.get("status"),
            }
            for row in sorted(rows, key=lambda item: item.get("created_at") or datetime.min, reverse=True)[:10]
        ]

    def export_report(
        self,
        current_user: CurrentUserResponse,
        *,
        report_format: str,
        filters: ReportFilters,
    ) -> tuple[bytes, str, str, ReportRecord]:
        self._require_admin(current_user)
        analytics = self.analytics(current_user, filters)
        dashboard = {
            "metrics": analytics["kpis"],
            "funnel": analytics["charts"]["hiring_funnel"],
        }
        content, media_type, _ = self.analytics_engine.export(dashboard, report_format)
        filename = self._filename("reports", report_format)
        artifact = self._save_report(
            report_name="Executive Summary",
            type_name=report_format.upper(),
            file_name=filename,
            content=content,
            source="live export",
            filters=filters.model_dump(mode="json", exclude_none=True),
        )
        return content, media_type, filename, self._to_record(artifact)

    def download_report(self, current_user: CurrentUserResponse, report_id: str) -> Path:
        self._require_admin(current_user)
        artifact = self._find_report(report_id)
        if artifact is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
        path = Path(artifact["file_path"])
        if not path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file is missing.")
        return path

    def delete_report(self, current_user: CurrentUserResponse, report_id: str) -> None:
        self._require_admin(current_user)
        registry = self._load_registry()
        remaining: list[dict[str, Any]] = []
        removed: dict[str, Any] | None = None
        for item in registry:
            if str(item.get("report_id")) == report_id:
                removed = item
                continue
            remaining.append(item)
        if removed is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
        path = Path(str(removed.get("file_path") or ""))
        if path.exists():
            path.unlink()
        self._save_registry(remaining)

    def _build_kpis(self, rows: list[dict[str, Any]], filters: ReportFilters) -> dict[str, Any]:
        total = len(rows)
        active_jobs = self._count_active_jobs(filters)
        interviews = sum(1 for row in rows if row.get("has_interview"))
        hired = sum(1 for row in rows if self._normalize_status(row.get("status")) in {"accepted", "hired", "offer"})
        rejected = sum(1 for row in rows if self._normalize_status(row.get("status")) == "rejected")
        scores = [float(row["overall_score"]) for row in rows if row.get("overall_score") is not None]
        status_counts = Counter(self._normalize_status(row.get("status")) for row in rows)
        return {
            "total_applications": total,
            "active_jobs": active_jobs,
            "interviews": interviews,
            "hired": hired,
            "rejected": rejected,
            "average_match_score": round(mean(scores), 2) if scores else 0.0,
            "highest_match_score": max(scores) if scores else 0.0,
            "pending_applications": status_counts["pending"],
            "under_review_applications": status_counts["under_review"],
            "accepted_candidates": status_counts["accepted"],
            "rejected_candidates": status_counts["rejected"],
            "hired_candidates": status_counts["hired"],
        }

    def _build_charts(self, rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        per_month: Counter[str] = Counter()
        by_department: Counter[str] = Counter()
        by_job: Counter[str] = Counter()
        by_location: Counter[str] = Counter()
        status_dist: Counter[str] = Counter()
        match_dist: Counter[str] = Counter()
        funnel: Counter[str] = Counter({"Applied": 0, "AI Reviewed": 0, "Interview": 0, "Hired": 0, "On Hold": 0, "Rejected": 0})

        for row in rows:
            created_at = row.get("created_at")
            if isinstance(created_at, datetime):
                per_month[created_at.strftime("%Y-%m")] += 1
            by_department[str(row.get("department_name") or "Unassigned")] += 1
            by_job[str(row.get("job_title") or "Untitled job")] += 1
            by_location[str(row.get("location") or "Unknown")] += 1
            normalized = self._normalize_status(row.get("status"))
            status_dist[self._status_label(normalized)] += 1
            score = row.get("overall_score")
            if score is not None:
                funnel["AI Reviewed"] += 1
                match_dist[self._score_bucket(float(score))] += 1
            if row.get("has_interview"):
                funnel["Interview"] += 1
            if normalized in {"accepted", "hired", "offer"}:
                funnel["Hired"] += 1
            elif normalized == "rejected":
                funnel["Rejected"] += 1
            elif normalized == "on_hold":
                funnel["On Hold"] += 1

        funnel["Applied"] = len(rows)
        return {
            "applications_per_month": self._to_points(per_month, sort_labels=True),
            "applications_by_department": self._to_points(by_department),
            "applications_by_job": self._to_points(by_job),
            "applications_by_location": self._to_points(by_location),
            "hiring_funnel": self._to_points(funnel, order=["Applied", "AI Reviewed", "Interview", "Hired", "On Hold", "Rejected"]),
            "candidate_status_distribution": self._to_points(status_dist),
            "ai_match_distribution": self._to_points(match_dist, order=["0-19%", "20-39%", "40-59%", "60-79%", "80-100%"]),
        }

    def _build_ai_analytics(self, rows: list[dict[str, Any]]) -> dict[str, Any]:
        top_skills: Counter[str] = Counter()
        missing_skills: Counter[str] = Counter()
        department_scores: dict[str, list[float]] = defaultdict(list)
        job_scores: dict[str, list[float]] = defaultdict(list)
        job_statuses: dict[str, list[str]] = defaultdict(list)
        skills_by_application = self._skills_by_application(rows)
        required_by_job = self._required_skills_by_job(rows)

        for row in rows:
            application_id = int(row["application_id"])
            job_id = int(row["job_id"])
            job_title = str(row.get("job_title") or "Untitled job")
            department_name = str(row.get("department_name") or "Unassigned")
            score = float(row.get("overall_score") or 0)
            department_scores[department_name].append(score)
            job_scores[job_title].append(score)
            job_statuses[job_title].append(self._normalize_status(row.get("status")))
            for skill in skills_by_application.get(application_id, set()):
                top_skills[skill] += 1
            missing = required_by_job.get(job_id, set()) - skills_by_application.get(application_id, set())
            for skill in missing:
                missing_skills[skill] += 1

        top_departments = [
            {"label": label, "value": float(len(values))}
            for label, values in sorted(department_scores.items(), key=lambda item: len(item[1]), reverse=True)
        ]
        best_performing_jobs = [
            {
                "label": label,
                "value": round(mean(values), 2),
                "description": f"{len(values)} applications, {sum(1 for status in job_statuses[label] if status in {'accepted', 'hired', 'offer'})} hires.",
            }
            for label, values in sorted(job_scores.items(), key=lambda item: mean(item[1]), reverse=True)
        ]
        hardest_jobs_to_fill = [
            {
                "label": label,
                "value": round(mean(values), 2),
                "description": f"{sum(1 for status in job_statuses[label] if status == 'rejected')} rejections and {len(values)} applications.",
            }
            for label, values in sorted(job_scores.items(), key=lambda item: mean(item[1]))
        ]
        return {
            "top_skills": self._to_points(top_skills),
            "missing_skills": self._to_points(missing_skills),
            "top_departments": top_departments,
            "best_performing_jobs": best_performing_jobs,
            "hardest_jobs_to_fill": hardest_jobs_to_fill,
        }

    def _build_summary(
        self,
        kpis: dict[str, Any],
        charts: dict[str, list[dict[str, Any]]],
        ai_analytics: dict[str, Any],
        filters: ReportFilters,
    ) -> list[str]:
        summary: list[str] = []
        dataset_label = "demo" if filters.dataset == "demo" else "live"
        if kpis.get("total_applications"):
            summary.append(f"{kpis['total_applications']} applications were analyzed from the {dataset_label} dataset.")
        if charts.get("hiring_funnel"):
            summary.append(f"The funnel, status mix, and AI match distribution are derived from the {dataset_label} recruitment dataset.")
        if ai_analytics.get("top_skills"):
            summary.append(f"{ai_analytics['top_skills'][0]['label']} is the most common detected skill.")
        if ai_analytics.get("missing_skills"):
            summary.append(f"{ai_analytics['missing_skills'][0]['label']} is the leading missing skill signal.")
        return summary or ["No report data is available yet."]

    def _application_rows(self, filters: ReportFilters) -> list[dict[str, Any]]:
        cache_key = json.dumps(filters.model_dump(mode="json", exclude_none=True), sort_keys=True, default=str)
        if cache_key in self._cache:
            return self._cache[cache_key]

        conditions = self._application_conditions(filters)
        recruiter_condition = self._recruiter_condition(filters)

        statement = (
            select(
                Application.__table__.c.application_id,
                Application.__table__.c.job_id,
                Application.__table__.c.user_id,
                Application.__table__.c.status,
                Application.__table__.c.created_at,
                User.__table__.c.first_name,
                User.__table__.c.last_name,
                User.__table__.c.city,
                User.__table__.c.country,
                Job.__table__.c.title.label("job_title"),
                Job.__table__.c.department_id,
                Department.__table__.c.name.label("department_name"),
                AIAnalysis.__table__.c.overall_score,
            )
            .select_from(
                Application.__table__
                .join(Job.__table__, Job.__table__.c.job_id == Application.__table__.c.job_id)
                .join(User.__table__, User.__table__.c.user_id == Application.__table__.c.user_id)
                .outerjoin(Department.__table__, Department.__table__.c.department_id == Job.__table__.c.department_id)
                .outerjoin(AIAnalysis.__table__, AIAnalysis.__table__.c.application_id == Application.__table__.c.application_id)
            )
            .where(*conditions)
            .order_by(Application.__table__.c.created_at.asc())
        )

        rows = [dict(row) for row in self.db.execute(statement).mappings().all()]
        if filters.recruiter_id is not None:
            rows = [row for row in rows if self._application_has_recruiter(int(row["application_id"]), filters.recruiter_id)]
        for row in rows:
            row["candidate_name"] = f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip()
            row["location"] = ", ".join(part for part in (row.get("city"), row.get("country")) if part)
            row["has_interview"] = self._has_interview(int(row["application_id"]), filters.recruiter_id if filters.recruiter_id else None)
        self._cache[cache_key] = rows
        return rows

    def _application_conditions(self, filters: ReportFilters) -> list[Any]:
        conditions: list[Any] = []
        if filters.dataset == "demo":
            conditions.append(User.__table__.c.email.like("%@demo.smarthire.local"))
        else:
            conditions.append(~User.__table__.c.email.like("%@demo.smarthire.local"))
        if filters.start_date is not None:
            conditions.append(Application.__table__.c.created_at >= datetime.combine(filters.start_date, time.min))
        if filters.end_date is not None:
            conditions.append(Application.__table__.c.created_at <= datetime.combine(filters.end_date, time.max))
        if filters.department_id is not None:
            conditions.append(Job.__table__.c.department_id == filters.department_id)
        if filters.job_id is not None:
            conditions.append(Application.__table__.c.job_id == filters.job_id)
        if filters.status:
            conditions.append(func.lower(func.coalesce(Application.__table__.c.status, "")) == filters.status.strip().lower())
        return conditions

    def _recruiter_condition(self, filters: ReportFilters):
        if filters.recruiter_id is None:
            return literal(True)
        return Interview.__table__.c.interviewer_id == filters.recruiter_id

    def _application_has_recruiter(self, application_id: int, recruiter_id: UUID) -> bool:
        statement = select(func.count()).select_from(Interview.__table__).where(
            Interview.__table__.c.application_id == application_id,
            Interview.__table__.c.interviewer_id == recruiter_id,
        )
        return bool(self.db.scalar(statement))

    def _has_interview(self, application_id: int, recruiter_id: UUID | None) -> bool:
        conditions = [Interview.__table__.c.application_id == application_id]
        if recruiter_id is not None:
            conditions.append(Interview.__table__.c.interviewer_id == recruiter_id)
        statement = select(func.count()).select_from(Interview.__table__).where(*conditions)
        return bool(self.db.scalar(statement))

    def _count_active_jobs(self, filters: ReportFilters) -> int:
        conditions: list[Any] = []
        if filters.dataset == "demo":
            conditions.append(User.__table__.c.email.like("%@demo.smarthire.local"))
        else:
            conditions.append(~User.__table__.c.email.like("%@demo.smarthire.local"))
        if filters.department_id is not None:
            conditions.append(Job.__table__.c.department_id == filters.department_id)
        if filters.job_id is not None:
            conditions.append(Job.__table__.c.job_id == filters.job_id)
        statement = select(func.count(Job.__table__.c.job_id.distinct())).select_from(
            Job.__table__
            .join(Application.__table__, Application.__table__.c.job_id == Job.__table__.c.job_id)
            .join(User.__table__, User.__table__.c.user_id == Application.__table__.c.user_id)
        ).where(
            Job.__table__.c.status.in_(("active", "open", "published")),
            *conditions,
        )
        return int(self.db.scalar(statement) or 0)

    def _skills_by_application(self, rows: list[dict[str, Any]]) -> dict[int, set[str]]:
        if not rows:
            return {}
        application_ids = [int(row["application_id"]) for row in rows]
        statement = (
            select(Application.__table__.c.application_id, Skill.__table__.c.name.label("skill_name"))
            .select_from(
                Application.__table__
                .join(Resume.__table__, Resume.__table__.c.resume_id == Application.__table__.c.resume_id)
                .join(ResumeSkill.__table__, ResumeSkill.__table__.c.resume_id == Resume.__table__.c.resume_id)
                .join(Skill.__table__, Skill.__table__.c.skill_id == ResumeSkill.__table__.c.skill_id)
            )
            .where(Application.__table__.c.application_id.in_(application_ids))
        )
        result: dict[int, set[str]] = defaultdict(set)
        for row in self.db.execute(statement).mappings().all():
            result[int(row["application_id"])].add(str(row["skill_name"]))
        return result

    def _required_skills_by_job(self, rows: list[dict[str, Any]]) -> dict[int, set[str]]:
        if not rows:
            return {}
        job_ids = sorted({int(row["job_id"]) for row in rows})
        statement = (
            select(Job.__table__.c.job_id, Skill.__table__.c.name.label("skill_name"))
            .select_from(
                Job.__table__
                .join(JobSkill.__table__, JobSkill.__table__.c.job_id == Job.__table__.c.job_id)
                .join(Skill.__table__, Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id)
            )
            .where(Job.__table__.c.job_id.in_(job_ids), JobSkill.__table__.c.is_required.is_(True))
        )
        result: dict[int, set[str]] = defaultdict(set)
        for row in self.db.execute(statement).mappings().all():
            result[int(row["job_id"])].add(str(row["skill_name"]))
        return result

    def _filter_options(self) -> dict[str, list[dict[str, str]]]:
        departments = [
            {"label": str(row["name"]), "value": str(row["department_id"])}
            for row in self.db.execute(
                select(Department.__table__.c.department_id, Department.__table__.c.name).order_by(Department.__table__.c.name)
            ).mappings().all()
        ]
        jobs = [
            {"label": str(row["title"]), "value": str(row["job_id"])}
            for row in self.db.execute(
                select(Job.__table__.c.job_id, Job.__table__.c.title).order_by(Job.__table__.c.title)
            ).mappings().all()
        ]
        recruiters = [
            {
                "label": f"{row['first_name']} {row['last_name']}",
                "value": str(row["user_id"]),
            }
            for row in self.db.execute(
                select(
                    User.__table__.c.user_id,
                    User.__table__.c.first_name,
                    User.__table__.c.last_name,
                )
                .select_from(
                    Interview.__table__.join(
                        User.__table__, User.__table__.c.user_id == Interview.__table__.c.interviewer_id
                    )
                )
                .distinct()
                .order_by(User.__table__.c.first_name, User.__table__.c.last_name)
            ).mappings().all()
        ]
        return {"departments": departments, "jobs": jobs, "recruiters": recruiters}

    def _ensure_seeded(self, current_user: CurrentUserResponse) -> None:
        if self.registry_path.exists():
            return
        seeds = [
            ("Executive Summary", "pdf"),
            ("Hiring Funnel", "csv"),
            ("AI Match Distribution", "excel"),
        ]
        for report_name, report_format in seeds:
            analytics = self.analytics(current_user, ReportFilters())
            dashboard = {"metrics": analytics["kpis"], "funnel": analytics["charts"]["hiring_funnel"]}
            content, _, _ = self.analytics_engine.export(dashboard, report_format)
            self._save_report(
                report_name=report_name,
                type_name=report_format.upper(),
                file_name=self._filename("reports", report_format),
                content=content,
                source="seeded from live data",
                filters={},
            )

    def _save_report(
        self,
        *,
        report_name: str,
        type_name: str,
        file_name: str,
        content: bytes,
        source: str,
        filters: dict[str, Any],
    ) -> dict[str, Any]:
        report_id = uuid4().hex
        path = self.exports_root / f"{report_id}_{file_name}"
        path.write_bytes(content)
        artifact = {
            "report_id": report_id,
            "report_name": report_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "type": type_name,
            "file_name": path.name,
            "file_path": str(path),
            "size_bytes": path.stat().st_size,
            "source": source,
            "filters": filters,
        }
        registry = self._load_registry()
        registry.insert(0, artifact)
        self._save_registry(registry)
        return artifact

    def _load_registry(self) -> list[dict[str, Any]]:
        if not self.registry_path.exists():
            return []
        try:
            payload = json.loads(self.registry_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []
        return [item for item in payload if isinstance(item, dict)]

    def _save_registry(self, items: list[dict[str, Any]]) -> None:
        self.registry_path.write_text(json.dumps(items, default=str, indent=2), encoding="utf-8")

    def _find_report(self, report_id: str) -> dict[str, Any] | None:
        for item in self._load_registry():
            if str(item.get("report_id")) == report_id:
                return item
        return None

    def _to_record(self, item: dict[str, Any]) -> ReportRecord:
        return ReportRecord(
            report_id=str(item.get("report_id")),
            report_name=str(item.get("report_name")),
            created_at=datetime.fromisoformat(str(item.get("created_at"))),
            type=str(item.get("type")),
            file_name=str(item.get("file_name")),
            download_url=f"/reports/{item.get('report_id')}/download",
            delete_url=f"/reports/{item.get('report_id')}",
            size_bytes=int(item.get("size_bytes") or 0),
            source=str(item.get("source") or "live"),
            filters=dict(item.get("filters") or {}),
        )

    @staticmethod
    def _normalize_status(value: Any) -> str:
        return str(value or "").strip().casefold().replace(" ", "_")

    @staticmethod
    def _status_label(value: str) -> str:
        return value.replace("_", " ").title() if value else "Unknown"

    @staticmethod
    def _score_bucket(score: float) -> str:
        if score < 20:
            return "0-19%"
        if score < 40:
            return "20-39%"
        if score < 60:
            return "40-59%"
        if score < 80:
            return "60-79%"
        return "80-100%"

    @staticmethod
    def _to_points(
        counter: Counter[str],
        *,
        order: list[str] | None = None,
        sort_labels: bool = False,
    ) -> list[dict[str, Any]]:
        keys = order or (sorted(counter) if sort_labels else list(counter.keys()))
        return [{"label": key, "value": float(counter.get(key, 0))} for key in keys if counter.get(key, 0) or order]

    @staticmethod
    def _filename(prefix: str, extension: str) -> str:
        extension = extension.lower().lstrip(".")
        if extension == "excel":
            extension = "xlsx"
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        return f"{prefix}_{timestamp}.{extension}"

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        base = Path(report_root) if report_root else Path(self.settings.report_folder)
        base = base.expanduser().resolve()
        base.mkdir(parents=True, exist_ok=True)
        return base

    @staticmethod
    def _require_admin(current_user: CurrentUserResponse) -> None:
        if str(getattr(current_user, "role_name", "")).casefold() != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
