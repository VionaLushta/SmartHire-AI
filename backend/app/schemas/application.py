from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class ApplicationCreate(BaseModel):
    job_id: int
    resume_id: int | None = None

class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    application_id: int
    user_id: UUID
    job_id: int
    resume_id: int | None = None
    status: str
    created_at: datetime
    updated_at: datetime

class ApplicationListResponse(BaseModel):
    total_items: int
    items: list[ApplicationRead]
