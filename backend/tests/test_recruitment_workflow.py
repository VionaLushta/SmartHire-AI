from __future__ import annotations

from datetime import datetime, timezone, date
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
import uuid

from sqlalchemy import insert, select

from app.models.application import AIAnalysis, Application, Notification
from app.models.company import Company
from app.models.interview import Interview
from app.models.job import Department, Job, JobSkill
from app.models.resume import Resume
from app.models.role import Role
from app.models.skill import Skill
from app.models.user import User
from app.services.recruitment_workflow import RecruitmentWorkflowService
from app.services.pdf_generator import GeneratedDocumentResult


class FakeDashboard:
    def __init__(self, payload: dict):
        self._payload = payload

    def model_dump(self) -> dict:
        return self._payload


class FakePdfGenerator:
    def __init__(self, tmp_path: Path) -> None:
        self.tmp_path = tmp_path
        self.calls: list[str] = []

    def _build(self, prefix: str, candidate: dict, document_type: str) -> GeneratedDocumentResult:
        name = f"{prefix}_{candidate['first_name']}_{candidate['last_name']}.pdf"
        path = self.tmp_path / name
        path.write_bytes(b"%PDF-1.4 fake")
        return GeneratedDocumentResult(
            file_path=str(path),
            generated_at=datetime.now(timezone.utc),
            document_type=document_type,
        )

    def generate_offer_letter(self, candidate, job, recruiter_name, **kwargs):
        self.calls.append("offer")
        return self._build("Offer", candidate, "Offer of Employment")

    def generate_interview_letter(self, candidate, job, recruiter_name, **kwargs):
        self.calls.append("interview")
        return self._build("Interview", candidate, "Interview Invitation")

    def generate_hold_letter(self, candidate, job, recruiter_name, **kwargs):
        self.calls.append("hold")
        return self._build("Hold", candidate, "Application On Hold Notice")

    def generate_rejection_letter(self, candidate, job, recruiter_name, **kwargs):
        self.calls.append("reject")
        return self._build("Rejection", candidate, "Application Status Notice")


class FakeAnalyticsService:
    def __init__(self) -> None:
        self.calls: list[str] = []

    def _dashboard(self, scope: str, **kwargs):
        self.calls.append(scope)
        return FakeDashboard({"scope": scope, "metrics": {"refreshed": True}, "funnel": []})


def _seed_workflow_data(test_db):
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
            description="Builds product and platform systems",
        )
    ).inserted_primary_key[0]
    job_id = test_db.execute(
        insert(Job.__table__).values(
            company_id=company_id,
            department_id=department_id,
            title="Backend Python Developer",
            description="Build APIs with Python, FastAPI, SQL, and Docker.",
            employment_type="Full-time",
            experience_level="Mid",
            location="Remote",
            remote_option=True,
            status="open",
        )
    ).inserted_primary_key[0]

    python_id = test_db.execute(
        insert(Skill.__table__).values(name="Python", category="Backend")
    ).inserted_primary_key[0]
    fastapi_id = test_db.execute(
        insert(Skill.__table__).values(name="FastAPI", category="Backend")
    ).inserted_primary_key[0]
    sql_id = test_db.execute(
        insert(Skill.__table__).values(name="SQL", category="Database")
    ).inserted_primary_key[0]
    docker_id = test_db.execute(
        insert(Skill.__table__).values(name="Docker", category="DevOps")
    ).inserted_primary_key[0]
    aws_id = test_db.execute(
        insert(Skill.__table__).values(name="AWS", category="Cloud")
    ).inserted_primary_key[0]

    for skill_id, required in (
        (python_id, True),
        (fastapi_id, True),
        (sql_id, True),
        (docker_id, False),
        (aws_id, False),
    ):
        test_db.execute(
            insert(JobSkill.__table__).values(
                job_id=job_id,
                skill_id=skill_id,
                is_required=required,
                required_level=4 if required else 2,
            )
        )

    recruiter_id = uuid.uuid4()
    candidate_id = uuid.uuid4()
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
        insert(User.__table__).values(
            user_id=candidate_id,
            role_id=candidate_role_id,
            first_name="Viona",
            last_name="Lushta",
            email="viona.lushta@example.com",
            password_hash="hash",
        )
    )

    resume_id = test_db.execute(
        insert(Resume.__table__).values(
            user_id=candidate_id,
            file_path=str(Path("C:/tmp/viona_resume.pdf")),
            parsed_text=(
                "Python FastAPI SQL Docker backend developer with cloud and Git experience."
            ),
        )
    ).inserted_primary_key[0]
    application_id = test_db.execute(
        insert(Application.__table__).values(
            user_id=candidate_id,
            job_id=job_id,
            resume_id=resume_id,
            status="submitted",
        )
    ).inserted_primary_key[0]
    test_db.execute(
        insert(AIAnalysis.__table__).values(
            application_id=application_id,
            overall_score=82.0,
            skills_score=78.0,
            education_score=70.0,
            experience_score=74.0,
            certificate_score=65.0,
            recommendations="Strong backend candidate.",
        )
    )
    test_db.commit()

    return {
        "candidate_id": candidate_id,
        "recruiter_id": recruiter_id,
        "job_id": job_id,
        "company_id": company_id,
    }


