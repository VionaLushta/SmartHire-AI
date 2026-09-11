from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AuditLogCreateRequest(BaseModel):
    user_id: UUID | None = None
    user_role: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    description: str
    status: str = "Success"
    metadata: dict[str, Any] = Field(default_factory=dict)


class AuditLogResponse(AuditLogCreateRequest):
    model_config = ConfigDict(from_attributes=True)
    log_id: int
    created_at: datetime


class AuditLogListResponse(BaseModel):
    total: int
    items: list[AuditLogResponse]
