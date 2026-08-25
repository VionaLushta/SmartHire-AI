from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from time import perf_counter
from typing import Any, Iterable, Sequence
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.validation import clean_optional_text, clean_text
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.schemas.notification import (
    NotificationActionResponse,
    NotificationCountResponse,
    NotificationCreateRequest,
    NotificationFilter,
    NotificationItem,
    NotificationListResponse,
    NotificationPriority,
    NotificationQuery,
    NotificationType,
)

logger = logging.getLogger("smarthire.performance")


class NotificationService:
    def __init__(self, db: Session, *, report_root: str | Path | None = None) -> None:
        self.db = db
        self.settings = get_settings()
        self.report_root = self._resolve_report_root(report_root)
        self.notifications_root = self.report_root / "notifications"
        self.notifications_root.mkdir(parents=True, exist_ok=True)
        self.notifications_path = self.notifications_root / "notifications.json"

    def create_notification(
        self,
        *,
        recipient_user_id: UUID | None,
        recipient_role: str,
        title: str,
        message: str,
        type: NotificationType,
        priority: NotificationPriority = "Normal",
        related_candidate_id: UUID | None = None,
        related_job_id: int | None = None,
        is_system: bool = False,
    ) -> NotificationItem:
        now = datetime.now(timezone.utc)
        payload = {
            "notification_id": str(uuid4()),
            "recipient_user_id": str(recipient_user_id) if recipient_user_id else None,
            "recipient_role": clean_text(recipient_role, "Recipient role", max_length=100),
            "title": clean_text(title, "Notification title", max_length=255),
            "message": clean_text(message, "Notification message", max_length=4000),
            "type": type,
            "priority": priority,
            "related_candidate_id": str(related_candidate_id) if related_candidate_id else None,
            "related_job_id": related_job_id,
            "timestamp": now.isoformat(),
            "read_status": False,
            "is_system": is_system,
        }
        self._persist(self._load() + [payload])
        return self._build_item(payload)

    def list_notifications(
        self,
        current_user: CurrentUserResponse,
        query: NotificationQuery | None = None,
    ) -> NotificationListResponse:
        self._assert_access(current_user)
        started = perf_counter()
        query = query or NotificationQuery()
        notifications = self._visible_notifications(current_user)
        filtered = self._apply_filter(notifications, query.filter)
        items = self._sort_notifications(filtered)[: query.limit]
        response = NotificationListResponse(
            items=[self._build_item(item) for item in items],
            total=len(filtered),
            unread_count=sum(1 for item in filtered if not item.get("read_status")),
        )
        logger.info(
            "notifications retrieved user_id=%s role=%s count=%s duration_ms=%.1f",
            current_user.user_id,
            current_user.role_name,
            len(response.items),
            (perf_counter() - started) * 1000,
        )
        return response

    def unread_notifications(
        self,
        current_user: CurrentUserResponse,
        *,
        limit: int = 50,
    ) -> NotificationListResponse:
        return self.list_notifications(
            current_user,
            NotificationQuery(filter="unread", limit=limit),
        )

    def unread_count(self, current_user: CurrentUserResponse) -> NotificationCountResponse:
        notifications = self._visible_notifications(current_user)
        return NotificationCountResponse(
            unread_count=sum(1 for item in notifications if not item.get("read_status"))
        )

    def mark_as_read(
        self,
        current_user: CurrentUserResponse,
        notification_id: UUID,
    ) -> NotificationItem:
        notifications = self._load()
        index, payload = self._get_notification(notifications, notification_id)
        self._assert_can_access_record(current_user, payload)
        payload["read_status"] = True
        notifications[index] = payload
        self._persist(notifications)
        return self._build_item(payload)

    def mark_all_as_read(self, current_user: CurrentUserResponse) -> NotificationActionResponse:
        notifications = self._load()
        updated = 0
        for payload in notifications:
            if self._can_access_record(current_user, payload) and not payload.get("read_status"):
                payload["read_status"] = True
                updated += 1
        self._persist(notifications)
        return NotificationActionResponse(updated=updated)

    def delete_notification(self, current_user: CurrentUserResponse, notification_id: UUID) -> None:
        notifications = self._load()
        index, payload = self._get_notification(notifications, notification_id)
        self._assert_can_access_record(current_user, payload)
        notifications.pop(index)
        self._persist(notifications)

    def latest_notifications(
        self,
        current_user: CurrentUserResponse,
        *,
        limit: int = 10,
    ) -> NotificationListResponse:
        return self.list_notifications(
            current_user,
            NotificationQuery(filter="all", limit=limit),
        )

    def seed_event_notification(
        self,
        *,
        recipient_user_id: UUID | None,
        recipient_role: str,
        title: str,
        message: str,
        type: NotificationType,
        priority: NotificationPriority = "Normal",
        related_candidate_id: UUID | None = None,
        related_job_id: int | None = None,
        is_system: bool = False,
    ) -> NotificationItem:
        return self.create_notification(
            recipient_user_id=recipient_user_id,
            recipient_role=recipient_role,
            title=title,
            message=message,
            type=type,
            priority=priority,
            related_candidate_id=related_candidate_id,
            related_job_id=related_job_id,
            is_system=is_system,
        )

    def _visible_notifications(self, current_user: CurrentUserResponse) -> list[dict[str, Any]]:
        notifications = self._load()
        role = str(current_user.role_name or "").casefold()
        if role == "admin":
            return [
                item
                for item in notifications
                if bool(item.get("is_system"))
                and str(item.get("recipient_role") or "").casefold() == "admin"
            ]
        return [
            item
            for item in notifications
            if str(item.get("recipient_user_id") or "") == str(current_user.user_id)
        ]

    def _apply_filter(self, notifications: Sequence[dict[str, Any]], filter_name: NotificationFilter) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc)
        start_of_today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        start_of_week = start_of_today - timedelta(days=start_of_today.weekday())
        filter_name = clean_text(filter_name, "Notification filter", max_length=50).casefold()
        filtered: list[dict[str, Any]] = []
        for item in notifications:
            timestamp = self._parse_timestamp(item.get("timestamp"))
            priority = str(item.get("priority") or "").casefold()
            type_name = str(item.get("type") or "").casefold()
            if filter_name == "unread" and item.get("read_status"):
                continue
            if filter_name == "read" and not item.get("read_status"):
                continue
            if filter_name == "today" and timestamp < start_of_today:
                continue
            if filter_name == "this_week" and timestamp < start_of_week:
                continue
            if filter_name == "high_priority" and priority not in {"high", "urgent"}:
                continue
            if filter_name == "system" and not item.get("is_system"):
                continue
            if filter_name == "recruitment" and not (
                type_name in {
                    "application received",
                    "application status updated",
                    "new application",
                    "high match candidate",
                    "candidate accepted",
                    "candidate rejected",
                    "new candidate applied",
                }
            ):
                continue
            if filter_name == "interview" and "interview" not in type_name:
                continue
            filtered.append(item)
        return filtered

    def _sort_notifications(self, notifications: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
        return sorted(
            notifications,
            key=lambda item: (
                self._priority_rank(str(item.get("priority") or "")),
                self._parse_timestamp(item.get("timestamp")),
                str(item.get("title") or "").casefold(),
            ),
            reverse=True,
        )

    def _priority_rank(self, priority: str) -> int:
        mapping = {"low": 1, "normal": 2, "high": 3, "urgent": 4}
        return mapping.get(priority.casefold(), 2)

    def _build_item(self, payload: dict[str, Any]) -> NotificationItem:
        return NotificationItem(
            notification_id=UUID(str(payload["notification_id"])),
            recipient_user_id=UUID(str(payload["recipient_user_id"]))
            if payload.get("recipient_user_id")
            else None,
            recipient_role=str(payload["recipient_role"]),
            title=str(payload["title"]),
            message=str(payload["message"]),
            type=str(payload["type"]),
            priority=str(payload["priority"]),
            related_candidate_id=UUID(str(payload["related_candidate_id"]))
            if payload.get("related_candidate_id")
            else None,
            related_job_id=payload.get("related_job_id"),
            timestamp=self._parse_timestamp(payload.get("timestamp")),
            read_status=bool(payload.get("read_status")),
            is_system=bool(payload.get("is_system")),
        )

    def _get_notification(self, notifications: Sequence[dict[str, Any]], notification_id: UUID) -> tuple[int, dict[str, Any]]:
        for index, item in enumerate(notifications):
            if str(item.get("notification_id")) == str(notification_id):
                return index, dict(item)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    def _assert_access(self, current_user: CurrentUserResponse) -> None:
        if not current_user.role_name:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    def _assert_can_access_record(self, current_user: CurrentUserResponse, payload: dict[str, Any]) -> None:
        if str(current_user.role_name or "").casefold() == "admin":
            if not payload.get("is_system") or str(payload.get("recipient_role") or "").casefold() != "admin":
                logger.warning(
                    "security_event type=permission_denied module=notifications user_id=%s role=%s notification_id=%s",
                    current_user.user_id,
                    current_user.role_name,
                    payload.get("notification_id"),
                )
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
            return
        if str(payload.get("recipient_user_id") or "") != str(current_user.user_id):
            logger.warning(
                "security_event type=permission_denied module=notifications user_id=%s role=%s notification_id=%s",
                current_user.user_id,
                current_user.role_name,
                payload.get("notification_id"),
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    def _can_access_record(self, current_user: CurrentUserResponse, payload: dict[str, Any]) -> bool:
        try:
            self._assert_can_access_record(current_user, payload)
            return True
        except HTTPException:
            return False

    def _load(self) -> list[dict[str, Any]]:
        if not self.notifications_path.exists():
            return []
        try:
            payload = json.loads(self.notifications_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to load notifications.",
            ) from exc
        if isinstance(payload, list):
            return [dict(item) for item in payload if isinstance(item, dict)]
        return []

    def _persist(self, notifications: list[dict[str, Any]]) -> None:
        try:
            self.notifications_path.parent.mkdir(parents=True, exist_ok=True)
            self.notifications_path.write_text(
                json.dumps(notifications, default=str, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to save notifications.",
            ) from exc

    def _parse_timestamp(self, value: Any) -> datetime:
        if isinstance(value, datetime):
            timestamp = value
        else:
            timestamp = datetime.fromisoformat(str(value))
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        return timestamp.astimezone(timezone.utc)

    def _resolve_report_root(self, report_root: str | Path | None) -> Path:
        if report_root is None:
            configured = getattr(self.settings, "report_folder", None)
            if configured:
                return Path(str(configured)).expanduser().resolve()
            return Path("reports").resolve()
        return Path(report_root).expanduser().resolve()

