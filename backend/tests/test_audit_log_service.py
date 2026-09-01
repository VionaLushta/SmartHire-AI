from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import insert
from sqlalchemy.orm import sessionmaker

from app.api.audit_logs import get_audit_log_service
from app.core.dependencies import get_current_user, get_db
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.schemas.audit_log import AuditLogCreateRequest
from app.services.audit_log_service import AuditLogService


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


def _seed_users(test_db) -> dict[str, CurrentUserResponse]:
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


def test_audit_log_service_records_filters_and_exports(test_db, tmp_path):
    users = _seed_users(test_db)
    service = AuditLogService(test_db, report_root=tmp_path)

    first = service.record_event(
        AuditLogCreateRequest(
            user_id=users["candidate"].user_id,
            user_role="Candidate",
            action="Resume Upload",
            entity_type="Resume",
            entity_id="101",
            description="Candidate uploaded a resume.",
            status="Success",
            metadata={"source": "upload"},
        )
    )
    second = service.record_event(
        AuditLogCreateRequest(
            user_id=users["recruiter"].user_id,
            user_role="Recruiter",
            action="Candidate Ranking Generated",
            entity_type="CandidateRanking",
            entity_id="202",
            description="Ranking generated for a job.",
            status="Success",
        )
    )
    third = service.record_event(
        AuditLogCreateRequest(
            user_id=users["admin"].user_id,
            user_role="Admin",
            action="Failed Login",
            entity_type="Authentication",
            entity_id="ava.admin@smarthire.ai",
            description="Invalid credentials.",
            status="Failed",
        )
    )
    service.record_event(
        AuditLogCreateRequest(
            user_id=users["admin"].user_id,
            user_role="Admin",
            action="Power BI Export",
            entity_type="PowerBI",
            entity_id="powerbi_dataset",
            description="Power BI export completed.",
            status="Success",
        )
    )

    filtered = service.list_logs(users["admin"], role="Recruiter", action="Ranking", entity_type="CandidateRanking")
    assert filtered.total == 1
    assert filtered.items[0].log_id == second.log_id

    security = service.security_logs(users["admin"])
    assert security.total >= 1
    assert any(item.log_id == third.log_id for item in security.items)

    recent = service.recent_logs(users["admin"], limit=2)
    assert len(recent.items) == 2
    assert recent.total >= 4

    csv_bytes, csv_type, csv_name = service.export(users["admin"], report_format="csv")
    assert csv_type == "text/csv"
    assert csv_name == "audit_logs.csv"
    assert b"Resume Upload" in csv_bytes

    json_bytes, json_type, json_name = service.export(users["admin"], report_format="json")
    assert json_type == "application/json"
    assert json_name == "audit_logs.json"
    payload = json.loads(json_bytes.decode("utf-8"))
    assert payload["dataset"]["name"] == "audit_logs"

    forbidden = False
    try:
        service.list_logs(users["candidate"])
    except Exception:
        forbidden = True
    assert forbidden is True


def test_audit_log_api_permissions_and_export(test_db, tmp_path):
    users = _seed_users(test_db)
    service = AuditLogService(test_db, report_root=tmp_path)
    request_session = sessionmaker(bind=test_db.get_bind())()
    app.dependency_overrides[get_db] = lambda: request_session
    app.dependency_overrides[get_audit_log_service] = lambda: service
    try:
        with TestClient(app) as client:
            app.dependency_overrides[get_current_user] = lambda: users["candidate"]
            forbidden = client.get("/audit-logs")
            assert forbidden.status_code == 403

            app.dependency_overrides[get_current_user] = lambda: users["recruiter"]
            forbidden = client.get("/audit-logs")
            assert forbidden.status_code == 403

            app.dependency_overrides[get_current_user] = lambda: users["admin"]
            response = client.get("/audit-logs")
            assert response.status_code == 200
            assert response.json()["total"] == 0

            service.record_event(
                AuditLogCreateRequest(
                    user_id=users["recruiter"].user_id,
                    user_role="Recruiter",
                    action="Interview Scheduled",
                    entity_type="Interview",
                    entity_id="300",
                    description="Interview scheduled for tomorrow.",
                    status="Success",
                )
            )
            service.record_event(
                AuditLogCreateRequest(
                    user_id=users["admin"].user_id,
                    user_role="Admin",
                    action="Workflow Error",
                    entity_type="Workflow",
                    entity_id="400",
                    description="Unexpected workflow error.",
                    status="Failed",
                )
            )

            recent = client.get("/audit-logs/recent")
            assert recent.status_code == 200
            assert len(recent.json()["items"]) >= 1

            security = client.get("/audit-logs/security")
            assert security.status_code == 200
            assert security.json()["total"] >= 1

            export_response = client.get("/audit-logs/export", params={"format": "json"})
            assert export_response.status_code == 200
            assert export_response.headers["content-type"].startswith("application/json")
            assert export_response.headers["content-disposition"].endswith('.json"')
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_audit_log_service, None)
        app.dependency_overrides.pop(get_current_user, None)
