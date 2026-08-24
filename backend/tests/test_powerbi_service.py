from __future__ import annotations

import csv
import json
from datetime import date, datetime, timedelta, timezone
from io import StringIO
from pathlib import Path
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import insert, select

from app.core.dependencies import get_current_user, get_db
from app.main import app
from app.models.application import AIAnalysis, Application
from app.models.certificate import Certificate
from app.models.company import Company
from app.models.interview import Interview
from app.models.job import Department, Job, JobSkill
from app.models.resume import Education, Language, Resume, UserLanguage, WorkExperience
from app.models.resume_skill import ResumeSkill
from app.models.role import Role
from app.models.skill import Skill
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.services.powerbi_service import PowerBIService


def _admin_user() -> CurrentUserResponse:
    now = datetime.now(timezone.utc)
    return CurrentUserResponse(
        user_id=uuid.uuid4(),
        role_id=1,
        role_name="Admin",
        first_name="Admin",
        last_name="User",
        email="admin@smarthire.ai",
        created_at=now,
        updated_at=now,
    )


def _seed_powerbi_dataset(test_db, tmp_path: Path) -> CurrentUserResponse:
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
            logo=None,
            location="Remote",
        )
    ).inserted_primary_key[0]
    department_id = test_db.execute(
        insert(Department.__table__).values(
            company_id=company_id,
            name="Engineering",
            description="Backend platform team",
        )
    ).inserted_primary_key[0]

    jobs = []
    for payload in [
        {
            "title": "Backend Python Developer",
            "description": "Build APIs with Python, FastAPI, SQL, and Docker.",
            "experience_level": "Mid",
            "status": "open",
        },
        {
            "title": "Data Analyst",
            "description": "SQL analytics and Power BI reporting.",
            "experience_level": "Junior",
            "status": "open",
        },
        {
            "title": "DevOps Engineer",
            "description": "AWS, Docker, and Kubernetes infrastructure.",
            "experience_level": "Senior",
            "status": "open",
        },
        {
            "title": "ML Engineer",
            "description": "Machine learning and Python deployment pipelines.",
            "experience_level": "Senior",
            "status": "open",
        },
    ]:
        job_id = test_db.execute(
            insert(Job.__table__).values(
                company_id=company_id,
                department_id=department_id,
                title=payload["title"],
                description=payload["description"],
                employment_type="Full-time",
                experience_level=payload["experience_level"],
                location="Remote",
                remote_option=True,
                status=payload["status"],
            )
        ).inserted_primary_key[0]
        jobs.append(job_id)

    skills = {}
    for name, category in [
        ("Python", "Backend"),
        ("FastAPI", "Backend"),
        ("SQL", "Database"),
        ("Docker", "DevOps"),
        ("AWS", "Cloud"),
        ("Power BI", "Analytics"),
        ("Kubernetes", "DevOps"),
        ("Machine Learning", "AI"),
    ]:
        skills[name] = test_db.execute(
            insert(Skill.__table__).values(name=name, category=category)
        ).inserted_primary_key[0]

    job_skill_links = {
        jobs[0]: [("Python", True), ("FastAPI", True), ("SQL", True), ("Docker", False)],
        jobs[1]: [("SQL", True), ("Power BI", True)],
        jobs[2]: [("AWS", True), ("Docker", True), ("Kubernetes", True)],
        jobs[3]: [("Python", True), ("Machine Learning", True), ("Docker", False)],
    }
    for job_id, items in job_skill_links.items():
        for skill_name, required in items:
            test_db.execute(
                insert(JobSkill.__table__).values(
                    job_id=job_id,
                    skill_id=skills[skill_name],
                    is_required=required,
                    required_level=4 if required else 2,
                )
            )

    now = datetime.now(timezone.utc)
    candidate_specs = [
        {
            "first_name": "Mina",
            "last_name": "Ali",
            "email": "mina@example.com",
            "job_id": jobs[0],
            "created_at": now,
            "status": "accepted",
            "skills": ["Python", "FastAPI", "SQL", "Docker"],
            "education": [("Warsaw University", "BSc Computer Science")],
            "certificate": ("AWS Certified Developer", "Amazon"),
            "language": "English",
            "experience": [("2019-01-01", "2024-01-01")],
            "analysis": (88.0, 86.0, 74.0, 80.0, 70.0),
            "recommendation": "Recommend offer",
            "decision": "Accept",
        },
        {
            "first_name": "Omar",
            "last_name": "Haddad",
            "email": "omar@example.com",
            "job_id": jobs[1],
            "created_at": now - timedelta(days=2),
            "status": "rejected",
            "skills": ["SQL", "Power BI"],
            "education": [("Berlin School of Economics", "MSc Data Analytics")],
            "certificate": ("Power BI Associate", "Microsoft"),
            "language": "German",
            "experience": [("2021-01-01", "2025-01-01")],
            "analysis": (62.0, 58.0, 66.0, 54.0, 61.0),
            "recommendation": "Recommend rejection",
            "decision": "Reject",
        },
        {
            "first_name": "Sara",
            "last_name": "Khan",
            "email": "sara@example.com",
            "job_id": jobs[2],
            "created_at": now - timedelta(days=8),
            "status": "interview_scheduled",
            "skills": ["AWS", "Docker"],
            "education": [("University of Warsaw", "BEng Software Engineering")],
            "certificate": ("AWS Solutions Architect", "Amazon"),
            "language": "Polish",
            "experience": [("2018-01-01", "2025-01-01")],
            "analysis": (71.0, 69.0, 73.0, 68.0, 72.0),
            "recommendation": "Recommend interview",
            "decision": "Interview",
        },
        {
            "first_name": "Liam",
            "last_name": "Jones",
            "email": "liam@example.com",
            "job_id": jobs[3],
            "created_at": now - timedelta(days=20),
            "status": "on_hold",
            "skills": ["Python", "Machine Learning"],
            "education": [("Imperial College London", "MSc Data Science")],
            "certificate": ("TensorFlow Developer", "Google"),
            "language": "English",
            "experience": [("2017-01-01", "2025-01-01")],
            "analysis": (77.0, 76.0, 79.0, 71.0, 78.0),
            "recommendation": "Keep on hold",
            "decision": "Hold",
        },
    ]

    application_rows = []
    for index, spec in enumerate(candidate_specs):
        user_id = uuid.uuid4()
        test_db.execute(
            insert(User.__table__).values(
                user_id=user_id,
                role_id=candidate_role_id,
                first_name=spec["first_name"],
                last_name=spec["last_name"],
                email=spec["email"],
                password_hash="hash",
            )
        )
        resume_id = test_db.execute(
            insert(Resume.__table__).values(
                user_id=user_id,
                file_path=str(tmp_path / f"resume_{index}.pdf"),
                parsed_text=" ".join(spec["skills"]) + " backend experience",
            )
        ).inserted_primary_key[0]
        for skill_name in spec["skills"]:
            test_db.execute(
                insert(ResumeSkill.__table__).values(
                    resume_id=resume_id,
                    skill_id=skills[skill_name],
                    confidence=90.0,
                )
            )
        for university, degree in spec["education"]:
            test_db.execute(
                insert(Education.__table__).values(
                    resume_id=resume_id,
                    institution=university,
                    degree=degree,
                    field_of_study="Computer Science",
                    start_date=date(2015, 1, 1),
                    end_date=date(2019, 1, 1),
                    description="Undergraduate degree",
                )
            )
        certificate_id = test_db.execute(
            insert(Certificate.__table__).values(
                user_id=user_id,
                title=spec["certificate"][0],
                issuer=spec["certificate"][1],
                issue_date=date(2024, 1, 1),
                file_path=str(tmp_path / f"certificate_{index}.pdf"),
            )
        ).inserted_primary_key[0]
        language_id = test_db.scalar(
            select(Language.__table__.c.language_id).where(
                Language.__table__.c.name == spec["language"]
            )
        )
        if language_id is None:
            language_id = test_db.execute(
                insert(Language.__table__).values(name=spec["language"])
            ).inserted_primary_key[0]
        test_db.execute(
            insert(UserLanguage.__table__).values(
                user_id=user_id,
                language_id=language_id,
                proficiency="Fluent",
            )
        )
        for start_date, end_date in spec["experience"]:
            test_db.execute(
                insert(WorkExperience.__table__).values(
                    resume_id=resume_id,
                    company_name="SmartHire",
                    title="Developer",
                    start_date=date.fromisoformat(start_date),
                    end_date=date.fromisoformat(end_date),
                    description="Professional experience",
                )
            )
        application_id = test_db.execute(
            insert(Application.__table__).values(
                user_id=user_id,
                job_id=spec["job_id"],
                resume_id=resume_id,
                status=spec["status"],
                created_at=spec["created_at"],
                updated_at=spec["created_at"],
            )
        ).inserted_primary_key[0]
        app_row = {
            "application_id": application_id,
            "user_id": user_id,
            "job_id": spec["job_id"],
            "status": spec["status"],
            "created_at": spec["created_at"],
        }
        application_rows.append(app_row)
        overall, skills_score, education_score, experience_score, certificate_score = spec["analysis"]
        test_db.execute(
            insert(AIAnalysis.__table__).values(
                application_id=application_id,
                overall_score=overall,
                skills_score=skills_score,
                education_score=education_score,
                experience_score=experience_score,
                certificate_score=certificate_score,
                recommendations=spec["recommendation"],
            )
        )
        if spec["decision"] == "Interview":
            test_db.execute(
                insert(Interview.__table__).values(
                    application_id=application_id,
                    interviewer_id=user_id,
                    scheduled_at=spec["created_at"] + timedelta(days=1),
                    interview_type="Online",
                    status="scheduled",
                )
            )

    test_db.commit()

    workflow_root = tmp_path / "workflow"
    workflow_root.mkdir(parents=True, exist_ok=True)
    history_lines = []
    audit_lines = []
    email_lines = []
    for spec, row in zip(candidate_specs, application_rows, strict=True):
        decision = spec["decision"]
        ts = row["created_at"] + timedelta(hours=6)
        history_lines.append(
            {
                "timestamp": ts.isoformat(),
                "event": "Recruiter Evaluation Saved",
                "action": "timeline_event",
                "recruiter": "Mia Carter",
                "candidate": f"{spec['first_name']} {spec['last_name']}",
                "candidate_id": str(row["user_id"]),
                "application_id": row["application_id"],
                "job_id": row["job_id"],
                "decision": decision,
                "document_type": {
                    "Accept": "Offer of Employment",
                    "Interview": "Interview Invitation",
                    "Hold": "Application On Hold Notice",
                    "Reject": "Application Status Notice",
                }[decision],
                "email_status": "sent" if decision != "Hold" else "failed",
                "rating": 4,
                "details": f"{decision} workflow",
            }
        )
        history_lines.append(
            {
                "timestamp": (ts + timedelta(minutes=2)).isoformat(),
                "event": {
                    "Accept": "Candidate Accepted",
                    "Interview": "Interview Scheduled",
                    "Hold": "Application On Hold",
                    "Reject": "Candidate Rejected",
                }[decision],
                "action": "timeline_event",
                "recruiter": "Mia Carter",
                "candidate": f"{spec['first_name']} {spec['last_name']}",
                "candidate_id": str(row["user_id"]),
                "application_id": row["application_id"],
                "job_id": row["job_id"],
                "decision": decision,
                "document_type": {
                    "Accept": "Offer of Employment",
                    "Interview": "Interview Invitation",
                    "Hold": "Application On Hold Notice",
                    "Reject": "Application Status Notice",
                }[decision],
                "email_status": "sent" if decision != "Hold" else "failed",
                "rating": 4,
                "details": spec["status"],
            }
        )
        audit_lines.append(
            {
                "timestamp": ts.isoformat(),
                "recruiter": "Mia Carter",
                "candidate": f"{spec['first_name']} {spec['last_name']}",
                "candidate_id": str(row["user_id"]),
                "job_id": row["job_id"],
                "decision": decision,
                "generated_document": {
                    "Accept": "Offer of Employment",
                    "Interview": "Interview Invitation",
                    "Hold": "Application On Hold Notice",
                    "Reject": "Application Status Notice",
                }[decision],
                "email_status": "sent" if decision != "Hold" else "failed",
                "action": "process_recruiter_decision",
                "email_attachment": f"{decision}_{spec['first_name']}_{spec['last_name']}.pdf",
                "rating": 4,
            }
        )
        email_lines.append(
            {
                "timestamp": ts.isoformat(),
                "recipient": spec["email"],
                "subject": f"SmartHire AI | {decision} - {spec['first_name']} {spec['last_name']}",
                "attachment": f"{decision}_{spec['first_name']}_{spec['last_name']}.pdf",
                "document": {
                    "Accept": "Offer of Employment",
                    "Interview": "Interview Invitation",
                    "Hold": "Application On Hold Notice",
                    "Reject": "Application Status Notice",
                }[decision],
                "status": "sent" if decision != "Hold" else "failed",
                "recruiter": "Mia Carter",
                "candidate": f"{spec['first_name']} {spec['last_name']}",
                "job_id": row["job_id"],
            }
        )

    (workflow_root / "workflow_history.jsonl").write_text(
        "\n".join(json.dumps(line) for line in history_lines),
        encoding="utf-8",
    )
    (workflow_root / "audit_log.jsonl").write_text(
        "\n".join(json.dumps(line) for line in audit_lines),
        encoding="utf-8",
    )
    (workflow_root / "email_log.jsonl").write_text(
        "\n".join(json.dumps(line) for line in email_lines),
        encoding="utf-8",
    )

    now = datetime.now(timezone.utc)
    test_db.execute(
        insert(User.__table__).values(
            user_id=uuid.uuid4(),
            role_id=admin_role_id,
            first_name="Admin",
            last_name="User",
            email="admin@smarthire.ai",
            password_hash="hash",
        )
    )
    test_db.commit()
    return CurrentUserResponse(
        user_id=uuid.uuid4(),
        role_id=admin_role_id,
        role_name="Admin",
        first_name="Admin",
        last_name="User",
        email="admin@smarthire.ai",
        created_at=now,
        updated_at=now,
    )


