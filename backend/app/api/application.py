from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.application import Application
from app.schemas.application import ApplicationCreate, ApplicationListResponse, ApplicationRead
from app.services.application_service import ApplicationService

router = APIRouter(prefix="/applications", tags=["applications"])

@router.get("", response_model=ApplicationListResponse)
def list_applications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = ApplicationService(db).list_applications(user)
    return {"total_items": len(rows), "items": rows}

@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return ApplicationService(db).create_application(payload, user)

@router.patch("/{application_id}/status", response_model=ApplicationRead)
def update_application_status(application_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required.")
    return ApplicationService(db).update_status(application_id, str(new_status), user)

@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(application_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ApplicationService(db).delete_application(application_id, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
