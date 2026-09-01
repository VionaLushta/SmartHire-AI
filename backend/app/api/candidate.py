from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_candidate
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.candidate import CandidateRead, CandidateUpdate
from app.services.candidate_service import CandidateService

router = APIRouter(prefix="/candidate", tags=["candidate"])


@router.get("/profile", response_model=CandidateRead)
def get_candidate_profile(
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateRead:
    service = CandidateService(db)
    return service.get_profile(current_user.user_id)


@router.put("/profile", response_model=CandidateRead)
def update_candidate_profile(
    payload: CandidateUpdate,
    current_user: CurrentUserResponse = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateRead:
    service = CandidateService(db)
    return service.update_profile(current_user.user_id, payload)


@router.get("/{candidate_id}", response_model=CandidateRead)
def get_candidate(
    candidate_id: uuid.UUID,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CandidateRead:
    if current_user.role_name != "Admin" and current_user.user_id != candidate_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
    service = CandidateService(db)
    return service.get_profile(candidate_id)
