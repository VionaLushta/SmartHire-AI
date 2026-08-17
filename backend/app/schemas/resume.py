from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict


class ResumeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    resume_id: int
    user_id: uuid.UUID
    file_path: str
    parsed_text: str | None = None
