from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy import insert, select
from sqlalchemy.orm import sessionmaker

from app.api.resume_advisor import get_resume_advisor_service
from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_db
from app.database.database import Base
from app.main import app
from app.models.certificate import Certificate, CertificateSkill
from app.models.resume import Education, Language, Resume, UserLanguage, WorkExperience
from app.models.resume_skill import ResumeSkill
from app.models.role import Role
from app.models.skill import Skill
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.services.resume_advisor_service import ResumeAdvisorService


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _candidate_user(user_id: UUID) -> CurrentUserResponse:
    now = _now()
    return CurrentUserResponse(
        user_id=user_id,
        role_id=3,
        role_name="Candidate",
        first_name="Amina",
        last_name="Khan",
        email="amina.khan@example.com",
        phone=None,
        profile_picture_url=None,
        city="Warsaw",
        country="Poland",
        linkedin_url="https://linkedin.com/in/amina-khan",
        github_url="https://github.com/amina-khan",
        portfolio_url="https://amina.dev",
        created_at=now,
        updated_at=now,
    )


def _recruiter_user() -> CurrentUserResponse:
    now = _now()
    return CurrentUserResponse(
        user_id=uuid4(),
        role_id=2,
        role_name="Recruiter",
        first_name="Mia",
        last_name="Carter",
        email="mia.carter@smarthire.ai",
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


def _admin_user() -> CurrentUserResponse:
    now = _now()
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


def _build_pdf(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(path), pagesize=A4)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("SmartHire AI Candidate CV", styles["Title"]),
        Spacer(1, 12),
        Paragraph(text, styles["BodyText"]),
    ]
    doc.build(story)


def _seed_resume_advisor_data(test_db, tmp_path: Path) -> dict[str, object]:
    candidate_role_id = test_db.execute(
        insert(Role.__table__).values(name="Candidate", description="Candidate")
    ).inserted_primary_key[0]
    test_db.execute(
        insert(Role.__table__).values(name="Recruiter", description="Recruiter")
    )
    test_db.execute(
        insert(Role.__table__).values(name="Admin", description="Administrator")
    )

    candidate_id = uuid4()
    pdf_path = tmp_path / "uploads" / "candidate_cv.pdf"
    resume_text = (
        "Amina Khan\n"
        "Python FastAPI PostgreSQL communication team leadership\n"
        "Experience\n"
        "Backend engineer delivering APIs and workflow automation.\n"
        "Education\n"
        "Master of Computer Science\n"
        "Projects\n"
        "Built a hiring workflow dashboard with measurable outcomes."
    )
    _build_pdf(pdf_path, resume_text)

    test_db.execute(
        insert(User.__table__).values(
            user_id=candidate_id,
            role_id=candidate_role_id,
            first_name="Amina",
            last_name="Khan",
            email="amina.khan@example.com",
            password_hash="hash",
            city="Warsaw",
            country="Poland",
            linkedin_url="https://linkedin.com/in/amina-khan",
            github_url="https://github.com/amina-khan",
            portfolio_url="https://amina.dev",
        )
    )
    resume_id = test_db.execute(
        insert(Resume.__table__).values(
            user_id=candidate_id,
            file_path=str(pdf_path),
            parsed_text=resume_text,
        )
    ).inserted_primary_key[0]

    skills = {}
    for name, category in (
        ("Python", "Programming Languages"),
        ("FastAPI", "Frameworks"),
        ("PostgreSQL", "Databases"),
        ("Communication", "Soft Skills"),
        ("SQL", "Databases"),
        ("Docker", "DevOps"),
        ("AWS", "Cloud"),
    ):
        skills[name] = test_db.execute(
            insert(Skill.__table__).values(name=name, category=category)
        ).inserted_primary_key[0]

    for skill_name in ("Python", "FastAPI", "PostgreSQL", "Communication"):
        test_db.execute(
            insert(ResumeSkill.__table__).values(
                resume_id=resume_id,
                skill_id=skills[skill_name],
                confidence=0.92,
            )
        )

    test_db.execute(
        insert(Education.__table__).values(
            resume_id=resume_id,
            institution="Warsaw University",
            degree="MSc Computer Science",
            field_of_study="Software Engineering",
            start_date=date(2020, 1, 1),
            end_date=date(2022, 1, 1),
            description="Focused on distributed systems and backend delivery.",
        )
    )
    test_db.execute(
        insert(WorkExperience.__table__).values(
            resume_id=resume_id,
            company_name="SmartHire Labs",
            title="Backend Engineer",
            start_date=date(2022, 1, 1),
            end_date=date(2025, 1, 1),
            description="Delivered Python APIs and internal workflow tools.",
        )
    )
    test_db.execute(
        insert(Certificate.__table__).values(
            user_id=candidate_id,
            title="Python Web API Certificate",
            issuer="SmartHire",
            issue_date=date(2024, 6, 1),
            file_path=str(tmp_path / "uploads" / "certificate.pdf"),
        )
    )
    certificate_id = test_db.scalar(
        select(Certificate.__table__.c.cert_id).where(Certificate.__table__.c.user_id == candidate_id)
    )
    test_db.execute(
        insert(CertificateSkill.__table__).values(
            certificate_id=certificate_id,
            skill_id=skills["Python"],
            confidence=0.9,
        )
    )
    language_id = test_db.execute(
        insert(Language.__table__).values(name="English", code="en")
    ).inserted_primary_key[0]
    test_db.execute(
        insert(UserLanguage.__table__).values(
            user_id=candidate_id,
            language_id=language_id,
            proficiency="Fluent",
        )
    )
    test_db.commit()
    return {
        "candidate_id": candidate_id,
        "resume_id": resume_id,
        "pdf_path": pdf_path,
        "resume_text": resume_text,
    }


