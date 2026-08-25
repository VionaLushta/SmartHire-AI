from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.recruiter_notes import (
    RecruiterNoteCreateRequest,
    RecruiterNoteItem,
    RecruiterNotePinRequest,
    RecruiterNoteReplyRequest,
    RecruiterNoteUpdateRequest,
    RecruiterNotesThreadResponse,
    RecruiterNoteCategory,
)
from app.services.recruiter_notes_service import RecruiterNotesService

router = APIRouter(prefix="/recruiter-notes", tags=["recruiter notes"])


def get_recruiter_notes_service(db: Session = Depends(get_db)) -> RecruiterNotesService:
    return RecruiterNotesService(db)


@router.get("/{candidate_id}", response_model=RecruiterNotesThreadResponse)
def get_candidate_recruiter_notes(
    candidate_id: UUID,
    author: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    category: RecruiterNoteCategory | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: RecruiterNotesService = Depends(get_recruiter_notes_service),
) -> RecruiterNotesThreadResponse:
    return service.get_notes(
        current_user,
        candidate_id,
        author=author,
        keyword=keyword,
        category=category,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("", response_model=RecruiterNoteItem, status_code=status.HTTP_201_CREATED)
def create_recruiter_note(
    payload: RecruiterNoteCreateRequest,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: RecruiterNotesService = Depends(get_recruiter_notes_service),
) -> RecruiterNoteItem:
    return service.create_note(current_user, payload)


@router.put("/{note_id}", response_model=RecruiterNoteItem)
def update_recruiter_note(
    note_id: str,
    payload: RecruiterNoteUpdateRequest,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: RecruiterNotesService = Depends(get_recruiter_notes_service),
) -> RecruiterNoteItem:
    return service.update_note(current_user, note_id, payload)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recruiter_note(
    note_id: str,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: RecruiterNotesService = Depends(get_recruiter_notes_service),
) -> None:
    service.delete_note(current_user, note_id)


@router.post("/{note_id}/reply", response_model=RecruiterNoteItem, status_code=status.HTTP_201_CREATED)
def reply_to_recruiter_note(
    note_id: str,
    payload: RecruiterNoteReplyRequest,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: RecruiterNotesService = Depends(get_recruiter_notes_service),
) -> RecruiterNoteItem:
    return service.reply_to_note(current_user, note_id, payload)


@router.post("/{note_id}/pin", response_model=RecruiterNoteItem)
def pin_recruiter_note(
    note_id: str,
    payload: RecruiterNotePinRequest | None = None,
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: CurrentUserResponse = Depends(require_role("admin", "recruiter")),
    service: RecruiterNotesService = Depends(get_recruiter_notes_service),
) -> RecruiterNoteItem:
    return service.pin_note(current_user, note_id, payload or RecruiterNotePinRequest())
