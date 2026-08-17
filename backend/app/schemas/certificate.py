from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class CertificateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cert_id: int
    user_id: uuid.UUID
    title: str
    issuer: str | None = None
    issue_date: date | None = None
    file_path: str
    created_at: datetime
    updated_at: datetime