def test_powerbi_service_exports_and_tables(test_db, tmp_path):
    admin = _seed_powerbi_dataset(test_db, tmp_path)
    service = PowerBIService(test_db, report_root=tmp_path)

    executive = service.executive(admin)
    assert executive["kpis"]["total_applications"] == 4
    assert executive["kpis"]["accepted"] == 1
    assert executive["kpis"]["rejected"] == 1
    assert executive["kpis"]["interview"] == 1
    assert executive["kpis"]["hold"] == 1
    assert executive["kpis"]["emails_sent"] == 3
    assert executive["kpis"]["pdf_documents_generated"] == 4
    assert executive["funnel"]["name"] == "hiring_funnel"

    bundle = service.powerbi_dataset(admin).model_dump()
    table_names = {table["name"] for table in bundle["rows"]}
    assert {
        "executive_kpis",
        "hiring_funnel",
        "position_analytics",
        "top_detected_skills",
        "top_missing_skills",
        "skill_coverage",
        "skill_match_distribution",
        "education_analytics",
        "recruiter_analytics",
        "ai_analytics",
        "email_analytics",
        "workflow_analytics",
    }.issubset(table_names)

    csv_bytes, csv_type, csv_name = service.export(
        admin, report_format="csv", dataset="executive_kpis"
    )
    assert csv_type == "text/csv"
    assert csv_name == "executive_kpis.csv"
    csv_reader = csv.DictReader(StringIO(csv_bytes.decode("utf-8")))
    assert csv_reader.fieldnames == [
        "total_applications",
        "accepted",
        "rejected",
        "interview",
        "hold",
        "average_match_score",
        "highest_match_score",
        "lowest_match_score",
        "applications_today",
        "applications_this_week",
        "applications_this_month",
        "emails_sent",
        "pdf_documents_generated",
    ]

    json_bytes, json_type, json_name = service.export(
        admin, report_format="json", dataset="executive_kpis"
    )
    assert json_type == "application/json"
    assert json_name == "executive_kpis.json"
    payload = json.loads(json_bytes.decode("utf-8"))
    assert payload["dataset"] == "executive_kpis"
    assert payload["columns"] == csv_reader.fieldnames

    powerbi_bytes, powerbi_type, powerbi_name = service.export(admin, report_format="powerbi")
    assert powerbi_type == "application/json"
    assert powerbi_name == "powerbi_dataset.json"
    powerbi_payload = json.loads(powerbi_bytes.decode("utf-8"))
    assert any(table["name"] == "workflow_analytics" for table in powerbi_payload["rows"])


