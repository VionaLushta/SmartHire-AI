from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SavedJobCreate(BaseModel):
    user_id: uuid.UUID
    job_id: int = Field(gt=0)


class SavedJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: uuid.UUID
    job_id: int
    saved_at: datetime