def _build_service(test_db, tmp_path: Path):
    seeded = _seed_workflow_data(test_db)
    pdf = FakePdfGenerator(tmp_path)
    analytics = FakeAnalyticsService()
    email_service = SimpleNamespace(
        _deliver=MagicMock(
            return_value={
                "status": "sent",
                "recipient": "viona.lushta@example.com",
                "document": "Offer of Employment",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message_id": "<msg@example.com>",
                "subject": "SmartHire AI | Offer of Employment - Viona Lushta",
                "attachment": "Offer_Viona_Lushta.pdf",
            }
        )
    )
    service = RecruitmentWorkflowService(
        test_db,
        report_root=tmp_path,
        pdf_generator=pdf,
        email_service=email_service,  # type: ignore[arg-type]
        analytics_service=analytics,  # type: ignore[arg-type]
    )
    return service, seeded, pdf, email_service, analytics


def _assert_common_result(result: dict, expected_decision: str, expected_document: str):
    assert result["status"] in {"completed", "partial_success"}
    assert result["decision"] == expected_decision
    assert result["document"]["document_type"] == expected_document
    assert result["timeline"][0]["event"] == "Recruiter Evaluation Saved"
    assert result["timeline"][1]["event"] in {
        "Candidate Accepted",
        "Interview Scheduled",
        "Application On Hold",
        "Candidate Rejected",
    }
    assert Path(result["audit_log_path"]).exists()
    assert Path(result["email_log_path"]).exists()
    assert Path(result["workflow_history_path"]).exists()
    assert "overall_match_score" in result["ai_evaluation"]


def test_accept_workflow(test_db, tmp_path):
    service, seeded, pdf, email_service, analytics = _build_service(test_db, tmp_path)

    result = service.process_recruiter_decision(
        candidate_id=seeded["candidate_id"],
        job_id=seeded["job_id"],
        decision="Accept",
        recruiter_name="Mia Carter",
        notes="Strong backend match.",
        rating=5,
        expected_start_date=date(2026, 9, 1),
        employment_type="Full-time",
        department="Engineering",
        work_location="Remote",
        acceptance_instructions=["Review the offer", "Sign by Friday"],
    )

    _assert_common_result(result, "Accept", "Offer of Employment")
    assert result["email"]["status"] == "sent"
    assert pdf.calls == ["offer"]
    assert email_service._deliver.called
    status_value = test_db.scalar(
        select(Application.__table__.c.status).where(
            Application.__table__.c.user_id == seeded["candidate_id"],
            Application.__table__.c.job_id == seeded["job_id"],
        )
    )
    assert status_value == "accepted"
    notifications = test_db.execute(select(Notification.__table__)).mappings().all()
    assert len(notifications) >= 2
    assert analytics.calls[:3] == ["overview", "trends", "skills"]


def test_interview_workflow(test_db, tmp_path):
    service, seeded, pdf, email_service, _ = _build_service(test_db, tmp_path)

    result = service.process_recruiter_decision(
        candidate_id=seeded["candidate_id"],
        job_id=seeded["job_id"],
        decision="Interview",
        recruiter_name="Mia Carter",
        notes="Schedule a technical interview.",
        rating=4,
        interview_date=date(2026, 9, 3),
        interview_time="10:30 AM",
        interviewer_name="Mia Carter",
        interview_type="Online",
    )

    _assert_common_result(result, "Interview", "Interview Invitation")
    assert pdf.calls == ["interview"]
    assert email_service._deliver.called
    status_value = test_db.scalar(
        select(Application.__table__.c.status).where(
            Application.__table__.c.user_id == seeded["candidate_id"],
            Application.__table__.c.job_id == seeded["job_id"],
        )
    )
    assert status_value == "interview_scheduled"
    interview_rows = test_db.execute(select(Interview.__table__)).mappings().all()
    assert len(interview_rows) == 1
    assert interview_rows[0]["interview_type"] == "Online"


def test_hold_workflow(test_db, tmp_path):
    service, seeded, pdf, email_service, _ = _build_service(test_db, tmp_path)

    result = service.process_recruiter_decision(
        candidate_id=seeded["candidate_id"],
        job_id=seeded["job_id"],
        decision="Hold",
        recruiter_name="Mia Carter",
        notes="Keep under review.",
        rating=3,
    )

    _assert_common_result(result, "Hold", "Application On Hold Notice")
    assert pdf.calls == ["hold"]
    assert email_service._deliver.called
    status_value = test_db.scalar(
        select(Application.__table__.c.status).where(
            Application.__table__.c.user_id == seeded["candidate_id"],
            Application.__table__.c.job_id == seeded["job_id"],
        )
    )
    assert status_value == "on_hold"


def test_reject_workflow(test_db, tmp_path):
    service, seeded, pdf, email_service, _ = _build_service(test_db, tmp_path)

    result = service.process_recruiter_decision(
        candidate_id=seeded["candidate_id"],
        job_id=seeded["job_id"],
        decision="Reject",
        recruiter_name="Mia Carter",
        notes="Better fit elsewhere.",
        rating=2,
    )

    _assert_common_result(result, "Reject", "Application Status Notice")
    assert pdf.calls == ["reject"]
    assert email_service._deliver.called
    status_value = test_db.scalar(
        select(Application.__table__.c.status).where(
            Application.__table__.c.user_id == seeded["candidate_id"],
            Application.__table__.c.job_id == seeded["job_id"],
        )
    )
    assert status_value == "rejected"

