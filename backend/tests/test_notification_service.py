from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import insert
from sqlalchemy.orm import sessionmaker

from app.api.notifications import get_notification_service
from app.core.dependencies import get_current_user, get_db
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.schemas.notification import NotificationCreateRequest, NotificationQuery
from app.services.notification_service import NotificationService


def _current_user(
    *,
    user_id: UUID,
    role_id: int,
    role_name: str,
    first_name: str,
    last_name: str,
    email: str,
) -> CurrentUserResponse:
    now = datetime.now(timezone.utc)
    return CurrentUserResponse(
        user_id=user_id,
        role_id=role_id,
        role_name=role_name,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=None,
        profile_picture_url=None,
        city=None,
        country=None,
        linkedin_url=None,
        github_url=None,
        portfolio_url=None,
        created_at=now,
        updated_at=now,
    )


def _seed_notification_users(test_db) -> dict[str, CurrentUserResponse]:
    admin_role_id = test_db.execute(
        insert(Role.__table__).values(name="Admin", description="Administrator")
    ).inserted_primary_key[0]
    recruiter_role_id = test_db.execute(
        insert(Role.__table__).values(name="Recruiter", description="Recruiter")
    ).inserted_primary_key[0]
    company_role_id = test_db.execute(
        insert(Role.__table__).values(name="Company", description="Company")
    ).inserted_primary_key[0]
    candidate_role_id = test_db.execute(
        insert(Role.__table__).values(name="Candidate", description="Candidate")
    ).inserted_primary_key[0]

    admin_id = test_db.execute(
        insert(User.__table__).values(
            role_id=admin_role_id,
            first_name="Ava",
            last_name="Admin",
            email="ava.admin@smarthire.ai",
            password_hash="hash-admin",
        )
    ).inserted_primary_key[0]
    recruiter_id = test_db.execute(
        insert(User.__table__).values(
            role_id=recruiter_role_id,
            first_name="Maya",
            last_name="Stone",
            email="maya.stone@smarthire.ai",
            password_hash="hash-recruiter",
        )
    ).inserted_primary_key[0]
    company_id = test_db.execute(
        insert(User.__table__).values(
            role_id=company_role_id,
            first_name="Cody",
            last_name="Corp",
            email="cody.corp@smarthire.ai",
            password_hash="hash-company",
        )
    ).inserted_primary_key[0]
    candidate_id = test_db.execute(
        insert(User.__table__).values(
            role_id=candidate_role_id,
            first_name="Dana",
            last_name="Lee",
            email="dana.lee@example.com",
            password_hash="hash-candidate",
        )
    ).inserted_primary_key[0]
    test_db.commit()
    return {
        "admin": _current_user(
            user_id=admin_id,
            role_id=admin_role_id,
            role_name="Admin",
            first_name="Ava",
            last_name="Admin",
            email="ava.admin@smarthire.ai",
        ),
        "recruiter": _current_user(
            user_id=recruiter_id,
            role_id=recruiter_role_id,
            role_name="Recruiter",
            first_name="Maya",
            last_name="Stone",
            email="maya.stone@smarthire.ai",
        ),
        "company": _current_user(
            user_id=company_id,
            role_id=company_role_id,
            role_name="Company",
            first_name="Cody",
            last_name="Corp",
            email="cody.corp@smarthire.ai",
        ),
        "candidate": _current_user(
            user_id=candidate_id,
            role_id=candidate_role_id,
            role_name="Candidate",
            first_name="Dana",
            last_name="Lee",
            email="dana.lee@example.com",
        ),
    }


