from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.validation import clean_optional_text, clean_text

RecruiterNoteCategory = Literal[
    "General",
    "Interview Feedback",
    "Technical Review",
    "HR Review",
    "Hiring Decision",
]


class RecruiterMention(BaseModel):
    user_id: UUID
    handle: str
    display_name: str
    role_name: str

    @field_validator("handle", "display_name", "role_name")
    @classmethod
    def _clean_text(cls, value: str) -> str:
        return clean_text(value, "Mention field", max_length=255)


class RecruiterNoteReplyRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    category: RecruiterNoteCategory | None = None

    @field_validator("message", "category")
    @classmethod
    def _clean_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        return clean_text(value, info.field_name or "Recruiter note field", max_length=4000)


class RecruiterNoteCreateRequest(BaseModel):
    candidate_id: UUID
    message: str = Field(min_length=1, max_length=4000)
    category: RecruiterNoteCategory = "General"

    @field_validator("message", "category")
    @classmethod
    def _clean_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        return clean_text(value, info.field_name or "Recruiter note field", max_length=4000)


class RecruiterNoteUpdateRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    category: RecruiterNoteCategory | None = None

    @field_validator("message", "category")
    @classmethod
    def _clean_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        return clean_text(value, info.field_name or "Recruiter note field", max_length=4000)


class RecruiterNotePinRequest(BaseModel):
    pinned: bool = True


class RecruiterNoteTimelineEvent(BaseModel):
    timestamp: datetime
    event: str
    message: str
    actor: str | None = None
    note_id: str | None = None
    category: RecruiterNoteCategory | None = None

    @field_validator("event", "message", "actor", "note_id", "category")
    @classmethod
    def _clean_optional_text(cls, value: Any, info) -> Any:
        if value is None:
            return None
        if info.field_name == "category":
            return clean_text(value, "Recruiter note category", max_length=120)
        return clean_optional_text(value, info.field_name or "Timeline field", max_length=500)


class RecruiterNoteItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    note_id: str
    candidate_id: UUID
    author_id: UUID
    author_name: str
    author_handle: str
    author_role: str
    category: RecruiterNoteCategory
    message: str
    date: date
    time: str
    created_at: datetime
    updated_at: datetime
    edited_status: bool
    pinned_status: bool
    parent_note_id: str | None = None
    mentions: list[RecruiterMention] = Field(default_factory=list)
    replies: list["RecruiterNoteItem"] = Field(default_factory=list)

    @field_validator("note_id", "author_name", "author_handle", "author_role", "message", "parent_note_id")
    @classmethod
    def _clean_optional_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        return clean_optional_text(value, info.field_name or "Recruiter note field", max_length=4000)

    @field_validator("time")
    @classmethod
    def _clean_time(cls, value: str) -> str:
        return clean_text(value, "Note time", max_length=32)

    @field_validator("replies")
    @classmethod
    def _clean_replies(cls, value: list["RecruiterNoteItem"]) -> list["RecruiterNoteItem"]:
        return value


class RecruiterNotesThreadResponse(BaseModel):
    candidate_id: UUID
    candidate_name: str
    discussion_thread: list[RecruiterNoteItem] = Field(default_factory=list)
    pinned_notes: list[RecruiterNoteItem] = Field(default_factory=list)
    recent_activity: list[RecruiterNoteTimelineEvent] = Field(default_factory=list)
    recruiter_mentions: list[RecruiterMention] = Field(default_factory=list)
    total_notes: int = Field(ge=0)


RecruiterNoteItem.model_rebuild()
