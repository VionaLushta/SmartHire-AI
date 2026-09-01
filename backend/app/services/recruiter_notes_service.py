from __future__ import annotations

import json
import logging
import re
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from time import perf_counter
from typing import Any, Iterable, Sequence
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.validation import clean_optional_text, clean_text
from app.models.application import Application
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.schemas.recruiter_notes import (
    RecruiterMention,
    RecruiterNoteCategory,
    RecruiterNoteCreateRequest,
    RecruiterNoteItem,
    RecruiterNotePinRequest,
    RecruiterNoteReplyRequest,
    RecruiterNoteTimelineEvent,
    RecruiterNoteUpdateRequest,
    RecruiterNotesThreadResponse,
)
from app.services.audit_log_service import record_audit_event

logger = logging.getLogger("smarthire.performance")

_ALLOWED_ROLES = {"admin", "recruiter"}
_DEFAULT_CATEGORY: RecruiterNoteCategory = "General"


class RecruiterNotesError(RuntimeError):
    pass


class RecruiterNotesPersistenceError(RecruiterNotesError):
    pass


class RecruiterNotesAccessError(RecruiterNotesError):
    pass


class RecruiterNotesService:
    def __init__(self, db: Session, *, report_root: str | Path | None = None) -> None:
        self.db = db
        self.settings = get_settings()
        self.report_root = self._resolve_report_root(report_root)
        self.notes_root = self.report_root / "recruiter_notes"
        self.notes_root.mkdir(parents=True, exist_ok=True)
        self.notes_path = self.notes_root / "notes.json"
        self.activity_path = self.notes_root / "activity.jsonl"

    def get_notes(
        self,
        current_user: CurrentUserResponse,
        candidate_id: UUID,
        *,
        author: str | None = None,
        keyword: str | None = None,
        category: RecruiterNoteCategory | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> RecruiterNotesThreadResponse:
        self._assert_access(current_user)
        started = perf_counter()
        candidate = self._get_candidate(candidate_id)
        notes = self._candidate_notes(candidate_id)
        filtered = self._filter_notes(
            notes,
            author=author,
            keyword=keyword,
            category=category,
            date_from=date_from,
            date_to=date_to,
        )
        note_items = [self._build_tree(note, notes) for note in self._top_level_notes(filtered)]
        pinned_notes = [note for note in note_items if note.pinned_status]
        recent_activity = self._recent_activity(candidate_id)
        mentions = self._collect_mentions(notes)
        response = RecruiterNotesThreadResponse(
            candidate_id=candidate_id,
            candidate_name=self._user_name(candidate),
            discussion_thread=sorted(
                note_items,
                key=lambda item: (item.pinned_status, item.created_at, item.note_id),
                reverse=True,
            ),
            pinned_notes=sorted(
                pinned_notes,
                key=lambda item: (item.created_at, item.note_id),
                reverse=True,
            ),
            recent_activity=recent_activity,
            recruiter_mentions=mentions,
            total_notes=len(filtered),
        )
        logger.info(
            "recruiter notes retrieved user_id=%s candidate_id=%s notes=%s duration_ms=%.1f",
            current_user.user_id,
            candidate_id,
            len(filtered),
            (perf_counter() - started) * 1000,
        )
        return response

    def create_note(
        self,
        current_user: CurrentUserResponse,
        payload: RecruiterNoteCreateRequest,
    ) -> RecruiterNoteItem:
        self._assert_access(current_user)
        started = perf_counter()
        candidate = self._get_candidate(payload.candidate_id)
        note = self._create_note_record(
            current_user=current_user,
            candidate=candidate,
            message=payload.message,
            category=payload.category or _DEFAULT_CATEGORY,
            parent_note_id=None,
        )
        self._append_activity(
            candidate_id=payload.candidate_id,
            actor=current_user,
            event="Recruiter Note Added",
            message=note["message"],
            note_id=note["note_id"],
            category=note["category"],
        )
        self._append_mentions_activity(payload.candidate_id, current_user, note["mentions"], note["note_id"])
        self._append_hiring_decision_activity(payload.candidate_id, current_user, note)
        self._persist_notes(self._add_note_record(note))
        logger.info(
            "recruiter note created user_id=%s candidate_id=%s note_id=%s duration_ms=%.1f",
            current_user.user_id,
            payload.candidate_id,
            note["note_id"],
            (perf_counter() - started) * 1000,
        )
        return self._build_item(note, self._notes_map(self._load_notes()))

    def update_note(
        self,
        current_user: CurrentUserResponse,
        note_id: str,
        payload: RecruiterNoteUpdateRequest,
    ) -> RecruiterNoteItem:
        self._assert_access(current_user)
        started = perf_counter()
        notes = self._load_notes()
        index, note = self._get_note_by_id(notes, note_id)
        self._assert_owner(current_user, note)
        note["message"] = self._sanitize_message(payload.message)
        note["category"] = payload.category or note["category"]
        note["edited"] = True
        note["updated_at"] = self._now().isoformat()
        note["mentions"] = self._resolve_mentions(note["message"])
        notes[index] = note
        self._persist_notes(notes)
        self._append_activity(
            candidate_id=UUID(str(note["candidate_id"])),
            actor=current_user,
            event="Recruiter Note Edited",
            message=note["message"],
            note_id=note["note_id"],
            category=note["category"],
        )
        self._append_mentions_activity(UUID(str(note["candidate_id"])), current_user, note["mentions"], note["note_id"])
        self._append_hiring_decision_activity(UUID(str(note["candidate_id"])), current_user, note)
        logger.info(
            "recruiter note updated user_id=%s note_id=%s duration_ms=%.1f",
            current_user.user_id,
            note_id,
            (perf_counter() - started) * 1000,
        )
        return self._build_item(note, self._notes_map(notes))

    def delete_note(self, current_user: CurrentUserResponse, note_id: str) -> None:
        self._assert_access(current_user)
        started = perf_counter()
        notes = self._load_notes()
        index, note = self._get_note_by_id(notes, note_id)
        self._assert_owner(current_user, note)
        candidate_id = UUID(str(note["candidate_id"]))
        note_ids_to_remove = self._collect_descendants(notes, note["note_id"])
        note_ids_to_remove.add(note["note_id"])
        notes = [item for item in notes if item["note_id"] not in note_ids_to_remove]
        self._persist_notes(notes)
        self._append_activity(
            candidate_id=candidate_id,
            actor=current_user,
            event="Recruiter Note Deleted",
            message=note["message"],
            note_id=note["note_id"],
            category=note["category"],
        )
        logger.info(
            "recruiter note deleted user_id=%s note_id=%s duration_ms=%.1f",
            current_user.user_id,
            note_id,
            (perf_counter() - started) * 1000,
        )

    def reply_to_note(
        self,
        current_user: CurrentUserResponse,
        note_id: str,
        payload: RecruiterNoteReplyRequest,
    ) -> RecruiterNoteItem:
        self._assert_access(current_user)
        started = perf_counter()
        notes = self._load_notes()
        _, parent = self._get_note_by_id(notes, note_id)
        candidate_id = UUID(str(parent["candidate_id"]))
        reply = self._create_note_record(
            current_user=current_user,
            candidate=self._get_candidate(candidate_id),
            message=payload.message,
            category=payload.category or parent["category"],
            parent_note_id=parent["note_id"],
        )
        self._persist_notes(self._add_note_record(reply))
        self._append_activity(
            candidate_id=candidate_id,
            actor=current_user,
            event="Recruiter Note Replied",
            message=reply["message"],
            note_id=reply["note_id"],
            category=reply["category"],
        )
        self._append_mentions_activity(candidate_id, current_user, reply["mentions"], reply["note_id"])
        self._append_hiring_decision_activity(candidate_id, current_user, reply)
        logger.info(
            "recruiter note replied user_id=%s parent_note_id=%s reply_id=%s duration_ms=%.1f",
            current_user.user_id,
            note_id,
            reply["note_id"],
            (perf_counter() - started) * 1000,
        )
        return self._build_item(reply, self._notes_map(self._load_notes()))

    def pin_note(
        self,
        current_user: CurrentUserResponse,
        note_id: str,
        payload: RecruiterNotePinRequest,
    ) -> RecruiterNoteItem:
        self._assert_access(current_user)
        notes = self._load_notes()
        index, note = self._get_note_by_id(notes, note_id)
        note["pinned"] = bool(payload.pinned)
        note["updated_at"] = self._now().isoformat()
        notes[index] = note
        self._persist_notes(notes)
        self._append_activity(
            candidate_id=UUID(str(note["candidate_id"])),
            actor=current_user,
            event="Recruiter Note Pinned" if payload.pinned else "Recruiter Note Unpinned",
            message=note["message"],
            note_id=note["note_id"],
            category=note["category"],
        )
        return self._build_item(note, self._notes_map(notes))

    def _create_note_record(
        self,
        *,
        current_user: CurrentUserResponse,
        candidate: dict[str, Any],
        message: str,
        category: RecruiterNoteCategory,
        parent_note_id: str | None,
    ) -> dict[str, Any]:
        created_at = self._now()
        author_handle = self._handle_for_user(current_user.email, current_user.first_name, current_user.last_name)
        mentions = self._resolve_mentions(message)
        return {
            "note_id": str(uuid4()),
            "candidate_id": str(candidate["user_id"]),
            "author_id": str(current_user.user_id),
            "author_name": self._user_name(current_user),
            "author_handle": author_handle,
            "author_role": str(current_user.role_name or ""),
            "category": category,
            "message": self._sanitize_message(message),
            "date": created_at.date().isoformat(),
            "time": created_at.strftime("%H:%M"),
            "created_at": created_at.isoformat(),
            "updated_at": created_at.isoformat(),
            "edited": False,
            "pinned": False,
            "parent_note_id": parent_note_id,
            "mentions": mentions,
        }

    def _build_item(self, note: dict[str, Any], notes_map: dict[str, dict[str, Any]]) -> RecruiterNoteItem:
        replies = [
            self._build_item(reply, notes_map)
            for reply in sorted(
                self._children_for_note(notes_map, note["note_id"]),
                key=lambda item: (item["created_at"], item["note_id"]),
            )
        ]
        return RecruiterNoteItem(
            note_id=note["note_id"],
            candidate_id=UUID(str(note["candidate_id"])),
            author_id=UUID(str(note["author_id"])),
            author_name=note["author_name"],
            author_handle=note["author_handle"],
            author_role=note["author_role"],
            category=note["category"],
            message=note["message"],
            date=datetime.fromisoformat(note["created_at"]).date(),
            time=note["time"],
            created_at=datetime.fromisoformat(note["created_at"]),
            updated_at=datetime.fromisoformat(note["updated_at"]),
            edited_status=bool(note.get("edited")),
            pinned_status=bool(note.get("pinned")),
            parent_note_id=note.get("parent_note_id"),
            mentions=[RecruiterMention.model_validate(item) for item in note.get("mentions", [])],
            replies=replies,
        )

    def _filter_notes(
        self,
        notes: Sequence[dict[str, Any]],
        *,
        author: str | None,
        keyword: str | None,
        category: RecruiterNoteCategory | None,
        date_from: date | None,
        date_to: date | None,
    ) -> list[dict[str, Any]]:
        filtered: list[dict[str, Any]] = []
        author_term = clean_optional_text(author, "Author", max_length=255)
        keyword_term = clean_optional_text(keyword, "Keyword", max_length=1000)
        category_term = clean_optional_text(category, "Category", max_length=120)
        for note in notes:
            if author_term and not self._matches_author(note, author_term):
                continue
            if keyword_term and not self._matches_keyword(note, keyword_term):
                continue
            if category_term and str(note["category"]).casefold() != category_term.casefold():
                continue
            created = datetime.fromisoformat(note["created_at"]).date()
            if date_from is not None and created < date_from:
                continue
            if date_to is not None and created > date_to:
                continue
            filtered.append(note)
        return filtered

    def _matches_author(self, note: dict[str, Any], author: str) -> bool:
        return self._contains_text(
            [
                note.get("author_name") or "",
                note.get("author_handle") or "",
                note.get("author_role") or "",
            ],
            author,
        )

    def _matches_keyword(self, note: dict[str, Any], keyword: str) -> bool:
        searchable = " ".join(
            [
                str(note.get("message") or ""),
                str(note.get("category") or ""),
                str(note.get("author_name") or ""),
                str(note.get("author_handle") or ""),
                " ".join(str(item.get("handle") or "") for item in note.get("mentions", [])),
                " ".join(str(item.get("display_name") or "") for item in note.get("mentions", [])),
            ]
        )
        return self._contains_text([searchable], keyword)

    def _top_level_notes(self, notes: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
        allowed = {note["note_id"] for note in notes}
        return [note for note in notes if note.get("parent_note_id") in {None, "", *[None]} or note.get("parent_note_id") not in allowed]

    def _children_for_note(self, notes_map: dict[str, dict[str, Any]], note_id: str) -> list[dict[str, Any]]:
        return [note for note in notes_map.values() if note.get("parent_note_id") == note_id]

    def _collect_descendants(self, notes: Sequence[dict[str, Any]], note_id: str) -> set[str]:
        mapping: dict[str, list[str]] = defaultdict(list)
        for note in notes:
            parent_id = note.get("parent_note_id")
            if parent_id:
                mapping[str(parent_id)].append(str(note["note_id"]))
        collected: set[str] = set()
        stack = [str(note_id)]
        while stack:
            current = stack.pop()
            for child_id in mapping.get(current, []):
                if child_id in collected:
                    continue
                collected.add(child_id)
                stack.append(child_id)
        return collected

    def _candidate_notes(self, candidate_id: UUID) -> list[dict[str, Any]]:
        return [note for note in self._load_notes() if str(note.get("candidate_id")) == str(candidate_id)]

    def _notes_map(self, notes: Sequence[dict[str, Any]]) -> dict[str, dict[str, Any]]:
        return {str(note["note_id"]): dict(note) for note in notes}

    def _get_note_by_id(self, notes: Sequence[dict[str, Any]], note_id: str) -> tuple[int, dict[str, Any]]:
        for index, note in enumerate(notes):
            if str(note.get("note_id")) == str(note_id):
                return index, dict(note)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruiter note not found.")

    def _assert_owner(self, current_user: CurrentUserResponse, note: dict[str, Any]) -> None:
        if str(note.get("author_id")) != str(current_user.user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only modify your own notes.")

    def _assert_access(self, current_user: CurrentUserResponse) -> None:
        role = str(current_user.role_name or "").casefold()
        if role not in _ALLOWED_ROLES:
            logger.warning(
                "security_event type=permission_denied module=recruiter_notes user_id=%s role=%s",
                current_user.user_id,
                current_user.role_name,
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    def _get_candidate(self, candidate_id: UUID) -> dict[str, Any]:
        row = (
            self.db.execute(select(User.__table__).where(User.__table__.c.user_id == candidate_id))
            .mappings()
            .first()
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
        return dict(row)

    def _load_notes(self) -> list[dict[str, Any]]:
        if not self.notes_path.exists():
            return []
        try:
            payload = json.loads(self.notes_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RecruiterNotesPersistenceError("Unable to load recruiter notes.") from exc
        if isinstance(payload, list):
            return [dict(item) for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict) and isinstance(payload.get("notes"), list):
            return [dict(item) for item in payload["notes"] if isinstance(item, dict)]
        return []

    def _persist_notes(self, notes: list[dict[str, Any]]) -> None:
        try:
            self.notes_path.parent.mkdir(parents=True, exist_ok=True)
            self.notes_path.write_text(json.dumps(notes, default=str, indent=2, ensure_ascii=False), encoding="utf-8")
        except OSError as exc:
            raise RecruiterNotesPersistenceError("Unable to save recruiter notes.") from exc

    def _add_note_record(self, note: dict[str, Any]) -> list[dict[str, Any]]:
        notes = self._load_notes()
        notes.append(note)
        return notes

    def _append_activity(
        self,
        *,
        candidate_id: UUID,
        actor: CurrentUserResponse,
        event: str,
        message: str,
        note_id: str,
        category: RecruiterNoteCategory,
    ) -> None:
        payload = {
            "timestamp": self._now().isoformat(),
            "candidate_id": str(candidate_id),
            "actor": self._user_name(actor),
            "actor_handle": self._handle_for_user(actor.email, actor.first_name, actor.last_name),
            "event": event,
            "message": message,
            "note_id": note_id,
            "category": category,
        }
        try:
            self.activity_path.parent.mkdir(parents=True, exist_ok=True)
            with self.activity_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(payload, default=str, ensure_ascii=False))
                handle.write("\n")
            record_audit_event(
                self.db,
                user_id=actor.user_id,
                user_role=str(actor.role_name or "Unknown"),
                action=event,
                entity_type="RecruiterNote",
                entity_id=note_id,
                description=message,
                status="Success",
                metadata=payload,
            )
        except OSError as exc:
            raise RecruiterNotesPersistenceError("Unable to write recruiter activity log.") from exc

    def _append_mentions_activity(
        self,
        candidate_id: UUID,
        actor: CurrentUserResponse,
        mentions: Sequence[dict[str, Any]],
        note_id: str,
    ) -> None:
        for mention in mentions:
            self._append_activity(
                candidate_id=candidate_id,
                actor=actor,
                event="Recruiter Mentioned",
                message=f"Mentioned @{mention.get('handle')}",
                note_id=note_id,
                category="General",
            )

    def _append_hiring_decision_activity(
        self,
        candidate_id: UUID,
        actor: CurrentUserResponse,
        note: dict[str, Any],
    ) -> None:
        if str(note.get("category") or "").casefold() == "hiring decision":
            self._append_activity(
                candidate_id=candidate_id,
                actor=actor,
                event="Hiring Decision Updated",
                message=note["message"],
                note_id=note["note_id"],
                category=note["category"],
            )

    def _recent_activity(self, candidate_id: UUID) -> list[RecruiterNoteTimelineEvent]:
        if not self.activity_path.exists():
            return []
        entries: list[RecruiterNoteTimelineEvent] = []
        try:
            for line in self.activity_path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                payload = json.loads(line)
                if str(payload.get("candidate_id")) != str(candidate_id):
                    continue
                entries.append(RecruiterNoteTimelineEvent.model_validate(payload))
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            raise RecruiterNotesPersistenceError("Unable to read recruiter activity log.") from exc
        return sorted(entries, key=lambda item: item.timestamp, reverse=True)[:25]

    def _collect_mentions(self, notes: Sequence[dict[str, Any]]) -> list[RecruiterMention]:
        mentions: dict[str, RecruiterMention] = {}
        for note in notes:
            for mention in note.get("mentions", []):
                try:
                    mention_obj = RecruiterMention.model_validate(mention)
                except Exception:
                    continue
                mentions[str(mention_obj.user_id)] = mention_obj
        return sorted(mentions.values(), key=lambda item: item.display_name.casefold())

    def _resolve_mentions(self, message: str) -> list[dict[str, Any]]:
        handles = {
            token.casefold().rstrip(".,:;!?")
            for token in re.findall(r"@([A-Za-z0-9._-]+)", message or "")
        }
        if not handles:
            return []
        return self._mention_catalog(handles)

    def _mention_catalog(self, handles: set[str]) -> list[dict[str, Any]]:
        statement = (
            select(User.__table__, Role.__table__.c.name.label("role_name"))
            .select_from(User.__table__.join(Role.__table__, Role.__table__.c.role_id == User.__table__.c.role_id))
            .where(Role.__table__.c.name.in_(["Admin", "Recruiter"]))
        )
        mentions: list[dict[str, Any]] = []
        for row in self.db.execute(statement).mappings().all():
            user = dict(row)
            handle_candidates = self._handle_candidates(user)
            if not any(candidate.casefold() in handles for candidate in handle_candidates):
                continue
            mentions.append(
                {
                    "user_id": str(user["user_id"]),
                    "handle": self._handle_for_user(user["email"], user["first_name"], user["last_name"]),
                    "display_name": self._user_name(user),
                    "role_name": str(user["role_name"] or ""),
                }
            )
        return mentions

    def _handle_for_user(self, email: str | None, first_name: str | None, last_name: str | None) -> str:
        if email:
            local = str(email).split("@", 1)[0]
            if local:
                return self._slugify(local)
        pieces = [str(first_name or "").strip(), str(last_name or "").strip()]
        pieces = [piece for piece in pieces if piece]
        if pieces:
            return self._slugify(".".join(pieces))
        return "unknown"

    def _handle_candidates(self, user: dict[str, Any]) -> set[str]:
        first = self._slugify(str(user.get("first_name") or ""))
        last = self._slugify(str(user.get("last_name") or ""))
        joined = self._slugify(f"{user.get('first_name') or ''}.{user.get('last_name') or ''}")
        email = self._slugify(str(user.get("email") or "").split("@", 1)[0])
        return {candidate for candidate in {first, last, joined, email} if candidate}

    def _user_name(self, user: CurrentUserResponse | dict[str, Any]) -> str:
        first = str(user.get("first_name") if isinstance(user, dict) else user.first_name).strip()
        last = str(user.get("last_name") if isinstance(user, dict) else user.last_name).strip()
        return " ".join(part for part in [first, last] if part).strip()

    def _slugify(self, value: str) -> str:
        cleaned = clean_optional_text(value, "Handle", max_length=255) or ""
        cleaned = cleaned.casefold()
        return re.sub(r"[^a-z0-9._-]+", "", cleaned)

    def _sanitize_message(self, message: str) -> str:
        return clean_text(message, "Recruiter note message", max_length=4000)

    def _contains_text(self, values: Iterable[str], needle: str) -> bool:
        target = clean_optional_text(needle, "Search term", max_length=255)
        if not target:
            return False
        target = target.casefold()
        for value in values:
            text = clean_optional_text(value, "Search value", max_length=4000)
            if text and target in text.casefold():
                return True
        return False

    def _build_tree(self, note: dict[str, Any], notes: Sequence[dict[str, Any]]) -> RecruiterNoteItem:
        notes_map = self._notes_map(notes)
        return self._build_item(note, notes_map)

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        if report_root is None:
            configured = getattr(self.settings, "report_root", None)
            if configured:
                return Path(str(configured)).expanduser().resolve()
            return Path("reports").resolve()
        return Path(report_root).expanduser().resolve()

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)