def _create_seed_notifications(service: NotificationService, users: dict[str, CurrentUserResponse]) -> dict[str, UUID]:
    candidate_application = service.create_notification(
        recipient_user_id=users["candidate"].user_id,
        recipient_role="Candidate",
        title="Application Received",
        message="Your application was received.",
        type="Application Received",
        priority="Normal",
        related_candidate_id=users["candidate"].user_id,
        related_job_id=101,
    )
    candidate_interview = service.create_notification(
        recipient_user_id=users["candidate"].user_id,
        recipient_role="Candidate",
        title="Interview Scheduled",
        message="Your interview is scheduled for tomorrow.",
        type="Interview Scheduled",
        priority="High",
        related_candidate_id=users["candidate"].user_id,
        related_job_id=101,
    )
    recruiter_match = service.create_notification(
        recipient_user_id=users["recruiter"].user_id,
        recipient_role="Recruiter",
        title="High Match Candidate",
        message="A new candidate matches your job requirements.",
        type="High Match Candidate",
        priority="High",
        related_candidate_id=users["candidate"].user_id,
        related_job_id=101,
    )
    company_alert = service.create_notification(
        recipient_user_id=users["company"].user_id,
        recipient_role="Company",
        title="Interview Completed",
        message="An interview was completed for your hiring pipeline.",
        type="Interview Completed",
        priority="Normal",
        related_candidate_id=users["candidate"].user_id,
        related_job_id=101,
    )
    admin_alert = service.create_notification(
        recipient_user_id=None,
        recipient_role="Admin",
        title="System Alert",
        message="Workflow error detected in the scheduler.",
        type="Workflow Error",
        priority="Urgent",
        is_system=True,
    )

    notifications_path = service.notifications_path
    payload = json.loads(notifications_path.read_text(encoding="utf-8"))
    payload[0]["timestamp"] = (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
    notifications_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    return {
        "candidate_application": candidate_application.notification_id,
        "candidate_interview": candidate_interview.notification_id,
        "recruiter_match": recruiter_match.notification_id,
        "company_alert": company_alert.notification_id,
        "admin_alert": admin_alert.notification_id,
    }


def test_notification_service_supports_creation_filters_read_status_and_permissions(test_db, tmp_path):
    users = _seed_notification_users(test_db)
    service = NotificationService(test_db, report_root=tmp_path)
    ids = _create_seed_notifications(service, users)

    candidate_list = service.list_notifications(users["candidate"])
    assert candidate_list.total == 2
    assert candidate_list.unread_count == 2
    assert all(item.recipient_role == "Candidate" for item in candidate_list.items)

    today_only = service.list_notifications(users["candidate"], NotificationQuery(filter="today", limit=50))
    assert today_only.total == 1
    this_week = service.list_notifications(users["candidate"], NotificationQuery(filter="this_week", limit=50))
    assert this_week.total == 1
    high_priority = service.list_notifications(users["candidate"], NotificationQuery(filter="high_priority", limit=50))
    assert high_priority.total == 1
    recruitment = service.list_notifications(users["candidate"], NotificationQuery(filter="recruitment", limit=50))
    assert recruitment.total == 1
    interview = service.list_notifications(users["candidate"], NotificationQuery(filter="interview", limit=50))
    assert interview.total == 1

    read_notification = service.mark_as_read(users["candidate"], ids["candidate_application"])
    assert read_notification.read_status is True
    assert service.unread_count(users["candidate"]).unread_count == 1

    deleted_source = service.mark_as_read(users["candidate"], ids["candidate_interview"])
    assert deleted_source.read_status is True
    service.delete_notification(users["candidate"], ids["candidate_interview"])
    assert service.unread_count(users["candidate"]).unread_count == 0

    admin_list = service.list_notifications(users["admin"])
    assert admin_list.total == 1
    assert admin_list.items[0].is_system is True
    assert admin_list.items[0].recipient_role == "Admin"
    assert service.unread_count(users["admin"]).unread_count == 1

    company_list = service.list_notifications(users["company"])
    assert company_list.total == 1
    assert company_list.items[0].title == "Interview Completed"

    forbidden = False
    try:
        service.mark_as_read(users["candidate"], ids["recruiter_match"])
    except Exception:
        forbidden = True
    assert forbidden is True


def test_notification_api_enforces_ownership_and_admin_system_access(test_db, tmp_path):
    users = _seed_notification_users(test_db)
    service = NotificationService(test_db, report_root=tmp_path)
    ids = _create_seed_notifications(service, users)
    request_session = sessionmaker(bind=test_db.get_bind())()
    app.dependency_overrides[get_db] = lambda: request_session
    app.dependency_overrides[get_notification_service] = lambda: service
    try:
        with TestClient(app) as client:
            app.dependency_overrides[get_current_user] = lambda: users["candidate"]

            response = client.get("/notifications")
            assert response.status_code == 200
            assert response.json()["total"] == 2
            assert response.json()["unread_count"] == 2

            count_response = client.get("/notifications/count")
            assert count_response.status_code == 200
            assert count_response.json()["unread_count"] == 2

            unread_response = client.get("/notifications/unread")
            assert unread_response.status_code == 200
            assert len(unread_response.json()["items"]) == 2

            forbidden_read = client.post(f"/notifications/read/{ids['recruiter_match']}")
            assert forbidden_read.status_code == 403

            read_response = client.post(f"/notifications/read/{ids['candidate_application']}")
            assert read_response.status_code == 200
            assert read_response.json()["read_status"] is True

            mark_all = client.post("/notifications/read-all")
            assert mark_all.status_code == 200
            assert mark_all.json()["updated"] >= 1

            delete_response = client.delete(f"/notifications/{ids['candidate_interview']}")
            assert delete_response.status_code == 204

            app.dependency_overrides[get_current_user] = lambda: users["admin"]
            admin_list = client.get("/notifications")
            assert admin_list.status_code == 200
            assert admin_list.json()["total"] == 1
            assert admin_list.json()["items"][0]["is_system"] is True

            forbidden_admin_read = client.post(f"/notifications/read/{ids['candidate_application']}")
            assert forbidden_admin_read.status_code == 403

            admin_delete = client.delete(f"/notifications/{ids['admin_alert']}")
            assert admin_delete.status_code == 204
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_notification_service, None)
        app.dependency_overrides.pop(get_current_user, None)
