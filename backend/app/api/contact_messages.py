from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, insert, select, update
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database.database import get_db
from app.models.contact_message import ContactMessage
from app.schemas.auth import CurrentUserResponse
from app.schemas.contact_message import (
    ContactMessageCreate,
    ContactMessageListResponse,
    ContactMessageRead,
    ContactMessageStatusUpdate,
)

router = APIRouter(prefix="/contact-messages", tags=["contact messages"])

message_table = ContactMessage.__table__


def to_message_read(row) -> ContactMessageRead:
    return ContactMessageRead.model_validate(dict(row._mapping))


@router.post("", response_model=ContactMessageRead, status_code=status.HTTP_201_CREATED)
def create_contact_message(payload: ContactMessageCreate, db: Session = Depends(get_db)) -> ContactMessageRead:
    result = db.execute(
        insert(message_table)
        .values(
            full_name=payload.full_name,
            email=str(payload.email),
            company=payload.company,
            subject=payload.subject,
            message=payload.message,
            status="unread",
        )
        .returning(*message_table.c)
    )
    row = result.fetchone()
    db.commit()
    return to_message_read(row)


@router.get("", response_model=ContactMessageListResponse)
def list_contact_messages(
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ContactMessageListResponse:
    rows = db.execute(select(message_table).order_by(message_table.c.created_at.desc())).fetchall()
    unread_count = db.scalar(select(func.count()).select_from(message_table).where(message_table.c.status == "unread")) or 0
    return ContactMessageListResponse(
        items=[to_message_read(row) for row in rows],
        total=len(rows),
        unread_count=unread_count,
    )


@router.patch("/{message_id}/status", response_model=ContactMessageRead)
def update_contact_message_status(
    message_id: int,
    payload: ContactMessageStatusUpdate,
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ContactMessageRead:
    values = {"status": payload.status}
    if payload.status == "unread":
        values["read_at"] = None
    elif payload.status == "read":
        values["read_at"] = datetime.now(timezone.utc)
    result = db.execute(
        update(message_table)
        .where(message_table.c.message_id == message_id)
        .values(**values)
        .returning(*message_table.c)
    )
    row = result.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Contact message not found.")
    db.commit()
    return to_message_read(row)
