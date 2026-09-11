from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, ConfigDict

class ReportFilters(BaseModel):
    dataset: str = "live"
    recruiter_id: str | None = None
    department_id: int | None = None
    job_id: int | None = None
    status: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    start_date: date | None = None
    end_date: date | None = None

class ReportOption(BaseModel):
    model_config = ConfigDict(extra="allow")
    label: str = ""
    value: Any = None

class ReportPoint(BaseModel):
    model_config = ConfigDict(extra="allow")
    label: str = ""
    value: Any = 0

class ReportRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
    report_id: str
    report_name: str
    created_at: datetime
    type: str
    file_name: str
    download_url: str
    delete_url: str
    size_bytes: int = 0
    source: str = "live"
    filters: dict[str, Any] = {}
