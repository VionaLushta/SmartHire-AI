from __future__ import annotations

import csv
import json
import logging
import re
from dataclasses import dataclass
from datetime import date, datetime, timezone
from io import StringIO
from pathlib import Path
from statistics import mean
from time import perf_counter
from typing import Any, Iterable, Mapping, Sequence
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.validation import clean_optional_text, clean_text
from app.ml.skill_extractor import SkillExtractor
from app.models.application import AIAnalysis, Application
from app.models.certificate import Certificate, CertificateSkill
from app.models.interview import Interview, InterviewFeedback
from app.models.job import Job, JobSkill
from app.models.resume import Education, Language, Resume, UserLanguage, WorkExperience
from app.models.resume_skill import ResumeSkill
from app.models.skill import Skill
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.schemas.talent_search import (
    EducationLevel,
    ExportFormat,
    TalentPoolFavorite,
    TalentPoolFavoriteCreate,
    TalentQuickFilter,
    TalentSearchFilters,
    TalentSearchItem,
    TalentSearchResponse,
)
from app.services.audit_log_service import record_audit_event

logger = logging.getLogger("smarthire.performance")

_EDUCATION_RANK = {
    "High School": 0,
    "Associate": 1,
    "Bachelor": 2,
    "Master": 3,
    "Doctorate": 4,
    "Other": -1,
}

_STATUS_REVIEW = {"submitted", "on_hold", "interview_scheduled", "interviewed"}
_STATUS_INTERVIEW = {"scheduled", "rescheduled"}


@dataclass(frozen=True)
class _ApplicationContext:
    application_id: int
    job_id: int
    job_title: str | None
    applied_at: datetime
    application_status: str | None
    interview_status: str | None
    experience_level: str | None
    ai_match_score: float
    skills_score: float
    education_score: float
    experience_score: float
    certificate_score: float
    recruiter_rating: float | None