def _seed_candidate_account(test_db) -> dict[str, object]:
    candidate_role_id = test_db.execute(
        insert(Role.__table__).values(name="Candidate", description="Candidate")
    ).inserted_primary_key[0]
    test_db.execute(
        insert(Role.__table__).values(name="Recruiter", description="Recruiter")
    )
    test_db.execute(
        insert(Role.__table__).values(name="Admin", description="Administrator")
    )

    candidate_id = uuid4()
    test_db.execute(
        insert(User.__table__).values(
            user_id=candidate_id,
            role_id=candidate_role_id,
            first_name="Amina",
            last_name="Khan",
            email="amina.khan@example.com",
            password_hash="hash",
            city="Warsaw",
            country="Poland",
            linkedin_url="https://linkedin.com/in/amina-khan",
            github_url="https://github.com/amina-khan",
            portfolio_url="https://amina.dev",
        )
    )
    test_db.commit()
    return {"candidate_id": candidate_id}


def test_resume_advisor_service_generates_report_and_export(test_db, tmp_path):
    seeded = _seed_resume_advisor_data(test_db, tmp_path)
    service = ResumeAdvisorService(test_db, report_root=tmp_path)
    current_user = _candidate_user(seeded["candidate_id"])

    report = service.generate_report(current_user)

    assert report.candidate_id == seeded["candidate_id"]
    assert report.resume_id == seeded["resume_id"]
    assert 0 <= report.resume_score <= 100
    assert report.resume_score == report.quality_check.overall_quality_score
    assert report.cv_summary
    assert report.strengths
    assert report.weaknesses
    assert report.missing_skills
    assert report.suggested_skills
    assert report.learning_roadmap
    assert len(report.learning_roadmap) == 4
    assert report.learning_roadmap[0].week == 1
    assert report.learning_roadmap[-1].week == 4
    assert report.quality_check.notes

    json_export = service.export_report(current_user, report_format="json")
    json_path = Path(json_export.file_path)
    assert json_path.exists()
    assert json_path.suffix == ".json"
    json_payload = json.loads(json_path.read_text(encoding="utf-8"))
    assert json_payload["candidate_id"] == str(seeded["candidate_id"])
    assert json_payload["resume_score"] == report.resume_score

    pdf_export = service.export_report(current_user, report_format="pdf")
    pdf_path = Path(pdf_export.file_path)
    assert pdf_path.exists()
    assert pdf_path.suffix == ".pdf"
    assert pdf_path.read_bytes().startswith(b"%PDF")


def test_resume_advisor_access_is_candidate_only(test_db, tmp_path):
    seeded = _seed_resume_advisor_data(test_db, tmp_path)
    service = ResumeAdvisorService(test_db, report_root=tmp_path)

    recruiter = _recruiter_user()
    admin = _admin_user()

    for user in (recruiter, admin):
        try:
            service.generate_report(user)
        except Exception as exc:
            assert getattr(exc, "status_code", None) == 403
            assert getattr(exc, "detail", None) == "Forbidden."
        else:  # pragma: no cover - defensive
            raise AssertionError("Non-candidate access was unexpectedly allowed.")


