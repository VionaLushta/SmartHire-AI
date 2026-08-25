from __future__ import annotations

import json
from datetime import date, datetime, timezone
from io import StringIO
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert
from sqlalchemy.orm import sessionmaker

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.main import app
from app.models.application import AIAnalysis, Application
from app.models.certificate import Certificate, CertificateSkill
from app.models.company import Company
from app.models.company_user import CompanyUser
from app.models.interview import Interview, InterviewFeedback
from app.models.job import Department, Job, JobSkill
from app.models.resume import Education, Language, Resume, UserLanguage, WorkExperience
from app.models.resume_skill import ResumeSkill
from app.models.role import Role
from app.models.skill import Skill
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.services.candidate_ranking_service import CandidateRankingService


def _admin_user() -> CurrentUserResponse:
    now = datetime.now(timezone.utc)
    return CurrentUserResponse(
        user_id=uuid4(),
        role_id=1,
        role_name="Admin",
        first_name="Admin",
        last_name="User",
        email="admin@smarthire.ai",
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


def _candidate_user(candidate_id: UUID) -> CurrentUserResponse:
    now = datetime.now(timezone.utc)
    return CurrentUserResponse(
        user_id=candidate_id,
        role_id=3,
        role_name="Candidate",
        first_name="Candidate",
        last_name="User",
        email="candidate@smarthire.ai",
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


def _seed_ranking_data(test_db):
    admin_role_id = test_db.execute(
        insert(Role.__table__).values(name="Admin", description="Administrator")
    ).inserted_primary_key[0]
    recruiter_role_id = test_db.execute(
        insert(Role.__table__).values(name="Recruiter", description="Recruiter")
    ).inserted_primary_key[0]
    candidate_role_id = test_db.execute(
        insert(Role.__table__).values(name="Candidate", description="Candidate")
    ).inserted_primary_key[0]

    company_id = test_db.execute(
        insert(Company.__table__).values(
            name="SmartHire Labs",
            industry="Technology",
            website="https://smarthire.ai",
            logo=None,
            location="Remote",
        )
    ).inserted_primary_key[0]
    department_id = test_db.execute(
        insert(Department.__table__).values(
            company_id=company_id,
            name="Engineering",
            description="Platform and hiring systems",
        )
    ).inserted_primary_key[0]
    job_id = test_db.execute(
        insert(Job.__table__).values(
            company_id=company_id,
            department_id=department_id,
            title="Senior Backend Python Developer",
            description="Build APIs with Python, FastAPI, PostgreSQL, Docker, AWS, and communication skills.",
            employment_type="Full-time",
            experience_level="Senior",
            location="Remote",
            remote_option=True,
            status="open",
        )
    ).inserted_primary_key[0]

    skill_ids = {}
    for name, category in (
        ("Python", "Backend"),
        ("FastAPI", "Backend"),
        ("PostgreSQL", "Database"),
        ("Docker", "DevOps"),
        ("AWS", "Cloud"),
        ("React", "Frontend"),
        ("Communication", "Soft Skills"),
    ):
        skill_ids[name] = test_db.execute(
            insert(Skill.__table__).values(name=name, category=category)
        ).inserted_primary_key[0]

    for skill_name, required in (
        ("Python", True),
        ("FastAPI", True),
        ("PostgreSQL", True),
        ("Docker", False),
        ("AWS", False),
    ):
        test_db.execute(
            insert(JobSkill.__table__).values(
                job_id=job_id,
                skill_id=skill_ids[skill_name],
                is_required=required,
                required_level=4 if required else 2,
            )
        )

    recruiter_id = uuid4()
    test_db.execute(
        insert(User.__table__).values(
            user_id=recruiter_id,
            role_id=recruiter_role_id,
            first_name="Mia",
            last_name="Carter",
            email="mia.carter@smarthire.ai",
            password_hash="hash",
        )
    )
    test_db.execute(
        insert(CompanyUser.__table__).values(
            company_id=company_id,
            user_id=recruiter_id,
            position="Recruiter",
        )
    )

    language_ids: dict[str, int] = {}
    application_ids: list[int] = []
    candidates = [
        {
            "name": ("Amina", "Khan"),
            "email": "amina.khan@example.com",
            "experience": [
                ("Cloud Corp", "Backend Engineer", date(2018, 1, 1), date(2022, 12, 31)),
                ("Cloud Corp", "Senior Backend Engineer", date(2023, 1, 1), None),
            ],
            "education": [("University of Cairo", "Master of Computer Science", "Computer Science")],
            "certificates": [("AWS Certified Developer", "AWS"), ("Docker Certified Associate", "Docker")],
            "languages": [("English", "Native"), ("Spanish", "Professional")],
            "resume_text": "Python FastAPI PostgreSQL Docker AWS communication architecture team leadership",
            "resume_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "Communication"],
            "analysis": (91.0, 88.0, 84.0, 86.0, 79.0),
            "status": "interview_scheduled",
            "interview_score": 9,
        },
        {
            "name": ("Noah", "Patel"),
            "email": "noah.patel@example.com",
            "experience": [("StartUp Labs", "Junior Developer", date(2024, 1, 1), None)],
            "education": [("State University", "Bachelor of Computer Science", "Software Engineering")],
            "certificates": [("Python Fundamentals", "Python")],
            "languages": [("English", "Fluent")],
            "resume_text": "Python FastAPI React SQL communication teamwork backend APIs",
            "resume_skills": ["Python", "FastAPI", "React", "Communication"],
            "analysis": (75.0, 72.0, 65.0, 58.0, 51.0),
            "status": "submitted",
            "interview_score": None,
        },
        {
            "name": ("Sara", "Ahmed"),
            "email": "sara.ahmed@example.com",
            "experience": [("Support Desk", "Technical Support", date(2025, 1, 1), None)],
            "education": [("Community College", "Diploma in IT", "Information Technology")],
            "certificates": [],
            "languages": [],
            "resume_text": "Support escalation documentation customer service troubleshooting",
            "resume_skills": ["Communication"],
            "analysis": None,
            "status": "submitted",
            "interview_score": 4,
        },
    ]

    candidate_ids: list[UUID] = []
    for payload in candidates:
        candidate_id = uuid4()
        candidate_ids.append(candidate_id)
        test_db.execute(
            insert(User.__table__).values(
                user_id=candidate_id,
                role_id=candidate_role_id,
                first_name=payload["name"][0],
                last_name=payload["name"][1],
                email=payload["email"],
                password_hash="hash",
            )
        )
        resume_id = test_db.execute(
            insert(Resume.__table__).values(
                user_id=candidate_id,
                file_path=f"/tmp/{payload['name'][0].lower()}_resume.pdf",
                parsed_text=payload["resume_text"],
            )
        ).inserted_primary_key[0]
        for skill_name in payload["resume_skills"]:
            test_db.execute(
                insert(ResumeSkill.__table__).values(
                    resume_id=resume_id,
                    skill_id=skill_ids[skill_name],
                    confidence=0.95,
                )
            )
        for institution, degree, field_of_study in payload["education"]:
            test_db.execute(
                insert(Education.__table__).values(
                    resume_id=resume_id,
                    institution=institution,
                    degree=degree,
                    field_of_study=field_of_study,
                )
            )
        for company_name, title, start_date, end_date in payload["experience"]:
            test_db.execute(
                insert(WorkExperience.__table__).values(
                    resume_id=resume_id,
                    company_name=company_name,
                    title=title,
                    start_date=start_date,
                    end_date=end_date,
                    description=f"{title} work",
                )
            )
        for certificate_title, certificate_skill in payload["certificates"]:
            cert_id = test_db.execute(
                insert(Certificate.__table__).values(
                    user_id=candidate_id,
                    title=certificate_title,
                    issuer="SmartHire",
                    issue_date=date(2024, 1, 1),
                    file_path=f"/tmp/{payload['name'][0].lower()}_{certificate_title.replace(' ', '_')}.pdf",
                )
            ).inserted_primary_key[0]
            test_db.execute(
                insert(CertificateSkill.__table__).values(
                    certificate_id=cert_id,
                    skill_id=skill_ids[certificate_skill],
                    confidence=0.9,
                )
            )
        for language_name, proficiency in payload["languages"]:
            language_id = language_ids.get(language_name)
            if language_id is None:
                language_id = test_db.execute(
                    insert(Language.__table__).values(
                        name=language_name, code=language_name[:2].lower()
                    )
                ).inserted_primary_key[0]
                language_ids[language_name] = language_id
            test_db.execute(
                insert(UserLanguage.__table__).values(
                    user_id=candidate_id,
                    language_id=language_id,
                    proficiency=proficiency,
                )
            )
        application_id = test_db.execute(
            insert(Application.__table__).values(
                user_id=candidate_id,
                job_id=job_id,
                resume_id=resume_id,
                status=payload["status"],
            )
        ).inserted_primary_key[0]
        application_ids.append(application_id)
        if payload["analysis"] is not None:
            overall, skills_score, education_score, experience_score, certificate_score = payload["analysis"]
            test_db.execute(
                insert(AIAnalysis.__table__).values(
                    application_id=application_id,
                    overall_score=overall,
                    skills_score=skills_score,
                    education_score=education_score,
                    experience_score=experience_score,
                    certificate_score=certificate_score,
                    recommendations="Strong candidate.",
                )
            )

    interview_id = test_db.execute(
        insert(Interview.__table__).values(
            application_id=application_ids[0],
            interviewer_id=recruiter_id,
            scheduled_at=datetime(2025, 2, 1, tzinfo=timezone.utc),
            interview_type="Video",
            status="completed",
        )
    ).inserted_primary_key[0]
    test_db.execute(
        insert(InterviewFeedback.__table__).values(
            interview_id=interview_id,
            feedback="Excellent technical depth.",
            score=9,
        )
    )
    second_interview_id = test_db.execute(
        insert(Interview.__table__).values(
            application_id=application_ids[2],
            interviewer_id=recruiter_id,
            scheduled_at=datetime(2025, 2, 2, tzinfo=timezone.utc),
            interview_type="Screening",
            status="completed",
        )
    ).inserted_primary_key[0]
    test_db.execute(
        insert(InterviewFeedback.__table__).values(
            interview_id=second_interview_id,
            feedback="Needs a lot more practice.",
            score=4,
        )
    )

    test_db.commit()
    return {
        "job_id": job_id,
        "company_id": company_id,
        "recruiter_id": recruiter_id,
        "candidate_ids": candidate_ids,
    }


@pytest.fixture()
def ranking_context(test_db):
    seeded = _seed_ranking_data(test_db)
    request_session = sessionmaker(bind=test_db.get_bind())()
    app.dependency_overrides[get_current_user] = _admin_user
    app.dependency_overrides[get_db] = lambda: request_session
    try:
        yield seeded, request_session
    finally:
        app.dependency_overrides.clear()
        request_session.close()


@pytest.fixture()
def ranking_client(ranking_context):
    with TestClient(app) as client:
        yield client


def test_ranking_service_builds_shortlist_and_insights(ranking_context):
    seeded, request_session = ranking_context
    service = CandidateRankingService(request_session)
    current_user = _admin_user()

    response = service.ranking(seeded["job_id"], current_user)

    assert response.job_id == seeded["job_id"]
    assert response.total_candidates == 3
    assert len(response.ranking) == 3
    assert response.shortlist.best_overall_candidate is not None
    assert response.shortlist.best_overall_candidate.candidate_name == "Amina Khan"
    assert response.shortlist.best_junior_candidate is not None
    assert response.shortlist.best_junior_candidate.candidate_name == "Noah Patel"
    assert response.shortlist.best_senior_candidate is not None
    assert response.shortlist.best_senior_candidate.candidate_name == "Amina Khan"
    assert len(response.shortlist.top_5) == 3
    assert len(response.support.recommended_hiring_order) == 3
    assert len(response.support.recommended_interview_order) == 3
    assert response.ranking[0].overall_score >= response.ranking[1].overall_score >= response.ranking[2].overall_score
    assert response.ranking[0].ranking_explanation
    assert response.ranking[0].strengths
    assert response.ranking[0].weaknesses
    assert response.ranking[0].confidence_score >= 35


def test_ranking_comparison_and_exports(ranking_context):
    seeded, request_session = ranking_context
    service = CandidateRankingService(request_session)
    current_user = _admin_user()

    comparison = service.compare_candidates(
        seeded["job_id"],
        [seeded["candidate_ids"][0], seeded["candidate_ids"][1]],
        current_user,
    )
    assert len(comparison) == 2
    assert comparison[0].ranking_position == 1
    assert comparison[1].ranking_position == 2

    csv_content, csv_media_type, csv_filename = service.export(
        seeded["job_id"], current_user, report_format="csv"
    )
    assert csv_media_type == "text/csv"
    assert csv_filename.endswith(".csv")
    csv_text = csv_content.decode("utf-8")
    assert "ranking_position" in csv_text
    assert "Amina Khan" in csv_text

    json_content, json_media_type, json_filename = service.export(
        seeded["job_id"], current_user, report_format="json"
    )
    assert json_media_type == "application/json"
    assert json_filename.endswith(".json")
    payload = json.loads(json_content.decode("utf-8"))
    assert payload["job_id"] == seeded["job_id"]
    assert payload["dataset"]["name"] == "candidate_ranking"
    assert len(payload["dataset"]["rows"]) == 3

    powerbi_content, powerbi_media_type, powerbi_filename = service.export(
        seeded["job_id"], current_user, report_format="powerbi"
    )
    assert powerbi_media_type == "application/json"
    assert powerbi_filename.endswith("_powerbi.json")
    powerbi_payload = json.loads(powerbi_content.decode("utf-8"))
    assert powerbi_payload["dataset"]["name"] == "candidate_ranking"
    assert powerbi_payload["dataset"]["rows"]


def test_candidate_ranking_api_endpoints(ranking_client, ranking_context):
    seeded, _ = ranking_context
    job_id = seeded["job_id"]

    ranking_response = ranking_client.get("/ranking", params={"job_id": job_id})
    assert ranking_response.status_code == 200
    ranking_payload = ranking_response.json()
    assert ranking_payload["job_id"] == job_id
    assert ranking_payload["total_candidates"] == 3
    assert ranking_payload["shortlist"]["best_overall_candidate"]["candidate_name"] == "Amina Khan"

    top5_response = ranking_client.get("/ranking/top5", params={"job_id": job_id})
    assert top5_response.status_code == 200
    assert len(top5_response.json()["ranking"]) == 3

    job_response = ranking_client.get(f"/ranking/job/{job_id}")
    assert job_response.status_code == 200
    assert job_response.json()["ranking"][0]["candidate_name"] == "Amina Khan"

    compare_response = ranking_client.get(
        "/ranking/compare",
        params=[
            ("job_id", str(job_id)),
            ("candidate_ids", str(seeded["candidate_ids"][0])),
            ("candidate_ids", str(seeded["candidate_ids"][1])),
        ],
    )
    assert compare_response.status_code == 200
    assert len(compare_response.json()) == 2

    export_response = ranking_client.get(
        "/ranking/export",
        params={"job_id": job_id, "format": "json"},
    )
    assert export_response.status_code == 200
    assert export_response.headers["content-disposition"].endswith('.json"')
    export_payload = json.loads(export_response.content.decode("utf-8"))
    assert export_payload["dataset"]["name"] == "candidate_ranking"


def test_candidate_is_forbidden_from_ranking_endpoints(ranking_context):
    seeded, request_session = ranking_context
    candidate_user = _candidate_user(seeded["candidate_ids"][0])
    app.dependency_overrides[get_current_user] = lambda: candidate_user
    app.dependency_overrides[get_db] = lambda: request_session

    try:
        with TestClient(app) as client:
            response = client.get("/ranking", params={"job_id": seeded["job_id"]})
        assert response.status_code == 403
        assert response.json()["detail"] == "Forbidden."
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
