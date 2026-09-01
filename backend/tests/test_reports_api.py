from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import insert
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_db
from app.main import app
from app.models.application import AIAnalysis, Application
from app.models.company import Company
from app.models.interview import Interview
from app.models.job import Department, Job, JobSkill
from app.models.resume import Resume
from app.models.resume_skill import ResumeSkill
from app.models.role import Role
from app.models.skill import Skill
from app.models.user import User
from app.schemas.auth import CurrentUserResponse


def _admin_user(user_id, role_id) -> CurrentUserResponse:
    now = datetime.now(timezone.utc)
    return CurrentUserResponse(
        user_id=user_id,
        role_id=role_id,
        role_name="Admin",
        first_name="Ava",
        last_name="Admin",
        email="ava.admin@smarthire.ai",
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


def _seed_report_data(test_db):
    admin_role_id = test_db.execute(
        insert(Role.__table__).values(name="Admin", description="Administrator")
    ).inserted_primary_key[0]
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
            description="Build APIs with Python and FastAPI.",
            responsibilities="APIs",
            requirements="Python",
            employment_type="Full-time",
            experience_level="Mid",
            location="Remote",
            remote_option=True,
            status="open",
        )
    ).inserted_primary_key[0]
    python_skill_id = test_db.execute(
        insert(Skill.__table__).values(name="Python", category="Backend")
    ).inserted_primary_key[0]
    docker_skill_id = test_db.execute(
        insert(Skill.__table__).values(name="Docker", category="DevOps")
    ).inserted_primary_key[0]
    test_db.execute(
        insert(JobSkill.__table__).values(
            job_id=job_id,
            skill_id=python_skill_id,
            is_required=True,
            required_level=4,
        )
    )
    test_db.execute(
        insert(JobSkill.__table__).values(
            job_id=job_id,
            skill_id=docker_skill_id,
            is_required=True,
            required_level=3,
        )
    )
    admin_id = uuid4()
    candidate_id = uuid4()
    test_db.execute(
        insert(User.__table__).values(
            user_id=admin_id,
            role_id=admin_role_id,
            first_name="Ava",
            last_name="Admin",
            email="ava.admin@smarthire.ai",
            password_hash="hash-admin",
            email_verified_at=datetime.now(timezone.utc),
        )
    )
    test_db.execute(
        insert(User.__table__).values(
            user_id=candidate_id,
            role_id=candidate_role_id,
            first_name="Dana",
            last_name="Lee",
            email="dana.lee@example.com",
            password_hash="hash-candidate",
            email_verified_at=datetime.now(timezone.utc),
        )
    )
    resume_id = test_db.execute(
        insert(Resume.__table__).values(
            user_id=candidate_id,
            file_path="resume.pdf",
            parsed_text="Python FastAPI backend developer",
        )
    ).inserted_primary_key[0]
    test_db.execute(
        insert(ResumeSkill.__table__).values(
            resume_id=resume_id,
            skill_id=python_skill_id,
            confidence=95.0,
        )
    )
    application_id = test_db.execute(
        insert(Application.__table__).values(
            user_id=candidate_id,
            job_id=job_id,
            resume_id=resume_id,
            status="accepted",
            created_at=datetime(2026, 8, 1, tzinfo=timezone.utc),
        )
    ).inserted_primary_key[0]
    test_db.execute(
        insert(AIAnalysis.__table__).values(
            application_id=application_id,
            overall_score=87.5,
            skills_score=90.0,
            education_score=78.0,
            experience_score=84.0,
            certificate_score=70.0,
            recommendations="Strong backend match",
        )
    )
    test_db.execute(
        insert(Interview.__table__).values(
            application_id=application_id,
            interviewer_id=admin_id,
            scheduled_at=datetime(2026, 8, 5, tzinfo=timezone.utc),
            interview_type="Technical",
            status="scheduled",
        )
    )
    test_db.commit()
    return {
        "admin": _admin_user(admin_id, admin_role_id),
        "company_id": company_id,
        "department_id": department_id,
        "job_id": job_id,
        "application_id": application_id,
    }


def test_reports_endpoints_with_live_data(test_db, tmp_path, monkeypatch):
    seeded = _seed_report_data(test_db)
    request_session = sessionmaker(bind=test_db.get_bind())()

    class DummySettings:
        report_folder = str(tmp_path)

    monkeypatch.setattr("app.services.report_service.get_settings", lambda: DummySettings())

    app.dependency_overrides[get_current_user] = lambda: seeded["admin"]
    app.dependency_overrides[get_db] = lambda: request_session

    try:
        with TestClient(app) as client:
            list_response = client.get("/reports")
            assert list_response.status_code == 200
            list_payload = list_response.json()
            assert len(list_payload["items"]) >= 3

            analytics_response = client.get("/reports/analytics")
            assert analytics_response.status_code == 200
            analytics_payload = analytics_response.json()
            assert analytics_payload["kpis"]["total_applications"] == 1
            assert analytics_payload["kpis"]["active_jobs"] == 1
            assert analytics_payload["charts"]["applications_per_month"]

            csv_response = client.get("/reports/export/csv")
            assert csv_response.status_code == 200
            assert csv_response.headers["content-type"].startswith("text/csv")
            assert "attachment;" in csv_response.headers["content-disposition"]

            refreshed = client.get("/reports").json()["items"]
            report_id = refreshed[0]["report_id"]
            download_response = client.get(f"/reports/{report_id}/download")
            assert download_response.status_code == 200
            assert download_response.headers["content-type"]

            delete_response = client.delete(f"/reports/{report_id}")
            assert delete_response.status_code == 204
            after_delete = client.get("/reports").json()["items"]
            assert all(item["report_id"] != report_id for item in after_delete)
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        request_session.close()