def test_powerbi_analytics_endpoints(test_db, tmp_path):
    admin = _seed_powerbi_dataset(test_db, tmp_path)

    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: admin
    try:
        with TestClient(app) as client:
            assert client.get("/analytics/executive").status_code == 200
            assert client.get("/analytics/funnel").status_code == 200
            assert client.get("/analytics/jobs").status_code == 200
            assert client.get("/analytics/recruiters").status_code == 200
            assert client.get("/analytics/education").status_code == 200
            assert client.get("/analytics/ai").status_code == 200
            assert client.get("/analytics/workflow").status_code == 200
            assert client.get("/analytics/skills").status_code == 200

            csv_response = client.get("/analytics/export?report_format=csv&dataset=executive_kpis")
            assert csv_response.status_code == 200
            assert csv_response.headers["content-type"].startswith("text/csv")

            json_response = client.get("/analytics/export?report_format=json&dataset=executive_kpis")
            assert json_response.status_code == 200
            assert json_response.headers["content-type"].startswith("application/json")

            powerbi_response = client.get("/analytics/export?report_format=powerbi")
            assert powerbi_response.status_code == 200
            assert powerbi_response.headers["content-type"].startswith("application/json")
            assert "powerbi_dataset.json" in powerbi_response.headers["content-disposition"]
    finally:
        app.dependency_overrides.clear()
