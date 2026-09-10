from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.application import Application
from app.schemas.application import ApplicationCreate, ApplicationListResponse, ApplicationRead

router = APIRouter(prefix="/applications", tags=["applications"])

@router.get("", response_model=ApplicationListResponse)
def list_applications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.execute(select(Application).where(Application.user_id == user.user_id).order_by(Application.created_at.desc())).scalars().all()
    return {"total_items": len(rows), "items": rows}

@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    duplicate = db.execute(select(Application).where(Application.user_id == user.user_id, Application.job_id == payload.job_id)).scalar_one_or_none()
    if duplicate:
        raise HTTPException(status_code=409, detail="You have already applied for this job.")
    row = Application(user_id=user.user_id, job_id=payload.job_id, resume_id=payload.resume_id, status="submitted")
    db.add(row); db.commit(); db.refresh(row)
    return row
