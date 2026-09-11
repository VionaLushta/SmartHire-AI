from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.reports import ReportFilters, ReportRecord
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])

def service(db: Session = Depends(get_db)):
    return ReportService(db)

@router.get("", response_model=dict)
def reports(current_user=Depends(get_current_user), svc=Depends(service)):
    return {"items": svc.list_reports(current_user)}

@router.get("/analytics")
def analytics(current_user=Depends(get_current_user), svc=Depends(service)):
    return svc.analytics(current_user, ReportFilters())

@router.get("/export/{report_format}")
def export(report_format: str, current_user=Depends(get_current_user), svc=Depends(service)):
    data, media, name, _ = svc.export_report(current_user, report_format=report_format, filters=ReportFilters())
    return Response(data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{name}"'})

@router.get("/{report_id}/download")
def download(report_id: str, current_user=Depends(get_current_user), svc=Depends(service)):
    path = svc.download_report(current_user, report_id)
    return FileResponse(path)

@router.delete("/{report_id}", status_code=204)
def delete(report_id: str, current_user=Depends(get_current_user), svc=Depends(service)):
    svc.delete_report(current_user, report_id)