class TalentSearchService:
    def __init__(self, db: Session, *, report_root: str | Path | None = None) -> None:
        self.db = db
        self.settings = get_settings()
        self.skill_extractor = SkillExtractor()
        self.report_root = self._resolve_report_root(report_root)
        self.talent_root = self.report_root / "talent_search"
        self.talent_root.mkdir(parents=True, exist_ok=True)
        self.favorites_path = self.talent_root / "favorites.json"

    def search(
        self,
        current_user: CurrentUserResponse,
        filters: TalentSearchFilters,
    ) -> TalentSearchResponse:
        self._assert_recruiter_access(current_user)
        started = perf_counter()
        normalized = self._normalize_filters(filters)
        records = self._build_records(current_user, normalized)
        filtered = self._apply_filters(records, normalized)
        ordered = self._sort_records(filtered, normalized.sort_by)
        limited = ordered[: normalized.limit]
        response = TalentSearchResponse(
            generated_at=datetime.now(timezone.utc),
            total_candidates=len(filtered),
            query=normalized.query,
            smart_filter=normalized.smart_filter,
            sort_by=normalized.sort_by,
            items=[TalentSearchItem.model_validate(item) for item in limited],
        )
        logger.info(
            "talent search generated user_id=%s candidates=%s duration_ms=%.1f",
            current_user.user_id,
            len(response.items),
            (perf_counter() - started) * 1000,
        )
        record_audit_event(
            self.db,
            user_id=current_user.user_id,
            user_role=str(current_user.role_name or "Recruiter"),
            action="Talent Search",
            entity_type="TalentSearch",
            entity_id=str(current_user.user_id),
            description="Talent search executed.",
            status="Success",
            metadata={"query": normalized.query, "filter": normalized.smart_filter},
        )
        return response

    def filter(
        self,
        current_user: CurrentUserResponse,
        filters: TalentSearchFilters,
    ) -> TalentSearchResponse:
        return self.search(current_user, filters)

    def list_favorites(self, current_user: CurrentUserResponse) -> list[TalentPoolFavorite]:
        self._assert_recruiter_access(current_user)
        favorites = self._load_favorites().get(str(current_user.user_id), [])
        return [
            TalentPoolFavorite.model_validate(self._favorite_payload(current_user.user_id, item))
            for item in favorites
        ]

    def save_favorite(
        self,
        current_user: CurrentUserResponse,
        payload: TalentPoolFavoriteCreate,
    ) -> TalentPoolFavorite:
        self._assert_recruiter_access(current_user)
        data = self._load_favorites()
        owner_key = str(current_user.user_id)
        bucket = data.setdefault(owner_key, [])
        candidate_ids = self._dedupe_uuid(payload.candidate_ids)
        list_name = clean_text(payload.list_name, "List name", max_length=120)

        if payload.move_from_favorite_id is not None:
            self._move_candidates(bucket, payload.move_from_favorite_id, candidate_ids)

        existing = next(
            (
                item
                for item in bucket
                if str(item.get("list_name", "")).casefold() == list_name.casefold()
            ),
            None,
        )
        now = datetime.now(timezone.utc).isoformat()
        if existing is None:
            favorite = {
                "favorite_id": str(uuid4()),
                "owner_user_id": owner_key,
                "list_name": list_name,
                "candidate_ids": [str(candidate_id) for candidate_id in candidate_ids],
                "notes": clean_optional_text(payload.notes, "Notes", max_length=1000),
                "created_at": now,
                "updated_at": now,
            }
            bucket.append(favorite)
        else:
            existing_ids = [UUID(value) for value in existing.get("candidate_ids", [])]
            merged = self._dedupe_uuid([*existing_ids, *candidate_ids])
            existing.update(
                {
                    "candidate_ids": [str(candidate_id) for candidate_id in merged],
                    "notes": clean_optional_text(payload.notes, "Notes", max_length=1000)
                    if payload.notes is not None
                    else existing.get("notes"),
                    "updated_at": now,
                }
            )
            favorite = existing

        self._persist_favorites(data)
        return TalentPoolFavorite.model_validate(self._favorite_payload(current_user.user_id, favorite))

    def delete_favorite(self, current_user: CurrentUserResponse, favorite_id: UUID) -> None:
        self._assert_recruiter_access(current_user)
        data = self._load_favorites()
        owner_key = str(current_user.user_id)
        is_admin = str(current_user.role_name or "").casefold() == "admin"
        if is_admin:
            removed = False
            for bucket_owner, bucket in list(data.items()):
                updated_bucket = [
                    item for item in bucket if str(item.get("favorite_id")) != str(favorite_id)
                ]
                if len(updated_bucket) != len(bucket):
                    data[bucket_owner] = updated_bucket
                    removed = True
                    break
            if not removed:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite list not found.")
        else:
            bucket = data.get(owner_key, [])
            updated_bucket = [item for item in bucket if str(item.get("favorite_id")) != str(favorite_id)]
            if len(updated_bucket) == len(bucket):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite list not found.")
            data[owner_key] = updated_bucket
        self._persist_favorites(data)

    def export(
        self,
        current_user: CurrentUserResponse,
        filters: TalentSearchFilters,
        *,
        report_format: ExportFormat = "json",
    ) -> tuple[bytes, str, str]:
        response = self.search(current_user, filters)
        started = perf_counter()
        table = self._build_export_table(response)
        if report_format == "csv":
            buffer = StringIO()
            writer = csv.DictWriter(buffer, fieldnames=table["columns"])
            writer.writeheader()
            writer.writerows(table["rows"])
            content = buffer.getvalue().encode("utf-8")
            media_type = "text/csv"
            filename = "talent_search.csv"
        elif report_format == "json":
            payload = {
                "generated_at": response.generated_at.isoformat(),
                "query": response.query,
                "smart_filter": response.smart_filter,
                "sort_by": response.sort_by,
                "dataset": table,
            }
            content = json.dumps(payload, default=str, indent=2).encode("utf-8")
            media_type = "application/json"
            filename = "talent_search.json"
        elif report_format == "powerbi":
            payload = {
                "generated_at": response.generated_at.isoformat(),
                "dataset": {
                    "name": table["name"],
                    "columns": table["columns"],
                    "rows": table["rows"],
                },
            }
            content = json.dumps(payload, default=str, indent=2).encode("utf-8")
            media_type = "application/json"
            filename = "talent_search_powerbi.json"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported export format.",
            )
        logger.info(
            "talent search exported user_id=%s format=%s duration_ms=%.1f",
            current_user.user_id,
            report_format,
            (perf_counter() - started) * 1000,
        )
        record_audit_event(
            self.db,
            user_id=current_user.user_id,
            user_role=str(current_user.role_name or "Recruiter"),
            action="Talent Search Export",
            entity_type="TalentSearch",
            entity_id=str(current_user.user_id),
            description="Talent search results exported.",
            status="Success",
            metadata={"format": report_format},
        )
        return content, media_type, filename

    def _build_records(
        self,
        current_user: CurrentUserResponse,
        filters: TalentSearchFilters,
    ) -> list[dict[str, Any]]:
        favorites = self._load_favorites().get(str(current_user.user_id), [])
        favorite_lookup: dict[str, list[dict[str, Any]]] = {}
        for favorite in favorites:
            for candidate_id in favorite.get("candidate_ids", []):
                favorite_lookup.setdefault(str(candidate_id), []).append(favorite)

        user_ids = [
            row[0]
            for row in self.db.execute(
                select(Resume.__table__.c.user_id).distinct().order_by(Resume.__table__.c.user_id)
            ).all()
        ]
        records: list[dict[str, Any]] = []
        for user_id in user_ids:
            user = self._get_user(user_id)
            latest_resume = self._latest_resume(user_id)
            applications = self._applications_for_user(user_id)
            interviews = self._interviews_for_user(user_id)
            profile = self._build_profile(user, latest_resume, applications, interviews)
            query_relevance, reasons = self._query_match_score(profile, filters.query)
            talent_score = profile["talent_score"]
            if filters.query:
                talent_score = int(round(talent_score * 0.7 + query_relevance * 0.3))
            record = {
                **profile,
                "talent_score": int(max(0, min(100, talent_score))),
                "relevance_score": query_relevance,
                "search_reasons": reasons,
                "favorite_list_ids": [UUID(item["favorite_id"]) for item in favorite_lookup.get(str(user_id), [])],
                "favorite_list_names": [item["list_name"] for item in favorite_lookup.get(str(user_id), [])],
                "is_bookmarked": str(user_id) in favorite_lookup,
            }
            records.append(record)
        return records

    def _build_profile(
        self,
        user: dict[str, Any],
        latest_resume: dict[str, Any] | None,
        applications: list[_ApplicationContext],
        interviews: list[dict[str, Any]],
    ) -> dict[str, Any]:
        latest_application = applications[0] if applications else None
        resume_id = latest_resume["resume_id"] if latest_resume else None
        resume_text = self._resume_text(latest_resume)
        resume_skills = self._resume_skills(resume_id)
        extracted_skills = self._extract_skills(resume_text)
        certificate_skills = self._certificate_skills(user["user_id"])
        skills = self._dedupe_text([*extracted_skills, *resume_skills, *certificate_skills])
        certificates = self._certificates(user["user_id"])
        languages = self._languages(user["user_id"])
        education_entries = self._education_entries(resume_id)
        university, degree = self._education_profile(education_entries)
        education_level = self._education_level(education_entries)
        applied_positions = self._dedupe_text([app.job_title or "" for app in applications if app.job_title])
        application_statuses = self._dedupe_text([app.application_status or "" for app in applications if app.application_status])
        interview_statuses = self._dedupe_text([item.get("status") or "" for item in interviews if item.get("status")])
        latest_interview_status = interviews[0].get("status") if interviews else None
        recruiter_rating = latest_application.recruiter_rating if latest_application else None
        years_of_experience = self._experience_years(resume_id)
        latest_required_skills = self._job_required_skills(latest_application.job_id) if latest_application else []
        missing_skills = [
            skill
            for skill in latest_required_skills
            if skill.casefold() not in {value.casefold() for value in skills}
        ]
        ai_match_score = latest_application.ai_match_score if latest_application else 0.0
        skills_score = latest_application.skills_score if latest_application else self._profile_skill_score(skills, latest_required_skills)
        education_score = latest_application.education_score if latest_application else self._education_score(education_level)
        experience_score = latest_application.experience_score if latest_application else self._experience_score(years_of_experience, latest_application.experience_level if latest_application else None)
        certificate_score = latest_application.certificate_score if latest_application else self._certificate_score(certificates, latest_required_skills)
        interview_readiness = self._interview_readiness(ai_match_score, application_statuses, interview_statuses, missing_skills, interviews)
        base_talent_score = round(
            min(
                100.0,
                max(
                    0.0,
                    ai_match_score * 0.35
                    + skills_score * 0.20
                    + experience_score * 0.15
                    + education_score * 0.10
                    + certificate_score * 0.05
                    + interview_readiness * 0.10
                    + self._recruiter_rating_score(recruiter_rating) * 0.05,
                ),
            )
        )
        search_blob = " ".join(
            part
            for part in [
                self._user_name(user),
                user.get("email"),
                user.get("phone"),
                university,
                degree,
                " ".join(skills),
                " ".join(certificates),
                " ".join(languages),
                " ".join(applied_positions),
                " ".join(application_statuses),
                " ".join(interview_statuses),
                " ".join(str(app.experience_level or "") for app in applications),
            ]
            if part
        ).casefold()
        latest_status = latest_application.application_status if latest_application else None
        latest_applied_at = latest_application.applied_at if latest_application else None
        return {
            "candidate_id": user["user_id"],
            "candidate_name": self._user_name(user),
            "email": user["email"],
            "phone": user.get("phone"),
            "university": university,
            "degree": degree,
            "education_level": education_level,
            "skills": skills,
            "missing_skills": missing_skills,
            "certificates": certificates,
            "languages": languages,
            "applied_positions": applied_positions,
            "job_position": latest_application.job_title if latest_application else None,
            "experience_level": latest_application.experience_level if latest_application else None,
            "recruiter_status": latest_status,
            "interview_status": latest_interview_status,
            "application_status": latest_status,
            "ai_match_score": round(float(ai_match_score), 1),
            "talent_score": int(base_talent_score),
            "recruiter_rating": recruiter_rating,
            "years_of_experience": round(years_of_experience, 2),
            "application_date": latest_applied_at,
            "interview_readiness": interview_readiness,
            "search_blob": search_blob,
        }

    def _apply_filters(
        self, records: list[dict[str, Any]], filters: TalentSearchFilters
    ) -> list[dict[str, Any]]:
        inferred = self._infer_filters_from_query(filters.query or "")
        required_skills = self._dedupe_text(filters.required_skills)
        missing_skills = self._dedupe_text(filters.missing_skills)
        language = filters.language or inferred["language"]
        applied_position = filters.applied_position or inferred["applied_position"]
        education_level = filters.education_level or inferred["education_level"]
        recruiter_status = filters.recruiter_status or inferred["recruiter_status"]
        application_status = filters.application_status or inferred["application_status"]
        interview_status = filters.interview_status or inferred["interview_status"]

        smart_filter = filters.smart_filter or inferred["smart_filter"]
        if smart_filter == "top_ranked":
            records = records
        elif smart_filter == "recently_applied":
            records = records
        elif smart_filter == "interview_scheduled":
            interview_status = interview_status or "scheduled"
        elif smart_filter == "high_match":
            filters = filters.model_copy(update={"min_ai_match_score": max(filters.min_ai_match_score or 0, 90)})
        elif smart_filter == "needs_review":
            application_status = application_status or "submitted"
        elif smart_filter == "rejected":
            application_status = application_status or "rejected"
        elif smart_filter == "accepted":
            application_status = application_status or "accepted"
        elif smart_filter == "most_experienced":
            pass

        filtered: list[dict[str, Any]] = []
        for record in records:
            if filters.min_ai_match_score is not None and record["ai_match_score"] < filters.min_ai_match_score:
                continue
            if filters.min_recruiter_rating is not None:
                rating = record["recruiter_rating"]
                if rating is None or rating < filters.min_recruiter_rating:
                    continue
            if filters.min_years_of_experience is not None and record["years_of_experience"] < filters.min_years_of_experience:
                continue
            if education_level and record["education_level"] != education_level:
                continue
            if filters.certificate_count is not None and len(record["certificates"]) < filters.certificate_count:
                continue
            if language and not self._contains_text(record["languages"], language):
                continue
            if required_skills and not self._contains_all(record["skills"], required_skills):
                continue
            if missing_skills and not self._contains_all(record["missing_skills"], missing_skills):
                continue
            if applied_position and not self._contains_text(record["applied_positions"] + [record["job_position"] or ""], applied_position):
                continue
            if interview_status and not self._contains_text(
                [record["interview_status"] or "", *record.get("search_blob", "").split()],
                interview_status,
            ):
                if not self._contains_text(record["search_blob"], interview_status):
                    continue
            if recruiter_status and not self._contains_text([record["recruiter_status"] or ""], recruiter_status):
                continue
            if application_status and not self._contains_text([record["application_status"] or ""], application_status):
                continue
            if filters.application_date_from is not None and (
                record["application_date"] is None or record["application_date"].date() < filters.application_date_from
            ):
                continue
            if filters.application_date_to is not None and (
                record["application_date"] is None or record["application_date"].date() > filters.application_date_to
            ):
                continue
            if filters.query and record["relevance_score"] == 0 and not self._query_text_match(record, filters.query):
                continue
            if smart_filter == "needs_review" and not self._needs_review(record):
                continue
            if smart_filter == "interview_scheduled" and not self._has_interview_scheduled(record):
                continue
            if smart_filter == "high_match" and record["ai_match_score"] < 90:
                continue
            if smart_filter == "rejected" and not self._contains_text([record["application_status"] or ""], "rejected"):
                continue
            if smart_filter == "accepted" and not self._contains_text([record["application_status"] or ""], "accepted"):
                continue
            filtered.append(record)
        if smart_filter == "top_ranked" and filters.limit > 20:
            filtered = filtered[:20]
        return filtered

    def _sort_records(self, records: list[dict[str, Any]], sort_by: str) -> list[dict[str, Any]]:
        if sort_by == "lowest_match":
            key = lambda item: (item["talent_score"], item["candidate_name"].casefold())
            reverse = False
        elif sort_by == "newest":
            key = lambda item: (item["application_date"] or datetime.min.replace(tzinfo=timezone.utc), item["talent_score"], item["candidate_name"].casefold())
            reverse = True
        elif sort_by == "oldest":
            key = lambda item: (item["application_date"] or datetime.max.replace(tzinfo=timezone.utc), item["talent_score"], item["candidate_name"].casefold())
            reverse = False
        elif sort_by == "experience":
            key = lambda item: (item["years_of_experience"], item["talent_score"], item["candidate_name"].casefold())
            reverse = True
        elif sort_by == "education":
            key = lambda item: (_EDUCATION_RANK.get(item["education_level"], -1), item["talent_score"], item["candidate_name"].casefold())
            reverse = True
        elif sort_by == "recruiter_rating":
            key = lambda item: (item["recruiter_rating"] if item["recruiter_rating"] is not None else -1, item["talent_score"], item["candidate_name"].casefold())
            reverse = True
        elif sort_by == "interview_readiness":
            key = lambda item: (item["interview_readiness"], item["talent_score"], item["candidate_name"].casefold())
            reverse = True
        else:
            key = lambda item: (item["talent_score"], item["relevance_score"], item["candidate_name"].casefold())
            reverse = True
        return sorted(records, key=key, reverse=reverse)

    def _normalize_filters(self, filters: TalentSearchFilters) -> TalentSearchFilters:
        model = filters.model_copy()
        if model.smart_filter == "top_ranked" and model.limit > 20:
            model.limit = 20
        if model.smart_filter == "recently_applied":
            model.sort_by = "newest"
        if model.smart_filter == "most_experienced":
            model.sort_by = "experience"
        if model.smart_filter == "high_match":
            model.min_ai_match_score = max(model.min_ai_match_score or 0, 90)
        return model

    def _infer_filters_from_query(self, query: str) -> dict[str, Any]:
        cleaned = clean_optional_text(query, "Query", max_length=500) or ""
        lowered = cleaned.casefold()
        skills = self._extract_skills(cleaned)
        language = self._infer_language(lowered)
        education_level = self._infer_education_level(lowered)
        experience_level = self._infer_experience_level(lowered)
        applied_position = self._infer_applied_position(lowered)
        application_status = self._infer_status(lowered)
        smart_filter = self._infer_smart_filter(lowered)
        interview_status = "scheduled" if "interview" in lowered and "scheduled" in lowered else None
        recruiter_status = application_status
        missing_skills = []
        if "missing" in lowered or "gap" in lowered:
            missing_skills = skills
        return {
            "required_skills": skills,
            "missing_skills": missing_skills,
            "language": language,
            "education_level": education_level,
            "experience_level": experience_level,
            "applied_position": applied_position,
            "application_status": application_status,
            "recruiter_status": recruiter_status,
            "interview_status": interview_status,
            "smart_filter": smart_filter,
        }

    def _query_match_score(self, record: dict[str, Any], query: str | None) -> tuple[int, list[str]]:
        if not query:
            return 0, []
        cleaned = clean_optional_text(query, "Query", max_length=500) or ""
        lowered = cleaned.casefold()
        reasons: list[str] = []
        score = 0
        if self._contains_text([record["candidate_name"], record["email"], record.get("phone") or ""], cleaned):
            score += 25
            reasons.append("Matched candidate identity fields.")
        if self._contains_text(record["skills"], cleaned):
            score += 25
            reasons.append("Matched profile skills.")
        query_skills = self._extract_skills(cleaned)
        matched_query_skills = [skill for skill in query_skills if self._contains_text(record["skills"], skill)]
        if matched_query_skills:
            score += min(30, len(matched_query_skills) * 15)
            reasons.append(f"Matched skill(s): {', '.join(matched_query_skills[:3])}.")
        if self._contains_text(record["certificates"], cleaned):
            score += 10
            reasons.append("Matched certificates.")
        if self._contains_text(record["languages"], cleaned):
            score += 10
            reasons.append("Matched languages.")
        if self._contains_text(record["applied_positions"] + [record["job_position"] or ""], cleaned):
            score += 10
            reasons.append("Matched applied position.")
        if self._contains_text([record["education_level"], record["degree"] or "", record["university"] or ""], cleaned):
            score += 10
            reasons.append("Matched education profile.")
        if self._contains_text([record["application_status"] or "", record["interview_status"] or ""], cleaned):
            score += 10
            reasons.append("Matched hiring status.")
        if self._contains_text([record["search_blob"]], lowered):
            score += 5
        return min(100, score), self._dedupe_text(reasons)

    def _query_text_match(self, record: dict[str, Any], query: str) -> bool:
        if not query:
            return True
        cleaned = clean_optional_text(query, "Query", max_length=500) or ""
        lowered = cleaned.casefold()
        query_skills = self._extract_skills(cleaned)
        base_tokens = [
            token
            for token in re.split(r"[^a-z0-9#+]+", lowered)
            if len(token) > 2 and token not in {"with", "and", "the", "for", "from", "any", "all"}
        ]
        query_tokens = list(dict.fromkeys(
            token[:-1] if token.endswith("s") and len(token) > 4 else token
            for token in base_tokens
        ))
        return any(
            [
                self._contains_text([record["candidate_name"], record["email"], record.get("phone") or ""], cleaned),
                self._contains_text(record["skills"], cleaned),
                self._contains_text(record["certificates"], cleaned),
                self._contains_text(record["languages"], cleaned),
                self._contains_text(record["applied_positions"] + [record["job_position"] or ""], cleaned),
                self._contains_text([record["education_level"], record["degree"] or "", record["university"] or ""], cleaned),
                self._contains_text([record["application_status"] or "", record["interview_status"] or ""], cleaned),
                any(skill.casefold() in {item.casefold() for item in record["skills"]} for skill in query_skills),
                lowered in record["search_blob"],
                any(token in record["search_blob"] for token in query_tokens),
            ]
        )

    def _build_export_table(self, response: TalentSearchResponse) -> dict[str, Any]:
        columns = [
            "candidate_id",
            "candidate_name",
            "email",
            "phone",
            "university",
            "degree",
            "education_level",
            "skills",
            "missing_skills",
            "certificates",
            "languages",
            "applied_positions",
            "job_position",
            "experience_level",
            "recruiter_status",
            "interview_status",
            "application_status",
            "ai_match_score",
            "talent_score",
            "recruiter_rating",
            "years_of_experience",
            "application_date",
            "interview_readiness",
            "relevance_score",
            "favorite_list_names",
            "is_bookmarked",
            "search_reasons",
        ]
        rows = []
        for item in response.items:
            rows.append(
                {
                    "candidate_id": str(item.candidate_id),
                    "candidate_name": item.candidate_name,
                    "email": item.email,
                    "phone": item.phone,
                    "university": item.university,
                    "degree": item.degree,
                    "education_level": item.education_level,
                    "skills": "; ".join(item.skills),
                    "missing_skills": "; ".join(item.missing_skills),
                    "certificates": "; ".join(item.certificates),
                    "languages": "; ".join(item.languages),
                    "applied_positions": "; ".join(item.applied_positions),
                    "job_position": item.job_position,
                    "experience_level": item.experience_level,
                    "recruiter_status": item.recruiter_status,
                    "interview_status": item.interview_status,
                    "application_status": item.application_status,
                    "ai_match_score": item.ai_match_score,
                    "talent_score": item.talent_score,
                    "recruiter_rating": item.recruiter_rating,
                    "years_of_experience": item.years_of_experience,
                    "application_date": item.application_date,
                    "interview_readiness": item.interview_readiness,
                    "relevance_score": item.relevance_score,
                    "favorite_list_names": "; ".join(item.favorite_list_names),
                    "is_bookmarked": item.is_bookmarked,
                    "search_reasons": "; ".join(item.search_reasons),
                }
            )
        return {"name": "talent_search", "columns": columns, "rows": rows}

    def _applications_for_user(self, user_id: UUID) -> list[_ApplicationContext]:
        statement = (
            select(
                Application.__table__.c.application_id,
                Application.__table__.c.job_id,
                Job.__table__.c.title.label("job_title"),
                Job.__table__.c.experience_level,
                Application.__table__.c.created_at.label("applied_at"),
                Application.__table__.c.status.label("application_status"),
                AIAnalysis.__table__.c.overall_score,
                AIAnalysis.__table__.c.skills_score,
                AIAnalysis.__table__.c.education_score,
                AIAnalysis.__table__.c.experience_score,
                AIAnalysis.__table__.c.certificate_score,
            )
            .select_from(
                Application.__table__
                .join(Job.__table__, Job.__table__.c.job_id == Application.__table__.c.job_id)
                .outerjoin(
                    AIAnalysis.__table__,
                    AIAnalysis.__table__.c.application_id == Application.__table__.c.application_id,
                )
            )
            .where(Application.__table__.c.user_id == user_id)
            .order_by(Application.__table__.c.created_at.desc(), Application.__table__.c.application_id.desc())
        )
        applications: list[_ApplicationContext] = []
        for row in self.db.execute(statement).mappings().all():
            applications.append(
                _ApplicationContext(
                    application_id=row["application_id"],
                    job_id=row["job_id"],
                    job_title=row["job_title"],
                    applied_at=row["applied_at"],
                    application_status=row["application_status"],
                    interview_status=self._latest_interview_status(row["application_id"]),
                    experience_level=row["experience_level"],
                    ai_match_score=float(row["overall_score"] or 0),
                    skills_score=float(row["skills_score"] or 0),
                    education_score=float(row["education_score"] or 0),
                    experience_score=float(row["experience_score"] or 0),
                    certificate_score=float(row["certificate_score"] or 0),
                    recruiter_rating=self._application_recruiter_rating(row["application_id"]),
                )
            )
        return applications

    def _latest_resume(self, user_id: UUID) -> dict[str, Any] | None:
        statement = (
            select(Resume.__table__)
            .where(Resume.__table__.c.user_id == user_id)
            .order_by(Resume.__table__.c.resume_id.desc())
            .limit(1)
        )
        row = self.db.execute(statement).mappings().first()
        return dict(row) if row else None

    def _resume_text(self, resume: dict[str, Any] | None) -> str:
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

    def _get_user(self, user_id: UUID) -> dict[str, Any]:
        row = (
            self.db.execute(select(User.__table__).where(User.__table__.c.user_id == user_id))
            .mappings()
            .first()
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
        return dict(row)

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

    def _education_entries(self, resume_id: int | None) -> list[dict[str, Any]]:
        if resume_id is None:
            return []
        statement = select(
            Education.__table__.c.institution,
            Education.__table__.c.degree,
            Education.__table__.c.field_of_study,
        ).where(Education.__table__.c.resume_id == resume_id)
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _education_profile(self, entries: Sequence[dict[str, Any]]) -> tuple[str | None, str | None]:
        if not entries:
            return None, None
        top = entries[0]
        institution = str(top.get("institution") or "").strip() or None
        degree = next((str(entry.get("degree") or "").strip() for entry in entries if str(entry.get("degree") or "").strip()), None)
        if degree:
            degree = clean_text(degree, "Degree", max_length=255)
        return institution, degree

    def _education_level(self, entries: Sequence[dict[str, Any]]) -> EducationLevel:
        text = " ".join(
            str(part or "")
            for entry in entries
            for part in (entry.get("degree"), entry.get("field_of_study"), entry.get("institution"))
        ).casefold()
        if any(token in text for token in ("phd", "doctor", "doctorate")):
            return "Doctorate"
        if any(token in text for token in ("master", "msc", "ma", "m.sc", "graduate")):
            return "Master"
        if any(token in text for token in ("bachelor", "bsc", "ba", "undergraduate", "degree")):
            return "Bachelor"
        if any(token in text for token in ("associate", "diploma", "college")):
            return "Associate"
        if text:
            return "Other"
        return "Other"

    def _certificates(self, user_id: UUID) -> list[str]:
        statement = select(Certificate.__table__.c.title).where(Certificate.__table__.c.user_id == user_id)
        return self._dedupe_text(list(self.db.scalars(statement)))

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
        return self._dedupe_text(list(self.db.scalars(statement)))

    def _languages(self, user_id: UUID) -> list[str]:
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
        return self._dedupe_text(
            [
                f"{name} {proficiency}" if proficiency else str(name)
                for name, proficiency in self.db.execute(statement)
            ]
        )

    def _job_required_skills(self, job_id: int | None) -> list[str]:
        if job_id is None:
            return []
        statement = (
            select(Skill.__table__.c.name)
            .select_from(
                JobSkill.__table__.join(
                    Skill.__table__, Skill.__table__.c.skill_id == JobSkill.__table__.c.skill_id
                )
            )
            .where(JobSkill.__table__.c.job_id == job_id, JobSkill.__table__.c.is_required.is_(True))
            .order_by(Skill.__table__.c.name)
        )
        return self._dedupe_text(list(self.db.scalars(statement)))

    def _interviews_for_user(self, user_id: UUID) -> list[dict[str, Any]]:
        statement = (
            select(
                Interview.__table__.c.status,
                Interview.__table__.c.scheduled_at,
                Interview.__table__.c.interview_type,
                Interview.__table__.c.application_id,
            )
            .select_from(
                Interview.__table__.join(
                    Application.__table__,
                    Application.__table__.c.application_id == Interview.__table__.c.application_id,
                )
            )
            .where(Application.__table__.c.user_id == user_id)
            .order_by(Interview.__table__.c.scheduled_at.desc().nullslast(), Interview.__table__.c.interview_id.desc())
        )
        return [dict(row) for row in self.db.execute(statement).mappings().all()]

    def _latest_interview_status(self, application_id: int) -> str | None:
        statement = (
            select(Interview.__table__.c.status)
            .where(Interview.__table__.c.application_id == application_id)
            .order_by(Interview.__table__.c.scheduled_at.desc().nullslast(), Interview.__table__.c.interview_id.desc())
            .limit(1)
        )
        return self.db.scalar(statement)

    def _application_recruiter_rating(self, application_id: int) -> float | None:
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
        scores = [float(score) for score in self.db.scalars(statement) if score is not None]
        if not scores:
            return None
        return round(self._recruiter_rating_score(mean(scores)), 1)

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

    def _profile_skill_score(self, skills: Sequence[str], required_skills: Sequence[str]) -> float:
        if not required_skills:
            return 50.0 if skills else 25.0
        matched = sum(1 for skill in required_skills if self._contains_text(skills, skill))
        return round((matched / len(required_skills)) * 100, 1)

    def _education_score(self, education_level: EducationLevel) -> float:
        return float(
            {
                "Doctorate": 100,
                "Master": 90,
                "Bachelor": 80,
                "Associate": 70,
                "High School": 55,
                "Other": 65,
            }.get(education_level, 65)
        )

    def _experience_score(self, years: float, experience_level: str | None) -> float:
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
            return 50.0 if years else 20.0
        return round(max(20.0, min(100.0, (years / target) * 100 if years else 25.0)), 1)

    def _certificate_score(self, certificates: Sequence[str], required_skills: Sequence[str]) -> float:
        if not certificates:
            return 30.0 if required_skills else 45.0
        score = 50 + min(30, len(certificates) * 10)
        matched = sum(1 for skill in required_skills if any(skill.casefold() in certificate.casefold() for certificate in certificates))
        if matched:
            score += min(15, matched * 5)
        return float(min(100, score))

    def _recruiter_rating_score(self, recruiter_rating: float | None) -> float:
        if recruiter_rating is None:
            return 0.0
        if recruiter_rating <= 10:
            return min(100.0, recruiter_rating * 10)
        return min(100.0, recruiter_rating)

    def _interview_readiness(
        self,
        ai_match_score: float,
        application_statuses: Sequence[str],
        interview_statuses: Sequence[str],
        missing_skills: Sequence[str],
        interviews: Sequence[dict[str, Any]],
    ) -> int:
        score = 20
        if ai_match_score > 0:
            score += 20
        if any(status.casefold() in _STATUS_REVIEW for status in application_statuses):
            score += 15
        if any(status.casefold() in _STATUS_INTERVIEW for status in interview_statuses):
            score += 20
        if interviews:
            score += 10
        if not missing_skills:
            score += 15
        return int(min(100, score))

    def _needs_review(self, record: dict[str, Any]) -> bool:
        return record["application_status"] in {"submitted", "on_hold", "interview_scheduled"} or record["talent_score"] < 70

    def _has_interview_scheduled(self, record: dict[str, Any]) -> bool:
        status_value = str(record["interview_status"] or "").casefold()
        return status_value in {"scheduled", "rescheduled", "interview scheduled"}

    def _extract_skills(self, text: str) -> list[str]:
        try:
            return self._dedupe_text(list(self.skill_extractor.extract(text)["skills"]))
        except Exception:
            return []

    def _infer_language(self, text: str) -> str | None:
        for language in ("english", "spanish", "french", "german", "arabic", "polish"):
            if language in text:
                return language.title()
        return None

    def _infer_education_level(self, text: str) -> EducationLevel | None:
        if any(token in text for token in ("phd", "doctor", "doctorate")):
            return "Doctorate"
        if any(token in text for token in ("master", "msc", "ma")):
            return "Master"
        if any(token in text for token in ("bachelor", "bsc", "ba")):
            return "Bachelor"
        if any(token in text for token in ("associate", "diploma")):
            return "Associate"
        return None

    def _infer_experience_level(self, text: str) -> str | None:
        if any(token in text for token in ("senior", "lead", "principal")):
            return "Senior"
        if any(token in text for token in ("junior", "entry", "graduate", "intern")):
            return "Junior"
        if any(token in text for token in ("mid", "intermediate")):
            return "Mid"
        return None

    def _infer_applied_position(self, text: str) -> str | None:
        mapping = {
            "analyst": "Analyst",
            "designer": "Designer",
            "manager": "Manager",
            "recruiter": "Recruiter",
            "scientist": "Scientist",
            "engineer": "Engineer",
        }
        for token, label in mapping.items():
            if token in text:
                return label
        return None

    def _infer_status(self, text: str) -> str | None:
        mapping = {
            "accepted": "accepted",
            "rejected": "rejected",
            "shortlisted": "shortlisted",
            "submitted": "submitted",
            "hold": "on_hold",
            "interview": "interview_scheduled",
        }
        for token, value in mapping.items():
            if token in text:
                return value
        return None

    def _infer_smart_filter(self, text: str) -> TalentQuickFilter | None:
        if "top ranked" in text:
            return "top_ranked"
        if "recently applied" in text:
            return "recently_applied"
        if "interview scheduled" in text:
            return "interview_scheduled"
        if "high match" in text:
            return "high_match"
        if "needs review" in text:
            return "needs_review"
        if "rejected" in text:
            return "rejected"
        if "accepted" in text:
            return "accepted"
        if "most experienced" in text:
            return "most_experienced"
        return None

    def _assert_recruiter_access(self, current_user: CurrentUserResponse) -> None:
        role = str(current_user.role_name or "").casefold()
        if role not in {"admin", "recruiter"}:
            logger.warning(
                "security_event type=permission_denied module=talent_search user_id=%s role=%s",
                current_user.user_id,
                current_user.role_name,
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    def _load_favorites(self) -> dict[str, list[dict[str, Any]]]:
        if not self.favorites_path.exists():
            return {}
        try:
            payload = json.loads(self.favorites_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to load talent pool favorites.",
            ) from exc
        if not isinstance(payload, dict):
            return {}
        result: dict[str, list[dict[str, Any]]] = {}
        for owner_id, items in payload.items():
            if not isinstance(items, list):
                continue
            result[str(owner_id)] = [dict(item) for item in items if isinstance(item, dict)]
        return result

    def _persist_favorites(self, data: dict[str, list[dict[str, Any]]]) -> None:
        try:
            self.favorites_path.parent.mkdir(parents=True, exist_ok=True)
            self.favorites_path.write_text(
                json.dumps(data, default=str, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to save talent pool favorites.",
            ) from exc

    def _favorite_payload(self, owner_id: UUID, item: dict[str, Any]) -> dict[str, Any]:
        candidate_ids = [UUID(str(candidate_id)) for candidate_id in item.get("candidate_ids", [])]
        candidate_names = self._candidate_names(candidate_ids)
        return {
            "favorite_id": UUID(str(item["favorite_id"])),
            "owner_user_id": owner_id,
            "list_name": item["list_name"],
            "candidate_ids": candidate_ids,
            "candidate_names": candidate_names,
            "candidate_count": len(candidate_ids),
            "notes": item.get("notes"),
            "created_at": datetime.fromisoformat(str(item["created_at"])),
            "updated_at": datetime.fromisoformat(str(item["updated_at"])),
        }

    def _candidate_names(self, candidate_ids: Sequence[UUID]) -> list[str]:
        if not candidate_ids:
            return []
        statement = select(
            User.__table__.c.user_id,
            User.__table__.c.first_name,
            User.__table__.c.last_name,
        ).where(User.__table__.c.user_id.in_(list(candidate_ids)))
        mapping = {
            row["user_id"]: " ".join(
                part for part in [row["first_name"], row["last_name"]] if part
            ).strip()
            for row in self.db.execute(statement).mappings().all()
        }
        return [mapping[candidate_id] for candidate_id in candidate_ids if candidate_id in mapping]

    def _move_candidates(
        self,
        bucket: list[dict[str, Any]],
        source_favorite_id: UUID,
        candidate_ids: Sequence[UUID],
    ) -> None:
        for item in bucket:
            if str(item.get("favorite_id")) != str(source_favorite_id):
                continue
            existing = [UUID(str(candidate_id)) for candidate_id in item.get("candidate_ids", [])]
            remaining = [candidate_id for candidate_id in existing if candidate_id not in set(candidate_ids)]
            item["candidate_ids"] = [str(candidate_id) for candidate_id in remaining]
            item["updated_at"] = datetime.now(timezone.utc).isoformat()
            break

    def _contains_text(self, values: Iterable[str], needle: str) -> bool:
        target = clean_optional_text(needle, "Search term", max_length=255)
        if not target:
            return False
        target = target.casefold()
        for value in values:
            text = clean_optional_text(value, "Search value", max_length=255)
            if text and target in text.casefold():
                return True
        return False

    def _contains_all(self, values: Sequence[str], needles: Sequence[str]) -> bool:
        if not needles:
            return True
        haystack = {value.casefold() for value in values}
        return all(needle.casefold() in haystack or any(needle.casefold() in value.casefold() for value in values) for needle in needles)

    def _dedupe_text(self, values: Iterable[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for value in values:
            text = clean_optional_text(value, "Talent search item", max_length=255)
            if not text:
                continue
            key = text.casefold()
            if key in seen:
                continue
            seen.add(key)
            result.append(text)
        return result

    def _dedupe_uuid(self, values: Sequence[UUID]) -> list[UUID]:
        seen: set[str] = set()
        result: list[UUID] = []
        for value in values:
            key = str(value)
            if key in seen:
                continue
            seen.add(key)
            result.append(value)
        return result

    def _user_name(self, user: Mapping[str, Any]) -> str:
        first = str(user.get("first_name") or "").strip()
        last = str(user.get("last_name") or "").strip()
        return " ".join(part for part in [first, last] if part).strip() or "Candidate"

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        base = Path(report_root) if report_root else Path(self.settings.report_folder)
        if not base.is_absolute():
            base = Path(__file__).resolve().parents[2] / base
        base.mkdir(parents=True, exist_ok=True)
        return base
