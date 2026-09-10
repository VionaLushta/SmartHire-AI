from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from itertools import count
from typing import Any

from fastapi import HTTPException, status

from app.schemas.audit_log import AuditLogCreateRequest, AuditLogListResponse, AuditLogResponse

_logs_by_store: dict[int, list[AuditLogResponse]] = {}
_ids = count(1)

def _store(db: Any) -> list[AuditLogResponse]:
    key = id(db.get_bind()) if db is not None and hasattr(db, "get_bind") else 0
    return _logs_by_store.setdefault(key, [])


def _admin(user: Any) -> None:
    if str(getattr(user, "role_name", "")) != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def record_audit_event(db: Any, **kwargs: Any) -> AuditLogResponse:
    entry = AuditLogResponse(log_id=next(_ids), created_at=datetime.now(timezone.utc), **kwargs)
    _store(db).append(entry)
    return entry


class AuditLogService:
    def __init__(self, db: Any, report_root: Any = None):
        self.db = db
        self.report_root = report_root

    def record_event(self, payload: AuditLogCreateRequest) -> AuditLogResponse:
        return record_audit_event(self.db, **payload.model_dump())

    def list_logs(self, user: Any, role: str | None = None, action: str | None = None,
                  entity_type: str | None = None) -> AuditLogListResponse:
        _admin(user)
        items = [x for x in _store(self.db) if (not role or role.lower() in (x.user_role or "").lower())
                 and (not action or action.lower() in x.action.lower())
                 and (not entity_type or entity_type.lower() == x.entity_type.lower())]
        return AuditLogListResponse(total=len(items), items=list(reversed(items)))

    def recent_logs(self, user: Any, limit: int = 20) -> AuditLogListResponse:
        result = self.list_logs(user)
        result.items = result.items[:limit]
        return result

    def security_logs(self, user: Any) -> AuditLogListResponse:
        _admin(user)
        items = [x for x in _store(self.db) if x.status.lower() in {"failed", "warning", "security"} or "login" in x.action.lower()]
        return AuditLogListResponse(total=len(items), items=list(reversed(items)))

    def export(self, user: Any, report_format: str = "json"):
        items = self.list_logs(user).items
        if report_format == "csv":
            out = io.StringIO(); writer = csv.writer(out)
            writer.writerow(["log_id", "created_at", "user_role", "action", "entity_type", "entity_id", "status", "description"])
            for x in items: writer.writerow([x.log_id, x.created_at.isoformat(), x.user_role, x.action, x.entity_type, x.entity_id, x.status, x.description])
            return out.getvalue().encode(), "text/csv", "audit_logs.csv"
        payload = {"dataset": {"name": "audit_logs"}, "items": [x.model_dump(mode="json") for x in items]}
        return json.dumps(payload).encode(), "application/json", "audit_logs.json"
