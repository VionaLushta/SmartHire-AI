from __future__ import annotations

from datetime import datetime, timezone
import uuid

import pytest
from sqlalchemy import insert
from pydantic import ValidationError

from app.models.application import Application
from app.models.company import Company
from app.models.job import Department, Job
from app.models.resume import Resume
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.schemas.skills import JobSkillUpsertRequest, JobSkillUpdateRequest
from app.services.job_skill_service import JobSkillService


def _seed_environment(test_db):
    admin_role_id = test_db.execute(
        insert(Role.__table__).values(name="Admin", description="Administrator")
    ).inserted_primary_key[0]
    candidate_role_id = test_db.execute(
        insert(Role.__table__).values(name="Candidate", description="Candidate")
    ).inserted_primary_key[0]

    admin_id = uuid.uuid4()
    candidate_id = uuid.uuid4()
    company_id = test_db.execute(
        insert(Company.__table__).values(
            name="SmartHire Labs",
            industry="Technology",
            website="https://example.com",
            logo=None,
            location="Remote",
        )
    ).inserted_primary_key[0]
    department_id = test_db.execute(
        insert(Department.__table__).values(
            company_id=company_id,
            name="Engineering",
            description="Builds internal platforms",
        )
    ).inserted_primary_key[0]
    job_id = test_db.execute(
        insert(Job.__table__).values(
            company_id=company_id,
            department_id=department_id,
            title="Backend Python Developer",
            description="Build APIs with Python and FastAPI.",
            employment_type="Full-time",
            experience_level="Mid",
            location="Remote",
            remote_option=True,
            status="open",
        )
    ).inserted_primary_key[0]
    second_job_id = test_db.execute(
        insert(Job.__table__).values(
            company_id=company_id,
            department_id=department_id,
            title="Data Analyst",
            description="Analytics dashboards and SQL reporting.",
            employment_type="Full-time",
            experience_level="Junior",
            location="Berlin",
            remote_option=False,
            status="open",
        )
    ).inserted_primary_key[0]

    test_db.execute(
        insert(User.__table__).values(
            user_id=admin_id,
            role_id=admin_role_id,
            first_name="Admin",
            last_name="User",
            email="admin@example.com",
            password_hash="hash",
        )
    )
    test_db.execute(
        insert(User.__table__).values(
            user_id=candidate_id,
            role_id=candidate_role_id,
            first_name="Mina",
            last_name="Ali",
            email="mina@example.com",
            password_hash="hash",
        )
    )

    resume_id = test_db.execute(
        insert(Resume.__table__).values(
            user_id=candidate_id,
            file_path="/tmp/candidate.pdf",
            parsed_text=(
                "Python FastAPI PostgreSQL REST APIs Docker backend engineer with Git "
                "workflow and deployment experience."
            ),
        )
    ).inserted_primary_key[0]
    test_db.execute(
        insert(Application.__table__).values(
            user_id=candidate_id,
            job_id=job_id,
            resume_id=resume_id,
            status="submitted",
        )
    )
    test_db.execute(
        insert(Application.__table__).values(
            user_id=candidate_id,
            job_id=second_job_id,
            resume_id=resume_id,
            status="submitted",
        )
    )
    test_db.commit()

    admin_user = CurrentUserResponse(
        user_id=admin_id,
        role_id=admin_role_id,
        role_name="Admin",
        first_name="Admin",
        last_name="User",
        email="admin@example.com",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    candidate_user = CurrentUserResponse(
        user_id=candidate_id,
        role_id=candidate_role_id,
        role_name="Candidate",
        first_name="Mina",
        last_name="Ali",
        email="mina@example.com",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    return {
        "admin": admin_user,
        "candidate": candidate_user,
        "job_id": job_id,
        "second_job_id": second_job_id,
        "candidate_id": candidate_id,
    }


def test_job_skill_crud_and_grouping(test_db):
    seeded = _seed_environment(test_db)
    service = JobSkillService(test_db)

    created = service.add_job_skill(
        seeded["job_id"],
        JobSkillUpsertRequest(
            name="Python", category="Backend", is_required=True, required_level=5
        ),
        seeded["admin"],
    )
    service.add_job_skill(
        seeded["job_id"],
        JobSkillUpsertRequest(name="Docker", category="DevOps", is_required=False),
        seeded["admin"],
    )
    updated = service.update_job_skill(
        seeded["job_id"],
        created.skill_id,
        JobSkillUpdateRequest(is_required=False, required_level=3),
        seeded["admin"],
    )
    grouped = service.get_job_skills(seeded["job_id"], seeded["admin"])

    assert updated.is_required is False
    assert grouped.required_skills == []
    assert {skill.name for skill in grouped.optional_skills} == {"Python", "Docker"}

    service.delete_job_skill(seeded["job_id"], created.skill_id, seeded["admin"])
    grouped_after_delete = service.get_job_skills(seeded["job_id"], seeded["admin"])
    assert {skill.name for skill in grouped_after_delete.optional_skills} == {"Docker"}


def test_job_skill_create_requires_category():
    with pytest.raises(ValidationError):
        JobSkillUpsertRequest(name="Python", is_required=True)


def test_candidate_skill_detection(test_db):
    seeded = _seed_environment(test_db)
    service = JobSkillService(test_db)

    service.add_job_skill(
        seeded["job_id"],
        JobSkillUpsertRequest(name="Python", category="Backend", is_required=True),
        seeded["admin"],
    )
    service.add_job_skill(
        seeded["job_id"],
        JobSkillUpsertRequest(name="FastAPI", category="Backend", is_required=True),
        seeded["admin"],
    )
    service.add_job_skill(
        seeded["job_id"],
        JobSkillUpsertRequest(name="PostgreSQL", category="Database", is_required=True),
        seeded["admin"],
    )
    service.add_job_skill(
        seeded["job_id"],
        JobSkillUpsertRequest(name="REST API", category="Backend", is_required=True),
        seeded["admin"],
    )
    service.add_job_skill(
        seeded["job_id"],
        JobSkillUpsertRequest(name="Docker", category="DevOps", is_required=False),
        seeded["admin"],
    )
    service.add_job_skill(
        seeded["job_id"],
        JobSkillUpsertRequest(name="Redis", category="Cache", is_required=False),
        seeded["admin"],
    )

    report = service.evaluate_candidate_skills(
        seeded["candidate_id"], seeded["candidate"], job_id=seeded["job_id"]
    )

    statuses = {item.name: item.status for item in report.report}
    assert statuses["Python"] == "Detected"
    assert statuses["FastAPI"] == "Detected"
    assert statuses["Redis"] == "Missing"
    assert report.final_skill_match > 0
    assert any("Git workflow" in strength for strength in report.strengths)
    assert any("Redis missing" in gap for gap in report.gaps)


def test_skill_analytics_generation(test_db):
    seeded = _seed_environment(test_db)
    service = JobSkillService(test_db)

    service.add_job_skill(
        seeded["job_id"],
        JobSkillUpsertRequest(name="Python", category="Backend", is_required=True),
        seeded["admin"],
    )
    service.add_job_skill(
        seeded["job_id"],
        JobSkillUpsertRequest(name="FastAPI", category="Backend", is_required=True),
        seeded["admin"],
    )
    service.add_job_skill(
        seeded["second_job_id"],
        JobSkillUpsertRequest(name="SQL", category="Data", is_required=True),
        seeded["admin"],
    )
    service.add_job_skill(
        seeded["second_job_id"],
        JobSkillUpsertRequest(name="Power BI", category="Data", is_required=False),
        seeded["admin"],
    )

    analytics = service.analytics(seeded["admin"])

    assert analytics.most_common_skills
    assert analytics.most_missing_skills
    assert analytics.average_skill_match_per_job
    assert any(point.label == "Python" for point in analytics.required_skills_coverage)
    assert any(point.label == "Power BI" for point in analytics.optional_skills_coverage)


def test_skill_library_seed_and_grouping(test_db):
    service = JobSkillService(test_db)

    created = service.seed_skill_library()
    library = service.get_skill_library()

    assert created > 0
    assert library.total_skills == created
    backend_group = next(group for group in library.categories if group.category == "Backend")
    assert any(skill.name == "Python" for skill in backend_group.skills)
    assert any(group.category == "DevOps" for group in library.categories)
