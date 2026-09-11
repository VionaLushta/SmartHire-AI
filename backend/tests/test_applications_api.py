from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, insert, select
from sqlalchemy.orm import sessionmaker

from app.core.dependencies import get_current_user
from app.core.dependencies import get_current_user_optional
from app.database.database import get_db
from app.main import app
from app.models.application import AIAnalysis
from app.models.company import Company
from app.models.job import Department, Job
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import CurrentUserResponse


def _candidate_user(candidate_id):
    now = datetime.now(timezone.utc)
    return CurrentUserResponse(
        user_id=candidate_id,
        role_id=1,
        role_name="Candidate",
        first_name="Candidate",
        last_name="User",
        email="candidate@smarthire.ai",
        phone=None,
        email_verified_at=now,
        last_login_at=now,
        auth_provider=None,
        auth_provider_subject=None,
        company_id=None,
        company_name=None,
        company_position=None,
        is_verified=True,
        profile_picture_url=None,
        city=None,
        country=None,
        linkedin_url=None,
        github_url=None,
        portfolio_url=None,
        created_at=now,
        updated_at=now,
    )


def _admin_user():
    now = datetime.now(timezone.utc)
    return CurrentUserResponse(
        user_id=uuid4(),
        role_id=2,
        role_name="Admin",
        first_name="SmartHire",
        last_name="Administrator",
        email="admin@smarthire.ai",
        phone=None,
        email_verified_at=now,
        last_login_at=now,
        auth_provider=None,
        auth_provider_subject=None,
        company_id=None,
        company_name=None,
        company_position=None,
        is_verified=True,
        profile_picture_url=None,
        city=None,
        country=None,
        linkedin_url=None,
        github_url=None,
        portfolio_url=None,
        created_at=now,
        updated_at=now,
    )


def _seed_application_data(test_db):
    candidate_role_id = test_db.execute(
        insert(Role.__table__).values(name="Candidate", description="Candidate")
    ).inserted_primary_key[0]
    company_id = test_db.execute(
        insert(Company.__table__).values(
            name="SmartHire Labs",
            industry="Technology",
            website="https://smarthire.ai",
            location="Remote",
        )
    ).inserted_primary_key[0]
    department_id = test_db.execute(
        insert(Department.__table__).values(
            company_id=company_id,
            name="Engineering",
            description="Platform team",
        )
    ).inserted_primary_key[0]
    job_id = test_db.execute(
        insert(Job.__table__).values(
            company_id=company_id,
            department_id=department_id,
            title="Backend Engineer",
            description="Build APIs",
            employment_type="Full-time",
            experience_level="Mid",
            location="Remote",
            remote_option=True,
            status="open",
        )
    ).inserted_primary_key[0]
    candidate_id = uuid4()
    test_db.execute(
        insert(User.__table__).values(
            user_id=candidate_id,
            role_id=candidate_role_id,
            first_name="Candidate",
            last_name="User",
            email="candidate@smarthire.ai",
            password_hash="hash",
            email_verified_at=datetime.now(timezone.utc),
        )
    )
    test_db.commit()
    return {"candidate_id": candidate_id, "job_id": job_id}


def test_candidate_can_create_and_list_applications(test_db):
    seeded = _seed_application_data(test_db)
    request_session = sessionmaker(bind=test_db.get_bind())()
    app.dependency_overrides[get_current_user] = lambda: _candidate_user(seeded["candidate_id"])
    app.dependency_overrides[get_current_user_optional] = lambda: _candidate_user(seeded["candidate_id"])
    app.dependency_overrides[get_db] = lambda: request_session

    try:
        with TestClient(app) as client:
            create_response = client.post("/applications", json={"job_id": seeded["job_id"]})
            assert create_response.status_code == 201
            created = create_response.json()
            assert created["job_id"] == seeded["job_id"]
            assert created["status"] == "submitted"

            analysis_count = test_db.scalar(
                select(func.count())
                .select_from(AIAnalysis.__table__)
                .where(AIAnalysis.__table__.c.application_id == created["application_id"])
            )
            assert analysis_count == 1

            list_response = client.get("/applications")
            assert list_response.status_code == 200
            payload = list_response.json()
            assert payload["total_items"] == 1
            assert payload["items"][0]["job_id"] == seeded["job_id"]

            app.dependency_overrides[get_current_user] = _admin_user
            admin_list_response = client.get("/applications")
            assert admin_list_response.status_code == 200
            admin_payload = admin_list_response.json()
            assert admin_payload["total_items"] == 1
            admin_item = admin_payload["items"][0]
            assert admin_item["application_id"] == created["application_id"]
            assert admin_item["candidate_name"] == "Candidate User"
            assert admin_item["job_title"] == "Backend Engineer"
            assert admin_item["overall_score"] is not None
            app.dependency_overrides[get_current_user] = lambda: _candidate_user(seeded["candidate_id"])

            duplicate_response = client.post("/applications", json={"job_id": seeded["job_id"]})
            assert duplicate_response.status_code == 409

            delete_response = client.delete(f"/applications/{created['application_id']}")
            assert delete_response.status_code == 204

            empty_response = client.get("/applications")
            assert empty_response.status_code == 200
            empty_payload = empty_response.json()
            assert empty_payload["total_items"] == 0
            assert empty_payload["items"] == []
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_current_user_optional, None)
        app.dependency_overrides.pop(get_db, None)
        request_session.close()
