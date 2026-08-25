from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.auth import CurrentUserResponse
from app.schemas.notification import (
    NotificationActionResponse,
    NotificationCountResponse,
    NotificationFilter,
    NotificationItem,
    NotificationListResponse,
    NotificationQuery,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_notification_service(db: Session = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    filter: NotificationFilter = Query("all", alias="filter"),
    limit: int = Query(50, ge=1, le=200),
    current_user: CurrentUserResponse = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationListResponse:
    return service.list_notifications(current_user, NotificationQuery(filter=filter, limit=limit))


@router.get("/unread", response_model=NotificationListResponse)
def unread_notifications(
    limit: int = Query(50, ge=1, le=200),
    current_user: CurrentUserResponse = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationListResponse:
    return service.unread_notifications(current_user, limit=limit)


@router.get("/count", response_model=NotificationCountResponse)
def notification_count(
    current_user: CurrentUserResponse = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationCountResponse:
    return service.unread_count(current_user)


@router.post("/read-all", response_model=NotificationActionResponse)
def read_all_notifications(
    current_user: CurrentUserResponse = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationActionResponse:
    return service.mark_all_as_read(current_user)


@router.post("/read/{notification_id}", response_model=NotificationItem)
def read_notification(
    notification_id: UUID,
    current_user: CurrentUserResponse = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationItem:
    return service.mark_as_read(current_user, notification_id)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: UUID,
    current_user: CurrentUserResponse = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> None:
    service.delete_notification(current_user, notification_id)
