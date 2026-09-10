from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.dependencies import get_current_user
from app.schemas.audit_log import AuditLogListResponse
from app.services.audit_log_service import AuditLogService

router = APIRouter(prefix="/audit-logs", tags=["audit logs"])

def get_audit_log_service() -> AuditLogService:
    from app.database.database import SessionLocal
    return AuditLogService(SessionLocal() if SessionLocal else None)

@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(service=Depends(get_audit_log_service), user=Depends(get_current_user), role: str | None = None, action: str | None = None, entity_type: str | None = None):
    return service.list_logs(user, role, action, entity_type)

@router.get("/recent", response_model=AuditLogListResponse)
def recent(service=Depends(get_audit_log_service), user=Depends(get_current_user), limit: int = Query(20, ge=1, le=100)):
    return service.recent_logs(user, limit)

@router.get("/security", response_model=AuditLogListResponse)
def security(service=Depends(get_audit_log_service), user=Depends(get_current_user)):
    return service.security_logs(user)

@router.get("/export")
def export(service=Depends(get_audit_log_service), user=Depends(get_current_user), format: str = "json"):
    data, media, name = service.export(user, format)
    return Response(data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{name}"'})
