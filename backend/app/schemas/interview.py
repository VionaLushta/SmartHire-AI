from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.validation import clean_optional_text, clean_text, validate_http_url

InterviewType = Literal["On-site", "Online", "Phone", "Technical", "HR", "Final"]
InterviewStatus = Literal["Scheduled", "Rescheduled", "Completed", "Cancelled", "No Show"]
ExportFormat = Literal["csv", "json", "powerbi"]
InterviewDifficulty = Literal["Easy", "Medium", "Hard"]


class InterviewQuestion(BaseModel):
    category: str
    question: str
    reason: str
    difficulty: InterviewDifficulty
    expected_skill: str
    evaluation_criteria: list[str]

    @field_validator("category", "question", "reason", "expected_skill")
    @classmethod
    def _clean_text(cls, value: str) -> str:
        return clean_text(value, "Interview question field", max_length=1000)

    @field_validator("evaluation_criteria")
    @classmethod
    def _clean_list(cls, value: list[str]) -> list[str]:
        return [clean_text(item, "Evaluation criteria", max_length=500) for item in value if str(item or "").strip()]


class InterviewGuideSnapshot(BaseModel):
    interview_summary: str
    candidate_strengths: list[str]
    candidate_risks: list[str]
    recommended_focus_areas: list[str]
    overall_interview_plan: list[str]
    overall_match: float = Field(ge=0, le=100)

    @field_validator(
        "interview_summary",
        "candidate_strengths",
        "candidate_risks",
        "recommended_focus_areas",
        "overall_interview_plan",
        mode="before",
    )
    @classmethod
    def _normalize_lists(cls, value: Any) -> Any:
        if isinstance(value, list):
            return [clean_text(item, "Interview guide item", max_length=500) for item in value if str(item or "").strip()]
        if isinstance(value, str):
            return clean_text(value, "Interview summary", max_length=2000)
        return value


class InterviewTimelineEvent(BaseModel):
    timestamp: datetime
    event: str
    message: str
    status: InterviewStatus | None = None
    actor: str | None = None

    @field_validator("event", "message", "actor", mode="before")
    @classmethod
    def _clean_optional_text(cls, value: Any) -> Any:
        if value is None:
            return value
        return clean_optional_text(value, "Timeline field", max_length=500)


class InterviewScheduleRequest(BaseModel):
    candidate_id: UUID
    job_id: int = Field(gt=0)
    interviewer_id: UUID | None = None
    interview_date: date
    interview_time: str
    duration_minutes: int = Field(ge=15, le=480)
    interview_type: InterviewType
    location: str | None = None
    meeting_link: str | None = None
    notes: str | None = None
    regenerate_questions: bool = False

    @field_validator("interview_time")
    @classmethod
    def _validate_time(cls, value: str) -> str:
        return clean_text(value, "Interview time", max_length=32)

    @field_validator("location", "notes")
    @classmethod
    def _validate_optional_text(cls, value: str | None) -> str | None:
        return clean_optional_text(value, "Interview field", max_length=4000)

    @field_validator("meeting_link")
    @classmethod
    def _validate_meeting_link(cls, value: str | None) -> str | None:
        return validate_http_url(value, "Meeting link")


class InterviewUpdateRequest(BaseModel):
    interviewer_id: UUID | None = None
    interview_date: date | None = None
    interview_time: str | None = None
    duration_minutes: int | None = Field(default=None, ge=15, le=480)
    interview_type: InterviewType | None = None
    location: str | None = None
    meeting_link: str | None = None
    notes: str | None = None
    status: InterviewStatus | None = None
    regenerate_questions: bool = False

    @field_validator("interview_time")
    @classmethod
    def _validate_time(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return clean_text(value, "Interview time", max_length=32)

    @field_validator("location", "notes")
    @classmethod
    def _validate_optional_text(cls, value: str | None) -> str | None:
        return clean_optional_text(value, "Interview field", max_length=4000)

    @field_validator("meeting_link")
    @classmethod
    def _validate_meeting_link(cls, value: str | None) -> str | None:
        return validate_http_url(value, "Meeting link")


class InterviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    interview_id: int
    application_id: int
    candidate_id: UUID
    candidate_name: str
    candidate_email: EmailStr
    job_id: int
    job_title: str | None = None
    interviewer_id: UUID | None = None
    interviewer_name: str | None = None
    scheduled_at: datetime | None = None
    interview_date: date | None = None
    interview_time: str | None = None
    duration_minutes: int
    interview_type: InterviewType
    location: str | None = None
    meeting_link: str | None = None
    status: InterviewStatus
    notes: str | None = None
    reminder_at: datetime | None = None
    questions: list[InterviewQuestion] = Field(default_factory=list)
    guide: InterviewGuideSnapshot | None = None
    timeline: list[InterviewTimelineEvent] = Field(default_factory=list)
    email_status: str | None = None
    email_error: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    document_path: str | None = None


class InterviewListResponse(BaseModel):
    items: list[InterviewResponse]
    total: int


class InterviewExportPayload(BaseModel):
    format: ExportFormat
    generated_at: datetime
    dataset: str
    columns: list[str]
    rows: list[dict[str, Any]]
