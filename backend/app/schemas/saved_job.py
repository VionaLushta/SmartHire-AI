from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SavedJobCreate(BaseModel):
    # The API takes the authenticated user from the access token.
    user_id: uuid.UUID | None = None
    job_id: int = Field(gt=0)


class SavedJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: uuid.UUID
    job_id: int
    saved_at: datetime
