from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.validation import clean_optional_text, clean_text

NotificationPriority = Literal["Low", "Normal", "High", "Urgent"]
NotificationFilter = Literal[
    "all",
    "unread",
    "read",
    "today",
    "this_week",
    "high_priority",
    "system",
    "recruitment",
    "interview",
]
NotificationType = Literal[
    "Application Received",
    "Application Status Updated",
    "Interview Scheduled",
    "Interview Rescheduled",
    "Interview Cancelled",
    "Offer Received",
    "Rejection Notice",
    "Resume Advisor Ready",
    "New Application",
    "High Match Candidate",
    "Interview Today",
    "Interview Tomorrow",
    "Candidate Accepted",
    "Candidate Rejected",
    "Recruiter Mention",
    "New Candidate Applied",
    "Interview Completed",
    "Offer Accepted",
    "Offer Declined",
    "System Alert",
    "Email Failed",
    "OCR Failed",
    "Workflow Error",
]


class NotificationCreateRequest(BaseModel):
    recipient_user_id: UUID | None = None
    recipient_role: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=4000)
    type: NotificationType
    priority: NotificationPriority = "Normal"
    related_candidate_id: UUID | None = None
    related_job_id: int | None = Field(default=None, ge=1)
    is_system: bool = False

    @field_validator("recipient_role", "title", "message")
    @classmethod
    def _clean_text(cls, value: str, info) -> str:
        return clean_text(value, info.field_name or "Notification field", max_length=4000)


class NotificationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    notification_id: UUID
    recipient_user_id: UUID | None = None
    recipient_role: str
    title: str
    message: str
    type: NotificationType
    priority: NotificationPriority
    related_candidate_id: UUID | None = None
    related_job_id: int | None = None
    timestamp: datetime
    read_status: bool
    is_system: bool = False

    @field_validator("recipient_role", "title", "message", "type", "priority")
    @classmethod
    def _clean_required_text(cls, value: str, info) -> str:
        return clean_text(value, info.field_name or "Notification field", max_length=4000)

    @field_validator("related_job_id")
    @classmethod
    def _validate_job_id(cls, value: int | None) -> int | None:
        if value is not None and value < 1:
            raise ValueError("Job reference must be positive.")
        return value


class NotificationListResponse(BaseModel):
    items: list[NotificationItem] = Field(default_factory=list)
    total: int = Field(ge=0)
    unread_count: int = Field(ge=0)


class NotificationCountResponse(BaseModel):
    unread_count: int = Field(ge=0)


class NotificationActionResponse(BaseModel):
    updated: int = Field(ge=0)


class NotificationQuery(BaseModel):
    filter: NotificationFilter = "all"
    limit: int = Field(default=50, ge=1, le=200)

    @field_validator("filter")
    @classmethod
    def _clean_filter(cls, value: str) -> str:
        return clean_text(value, "Notification filter", max_length=50)