def test_resume_upload_triggers_advisor_report_generation(test_db, tmp_path, monkeypatch):
    seeded = _seed_candidate_account(test_db)
    upload_folder = tmp_path / "uploads"
    report_folder = tmp_path / "reports"
    monkeypatch.setenv("UPLOAD_FOLDER", str(upload_folder))
    monkeypatch.setenv("REPORT_FOLDER", str(report_folder))
    get_settings.cache_clear()

    request_session = sessionmaker(bind=test_db.get_bind())()
    app.dependency_overrides[get_db] = lambda: request_session
    app.dependency_overrides[get_current_user] = lambda: _candidate_user(seeded["candidate_id"])
    try:
        with TestClient(app) as client:
            upload_path = tmp_path / "candidate_cv.pdf"
            _build_pdf(
                upload_path,
                (
                    "Amina Khan\n"
                    "Python FastAPI PostgreSQL communication team leadership\n"
                    "Experience\n"
                    "Backend engineer delivering APIs and workflow automation."
                ),
            )
            response = client.post(
                "/resume/upload",
                files={
                    "file": (
                        upload_path.name,
                        upload_path.read_bytes(),
                        "application/pdf",
                    )
                },
            )
        assert response.status_code == 201
        resume_row = request_session.execute(
            select(Resume.__table__)
            .where(Resume.__table__.c.user_id == seeded["candidate_id"])
            .order_by(Resume.__table__.c.resume_id.desc())
        ).mappings().all()
        assert len(resume_row) == 1
        latest_resume_id = resume_row[0]["resume_id"]
        snapshot_path = (
            report_folder
            / "resume_advisor"
            / "snapshots"
            / str(seeded["candidate_id"])
            / f"resume_advisor_{latest_resume_id}.json"
        )
        assert snapshot_path.exists()
        snapshot_payload = json.loads(snapshot_path.read_text(encoding="utf-8"))
        assert snapshot_payload["candidate_id"] == str(seeded["candidate_id"])
    finally:
        app.dependency_overrides.clear()
        request_session.close()
        get_settings.cache_clear()


def test_resume_advisor_api_endpoints_respect_permissions(test_db, tmp_path):
    seeded = _seed_resume_advisor_data(test_db, tmp_path)
    service = ResumeAdvisorService(test_db, report_root=tmp_path)
    request_session = sessionmaker(bind=test_db.get_bind())()

    app.dependency_overrides[get_db] = lambda: request_session
    app.dependency_overrides[get_resume_advisor_service] = lambda: service
    try:
        with TestClient(app) as client:
            app.dependency_overrides[get_current_user] = lambda: _candidate_user(
                seeded["candidate_id"]
            )
            report_response = client.get("/resume-advisor/report")
            assert report_response.status_code == 200
            report_payload = report_response.json()
            assert report_payload["candidate_id"] == str(seeded["candidate_id"])

            json_export_response = client.get("/resume-advisor/export", params={"format": "json"})
            assert json_export_response.status_code == 200
            assert json_export_response.headers["content-type"].startswith("application/json")
            json_export_payload = json.loads(json_export_response.content.decode("utf-8"))
            assert json_export_payload["candidate_id"] == str(seeded["candidate_id"])

            pdf_export_response = client.get("/resume-advisor/export", params={"format": "pdf"})
            assert pdf_export_response.status_code == 200
            assert pdf_export_response.headers["content-type"].startswith("application/pdf")
            assert pdf_export_response.content.startswith(b"%PDF")

            app.dependency_overrides[get_current_user] = lambda: _recruiter_user()
            forbidden_report = client.get("/resume-advisor/report")
            assert forbidden_report.status_code == 403
            assert forbidden_report.json()["detail"] == "Forbidden."

            app.dependency_overrides[get_current_user] = lambda: _admin_user()
            forbidden_export = client.get("/resume-advisor/export", params={"format": "json"})
            assert forbidden_export.status_code == 403
            assert forbidden_export.json()["detail"] == "Forbidden."
    finally:
        app.dependency_overrides.clear()
        request_session.close()
