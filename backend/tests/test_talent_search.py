from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import insert, select
from sqlalchemy.orm import sessionmaker

from app.api.talent_search import get_talent_search_service
from app.core.dependencies import get_current_user, get_db
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
from app.schemas.talent_search import TalentPoolFavoriteCreate, TalentSearchFilters
from app.services.talent_search_service import TalentSearchService


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


def _admin_user(user_id: UUID) -> CurrentUserResponse:
    return _current_user(
        user_id=user_id,
        role_id=1,
        role_name="Admin",
        first_name="Ava",
        last_name="Admin",
        email="ava.admin@smarthire.ai",
    )


def _recruiter_user(user_id: UUID) -> CurrentUserResponse:
    return _current_user(
        user_id=user_id,
        role_id=2,
        role_name="Recruiter",
        first_name="Mia",
        last_name="Carter",
        email="mia.carter@smarthire.ai",
    )


def _candidate_user(user_id: UUID) -> CurrentUserResponse:
    return _current_user(
        user_id=user_id,
        role_id=3,
        role_name="Candidate",
        first_name="Noah",
        last_name="Patel",
        email="noah.patel@example.com",
    )


def _build_pdf_like(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(
        b"%PDF-1.4\n"
        b"1 0 obj<<>>endobj\n"
        + text.encode("utf-8")
        + b"\ntrailer<<>>\n%%EOF"
    )


def _seed_talent_data(test_db, tmp_path: Path) -> dict[str, object]:
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
            description="Platform and analytics",
        )
    ).inserted_primary_key[0]

    job_rows = {
        "backend": test_db.execute(
            insert(Job.__table__).values(
                company_id=company_id,
                department_id=department_id,
                title="Senior Backend Engineer",
                description="Python FastAPI Docker AWS SQL communication.",
                employment_type="Full-time",
                experience_level="Senior",
                location="Remote",
                remote_option=True,
                status="open",
            )
        ).inserted_primary_key[0],
        "data": test_db.execute(
            insert(Job.__table__).values(
                company_id=company_id,
                department_id=department_id,
                title="Junior Data Analyst",
                description="SQL Power BI dashboards and reporting.",
                employment_type="Full-time",
                experience_level="Junior",
                location="Remote",
                remote_option=True,
                status="open",
            )
        ).inserted_primary_key[0],
        "frontend": test_db.execute(
            insert(Job.__table__).values(
                company_id=company_id,
                department_id=department_id,
                title="Frontend Developer",
                description="React JavaScript CSS communication.",
                employment_type="Full-time",
                experience_level="Mid",
                location="Remote",
                remote_option=True,
                status="open",
            )
        ).inserted_primary_key[0],
    }

    skill_ids: dict[str, int] = {}
    for name, category in [
        ("Python", "Programming"),
        ("FastAPI", "Framework"),
        ("Docker", "DevOps"),
        ("AWS", "Cloud"),
        ("SQL", "Database"),
        ("Power BI", "Analytics"),
        ("Communication", "Soft Skills"),
        ("React", "Frontend"),
        ("JavaScript", "Frontend"),
        ("CSS", "Frontend"),
        ("Kubernetes", "DevOps"),
        ("CI/CD", "DevOps"),
    ]:
        skill_ids[name] = test_db.execute(
            insert(Skill.__table__).values(name=name, category=category)
        ).inserted_primary_key[0]

    for job_key, skills in {
        "backend": [("Python", True), ("FastAPI", True), ("Docker", True), ("AWS", True), ("SQL", True), ("Communication", False)],
        "data": [("SQL", True), ("Power BI", True), ("Communication", False)],
        "frontend": [("React", True), ("JavaScript", True), ("CSS", True), ("Communication", False)],
    }.items():
        for skill_name, required in skills:
            test_db.execute(
                insert(JobSkill.__table__).values(
                    job_id=job_rows[job_key],
                    skill_id=skill_ids[skill_name],
                    is_required=required,
                    required_level=4 if required else 2,
                )
            )

    language_ids: dict[str, int] = {}

    candidates = [
        {
            "first_name": "Amina",
            "last_name": "Khan",
            "email": "amina.khan@example.com",
            "phone": "555-111-2222",
            "resume_text": "Python FastAPI Docker AWS communication leadership with portfolio and GitHub.",
            "skills": ["Python", "FastAPI", "Docker", "AWS", "Communication"],
            "education": [("Warsaw University", "MSc Computer Science", "Software Engineering")],
            "experiences": [("Cloud Corp", "Backend Engineer", date(2018, 1, 1), date(2025, 1, 1))],
            "certificates": [("AWS Certified Developer", "AWS")],
            "languages": [("English", "B2")],
            "job_key": "backend",
            "status": "interviewed",
            "ai": (96.0, 94.0, 92.0, 90.0, 88.0),
            "interview_status": "Completed",
            "feedback": 9,
            "resume_file": tmp_path / "amina_resume.pdf",
        },
        {
            "first_name": "Noah",
            "last_name": "Patel",
            "email": "noah.patel@example.com",
            "phone": "555-222-3333",
            "resume_text": "SQL Power BI dashboards data analysis communication.",
            "skills": ["SQL", "Power BI", "Communication"],
            "education": [("State University", "Bachelor of Data Analytics", "Data Analytics")],
            "experiences": [("Data Desk", "Junior Data Analyst", date(2024, 1, 1), date(2025, 1, 1))],
            "certificates": [("Power BI Associate", "Power BI")],
            "languages": [("English", "B2")],
            "job_key": "data",
            "status": "submitted",
            "ai": (78.0, 76.0, 70.0, 68.0, 74.0),
            "interview_status": None,
            "feedback": None,
            "resume_file": tmp_path / "noah_resume.pdf",
        },
        {
            "first_name": "Sara",
            "last_name": "Ahmed",
            "email": "sara.ahmed@example.com",
            "phone": "555-333-4444",
            "resume_text": "React JavaScript CSS communication frontend portfolio.",
            "skills": ["React", "JavaScript", "CSS", "Communication"],
            "education": [("London College", "Bachelor of Computer Science", "Computer Science")],
            "experiences": [("Web Studio", "Frontend Developer", date(2022, 1, 1), date(2025, 1, 1))],
            "certificates": [],
            "languages": [("French", "B1")],
            "job_key": "frontend",
            "status": "rejected",
            "ai": (61.0, 58.0, 60.0, 64.0, 50.0),
            "interview_status": "Scheduled",
            "feedback": None,
            "resume_file": tmp_path / "sara_resume.pdf",
        },
        {
            "first_name": "Lina",
            "last_name": "Saeed",
            "email": "lina.saeed@example.com",
            "phone": "555-444-5555",
            "resume_text": "Docker AWS Kubernetes CI/CD infrastructure platform engineer.",
            "skills": ["Docker", "AWS", "Kubernetes", "CI/CD"],
            "education": [("Berlin University", "MSc Information Systems", "Information Systems")],
            "experiences": [("Ops One", "Platform Engineer", date(2016, 1, 1), date(2025, 1, 1))],
            "certificates": [("AWS Solutions Architect", "AWS")],
            "languages": [("English", "C1")],
            "job_key": None,
            "status": None,
            "ai": None,
            "interview_status": None,
            "feedback": None,
            "resume_file": tmp_path / "lina_resume.pdf",
        },
    ]

    candidate_ids: dict[str, UUID] = {}
    application_ids: dict[str, int] = {}
    interview_ids: dict[str, int] = {}

    for candidate in candidates:
        candidate_id = uuid4()
        candidate_ids[candidate["first_name"]] = candidate_id
        test_db.execute(
            insert(User.__table__).values(
                user_id=candidate_id,
                role_id=candidate_role_id,
                first_name=candidate["first_name"],
                last_name=candidate["last_name"],
                email=candidate["email"],
                password_hash="hash",
                phone=candidate["phone"],
                linkedin_url=f"https://linkedin.com/in/{candidate['first_name'].lower()}",
                github_url=f"https://github.com/{candidate['first_name'].lower()}",
                portfolio_url=f"https://{candidate['first_name'].lower()}.dev",
            )
        )
        _build_pdf_like(candidate["resume_file"], candidate["resume_text"])
        resume_id = test_db.execute(
            insert(Resume.__table__).values(
                user_id=candidate_id,
                file_path=str(candidate["resume_file"]),
                parsed_text=candidate["resume_text"],
            )
        ).inserted_primary_key[0]
        for skill_name in candidate["skills"]:
            test_db.execute(
                insert(ResumeSkill.__table__).values(
                    resume_id=resume_id,
                    skill_id=skill_ids[skill_name],
                    confidence=0.95,
                )
            )
        for institution, degree, field_of_study in candidate["education"]:
            test_db.execute(
                insert(Education.__table__).values(
                    resume_id=resume_id,
                    institution=institution,
                    degree=degree,
                    field_of_study=field_of_study,
                )
            )
        for company_name, title, start_date, end_date in candidate["experiences"]:
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
        for certificate_title, certificate_skill in candidate["certificates"]:
            cert_id = test_db.execute(
                insert(Certificate.__table__).values(
                    user_id=candidate_id,
                    title=certificate_title,
                    issuer="SmartHire",
                    issue_date=date(2024, 1, 1),
                    file_path=str(tmp_path / f"{candidate['first_name'].lower()}_{certificate_title.replace(' ', '_')}.pdf"),
                )
            ).inserted_primary_key[0]
            test_db.execute(
                insert(CertificateSkill.__table__).values(
                    certificate_id=cert_id,
                    skill_id=skill_ids[certificate_skill],
                    confidence=0.9,
                )
            )
        for language_name, proficiency in candidate["languages"]:
            language_id = language_ids.get(language_name)
            if language_id is None:
                language_id = test_db.execute(
                    insert(Language.__table__).values(name=language_name, code=language_name[:2].lower())
                ).inserted_primary_key[0]
                language_ids[language_name] = language_id
            test_db.execute(
                insert(UserLanguage.__table__).values(
                    user_id=candidate_id,
                    language_id=language_id,
                    proficiency=proficiency,
                )
            )

        if candidate["job_key"] is not None:
            application_id = test_db.execute(
                insert(Application.__table__).values(
                    user_id=candidate_id,
                    job_id=job_rows[candidate["job_key"]],
                    resume_id=resume_id,
                    status=candidate["status"],
                    created_at=datetime.now(timezone.utc) - timedelta(days=len(application_ids) * 7),
                    updated_at=datetime.now(timezone.utc) - timedelta(days=len(application_ids) * 7),
                )
            ).inserted_primary_key[0]
            application_ids[candidate["first_name"]] = application_id
            if candidate["ai"] is not None:
                overall, skills_score, education_score, experience_score, certificate_score = candidate["ai"]
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
            if candidate["interview_status"] is not None:
                interview_id = test_db.execute(
                    insert(Interview.__table__).values(
                        application_id=application_id,
                        interviewer_id=candidate_id,
                        scheduled_at=datetime.now(timezone.utc) - timedelta(days=1),
                        interview_type="Online",
                        status=candidate["interview_status"],
                    )
                ).inserted_primary_key[0]
                interview_ids[candidate["first_name"]] = interview_id
                if candidate["feedback"] is not None:
                    test_db.execute(
                        insert(InterviewFeedback.__table__).values(
                            interview_id=interview_id,
                            feedback="Solid technical discussion.",
                            score=candidate["feedback"],
                        )
                    )

    test_db.execute(
        insert(User.__table__).values(
            user_id=uuid4(),
            role_id=admin_role_id,
            first_name="Ava",
            last_name="Admin",
            email="ava.admin@smarthire.ai",
            password_hash="hash",
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
    test_db.commit()

    return {
        "admin_id": next(
            row["user_id"]
            for row in test_db.execute(
                select(User.__table__.c.user_id).where(User.__table__.c.email == "ava.admin@smarthire.ai")
            ).mappings().all()
        ),
        "recruiter_id": recruiter_id,
        "candidate_ids": candidate_ids,
        "job_ids": job_rows,
    }


def test_talent_search_service_search_filter_sort_and_export(test_db, tmp_path):
    seeded = _seed_talent_data(test_db, tmp_path)
    service = TalentSearchService(test_db, report_root=tmp_path)
    recruiter = _recruiter_user(seeded["recruiter_id"])

    query_results = service.search(
        recruiter,
        TalentSearchFilters(query="Python developers with Docker"),
    )
    assert query_results.total_candidates >= 2
    assert query_results.items[0].candidate_name == "Amina Khan"
    assert query_results.items[0].is_bookmarked is False
    assert "Python" in query_results.items[0].skills

    junior_results = service.search(
        recruiter,
        TalentSearchFilters(query="Junior Data Analysts"),
    )
    assert junior_results.items[0].candidate_name == "Noah Patel"

    high_match_results = service.filter(
        recruiter,
        TalentSearchFilters(smart_filter="high_match"),
    )
    assert high_match_results.items[0].candidate_name == "Amina Khan"
    assert all(item.ai_match_score >= 90 for item in high_match_results.items)

    experience_results = service.filter(
        recruiter,
        TalentSearchFilters(sort_by="experience"),
    )
    assert experience_results.items[0].candidate_name == "Lina Saeed"

    language_results = service.filter(
        recruiter,
        TalentSearchFilters(language="English", required_skills=["Python"]),
    )
    assert language_results.items[0].candidate_name == "Amina Khan"

    missing_skill_results = service.filter(
        recruiter,
        TalentSearchFilters(missing_skills=["SQL"]),
    )
    assert missing_skill_results.items[0].candidate_name == "Amina Khan"
    assert "SQL" in missing_skill_results.items[0].missing_skills

    csv_content, csv_media_type, csv_filename = service.export(
        recruiter,
        TalentSearchFilters(query="Python"),
        report_format="csv",
    )
    assert csv_media_type == "text/csv"
    assert csv_filename == "talent_search.csv"
    csv_text = csv_content.decode("utf-8")
    assert "candidate_name" in csv_text
    assert "Amina Khan" in csv_text

    json_content, json_media_type, json_filename = service.export(
        recruiter,
        TalentSearchFilters(query="Python"),
        report_format="json",
    )
    assert json_media_type == "application/json"
    assert json_filename == "talent_search.json"
    json_payload = json.loads(json_content.decode("utf-8"))
    assert json_payload["dataset"]["name"] == "talent_search"
    assert json_payload["dataset"]["rows"]

    powerbi_content, powerbi_media_type, powerbi_filename = service.export(
        recruiter,
        TalentSearchFilters(query="Python"),
        report_format="powerbi",
    )
    assert powerbi_media_type == "application/json"
    assert powerbi_filename == "talent_search_powerbi.json"
    powerbi_payload = json.loads(powerbi_content.decode("utf-8"))
    assert powerbi_payload["dataset"]["name"] == "talent_search"


def test_talent_pool_favorites_support_move_and_delete(test_db, tmp_path):
    seeded = _seed_talent_data(test_db, tmp_path)
    service = TalentSearchService(test_db, report_root=tmp_path)
    recruiter = _recruiter_user(seeded["recruiter_id"])
    amina = seeded["candidate_ids"]["Amina"]
    noah = seeded["candidate_ids"]["Noah"]

    favorite = service.save_favorite(
        recruiter,
        TalentPoolFavoriteCreate(
            list_name="Backend Stars",
            candidate_ids=[amina, noah],
            notes="Strong backend and analytics profiles.",
        ),
    )
    assert favorite.candidate_count == 2
    assert favorite.list_name == "Backend Stars"

    moved = service.save_favorite(
        recruiter,
        TalentPoolFavoriteCreate(
            list_name="Priority List",
            candidate_ids=[noah],
            move_from_favorite_id=favorite.favorite_id,
        ),
    )
    assert moved.candidate_count == 1
    assert moved.candidate_ids == [noah]

    favorites = service.list_favorites(recruiter)
    assert len(favorites) == 2
    backend_list = next(item for item in favorites if item.list_name == "Backend Stars")
    priority_list = next(item for item in favorites if item.list_name == "Priority List")
    assert noah not in backend_list.candidate_ids
    assert priority_list.candidate_ids == [noah]

    service.delete_favorite(recruiter, backend_list.favorite_id)
    remaining = service.list_favorites(recruiter)
    assert len(remaining) == 1
    assert remaining[0].list_name == "Priority List"


def test_talent_search_api_permissions_and_routes(test_db, tmp_path):
    seeded = _seed_talent_data(test_db, tmp_path)
    service = TalentSearchService(test_db, report_root=tmp_path)
    request_session = sessionmaker(bind=test_db.get_bind())()
    app.dependency_overrides[get_db] = lambda: request_session
    app.dependency_overrides[get_talent_search_service] = lambda: service
    try:
        with TestClient(app) as client:
            app.dependency_overrides[get_current_user] = lambda: _recruiter_user(seeded["recruiter_id"])
            search_response = client.get(
                "/talent/search",
                params={"query": "Python developers with Docker"},
            )
            assert search_response.status_code == 200
            assert search_response.json()["items"][0]["candidate_name"] == "Amina Khan"

            filter_response = client.get(
                "/talent/filter",
                params={"smart_filter": "high_match"},
            )
            assert filter_response.status_code == 200
            assert filter_response.json()["items"][0]["candidate_name"] == "Amina Khan"

            favorite_response = client.post(
                "/talent/favorites",
                json={
                    "list_name": "Backend Stars",
                    "candidate_ids": [
                        str(seeded["candidate_ids"]["Amina"]),
                        str(seeded["candidate_ids"]["Noah"]),
                    ],
                    "notes": "Strong backend and analytics profiles.",
                },
            )
            assert favorite_response.status_code == 201
            favorite_id = favorite_response.json()["favorite_id"]

            list_response = client.get("/talent/favorites")
            assert list_response.status_code == 200
            assert len(list_response.json()) == 1

            export_response = client.get("/talent/export", params={"query": "Python", "format": "json"})
            assert export_response.status_code == 200
            assert export_response.headers["content-disposition"].endswith('.json"')

            app.dependency_overrides[get_current_user] = lambda: _candidate_user(
                seeded["candidate_ids"]["Noah"]
            )
            forbidden_search = client.get("/talent/search", params={"query": "Python"})
            assert forbidden_search.status_code == 403
            assert forbidden_search.json()["detail"] == "Forbidden."

            forbidden_favorites = client.get("/talent/favorites")
            assert forbidden_favorites.status_code == 403

            app.dependency_overrides[get_current_user] = lambda: _admin_user(seeded["admin_id"])
            admin_export = client.get("/talent/export", params={"query": "Docker", "format": "powerbi"})
            assert admin_export.status_code == 200
            assert admin_export.headers["content-type"].startswith("application/json")
            assert "talent_search_powerbi.json" in admin_export.headers["content-disposition"]

            delete_response = client.delete(f"/talent/favorites/{favorite_id}")
            assert delete_response.status_code == 204
    finally:
        app.dependency_overrides.clear()
        request_session.close()
