from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy import insert, select
from sqlalchemy.orm import sessionmaker

from app.api.interviews import get_interview_scheduler_service
from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.main import app
from app.models.application import AIAnalysis, Application, Notification
from app.models.company import Company
from app.models.company_user import CompanyUser
from app.models.interview import Interview
from app.models.job import Department, Job, JobSkill
from app.models.resume import Resume
from app.models.role import Role
from app.models.skill import Skill
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.schemas.interview import InterviewScheduleRequest, InterviewUpdateRequest
from app.services.interview_ai_service import InterviewAIService
from app.services.interview_scheduler_service import InterviewSchedulerService
from app.services.pdf_generator import PdfGenerator


class FakeEmailService:
    def __init__(self) -> None:
        self.deliveries: list[dict[str, object]] = []

    def _deliver(self, recipient, document, template):
        payload = {
            "status": "sent",
            "recipient": recipient,
            "document": document.document_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message_id": f"<{len(self.deliveries) + 1}@smarthire.test>",
            "subject": template.subject,
            "attachment": Path(document.file_path).name,
            "file_path": document.file_path,
        }
        self.deliveries.append(payload)
        return payload


def _user(
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
    return _user(user_id, 1, "Admin", "Ava", "Admin", "admin@smarthire.ai")


def _recruiter_user(user_id: UUID) -> CurrentUserResponse:
    return _user(user_id, 2, "Recruiter", "Mia", "Carter", "mia.carter@smarthire.ai")


def _candidate_user(user_id: UUID, first_name: str = "Noah", last_name: str = "Patel") -> CurrentUserResponse:
    return _user(user_id, 3, "Candidate", first_name, last_name, f"{first_name.lower()}.{last_name.lower()}@example.com")


def _seed_scheduler_data(test_db):
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
            description="Builds hiring platform systems",
        )
    ).inserted_primary_key[0]
    job_id = test_db.execute(
        insert(Job.__table__).values(
            company_id=company_id,
            department_id=department_id,
            title="Backend Python Engineer",
            description="Build APIs with Python, FastAPI, PostgreSQL, Docker, and communication skills.",
            employment_type="Full-time",
            experience_level="Mid",
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
        ("Communication", False),
    ):
        test_db.execute(
            insert(JobSkill.__table__).values(
                job_id=job_id,
                skill_id=skill_ids[skill_name],
                is_required=required,
                required_level=4 if required else 2,
            )
        )

    admin_id = uuid4()
    recruiter_id = uuid4()
    candidate1_id = uuid4()
    candidate2_id = uuid4()

    for user_id, role_id, first_name, last_name, email in (
        (admin_id, admin_role_id, "Ava", "Admin", "admin@smarthire.ai"),
        (recruiter_id, recruiter_role_id, "Mia", "Carter", "mia.carter@smarthire.ai"),
        (candidate1_id, candidate_role_id, "Noah", "Patel", "noah.patel@example.com"),
        (candidate2_id, candidate_role_id, "Sara", "Ahmed", "sara.ahmed@example.com"),
    ):
        test_db.execute(
            insert(User.__table__).values(
                user_id=user_id,
                role_id=role_id,
                first_name=first_name,
                last_name=last_name,
                email=email,
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

    resume1_id = test_db.execute(
        insert(Resume.__table__).values(
            user_id=candidate1_id,
            file_path=str(Path("C:/tmp/noah_resume.pdf")),
            parsed_text="Python FastAPI PostgreSQL Docker communication backend APIs",
        )
    ).inserted_primary_key[0]
    resume2_id = test_db.execute(
        insert(Resume.__table__).values(
            user_id=candidate2_id,
            file_path=str(Path("C:/tmp/sara_resume.pdf")),
            parsed_text="Python FastAPI PostgreSQL communication teamwork backend",
        )
    ).inserted_primary_key[0]

    app1_id = test_db.execute(
        insert(Application.__table__).values(
            user_id=candidate1_id,
            job_id=job_id,
            resume_id=resume1_id,
            status="submitted",
        )
    ).inserted_primary_key[0]
    app2_id = test_db.execute(
        insert(Application.__table__).values(
            user_id=candidate2_id,
            job_id=job_id,
            resume_id=resume2_id,
            status="submitted",
        )
    ).inserted_primary_key[0]

    test_db.execute(
        insert(AIAnalysis.__table__).values(
            application_id=app1_id,
            overall_score=82.0,
            skills_score=79.0,
            education_score=70.0,
            experience_score=74.0,
            certificate_score=63.0,
            recommendations="Strong candidate.",
        )
    )
    test_db.execute(
        insert(AIAnalysis.__table__).values(
            application_id=app2_id,
            overall_score=76.0,
            skills_score=74.0,
            education_score=68.0,
            experience_score=70.0,
            certificate_score=60.0,
            recommendations="Good candidate.",
        )
    )

    test_db.commit()
    return {
        "admin_id": admin_id,
        "recruiter_id": recruiter_id,
        "candidate1_id": candidate1_id,
        "candidate2_id": candidate2_id,
        "job_id": job_id,
        "company_id": company_id,
    }


@pytest.fixture()
def scheduler_context(test_db, tmp_path):
    seeded = _seed_scheduler_data(test_db)
    fake_email = FakeEmailService()
    service = InterviewSchedulerService(
        test_db,
        report_root=tmp_path,
        interview_ai_service=InterviewAIService(report_root=tmp_path),
        email_service=fake_email,  # type: ignore[arg-type]
        pdf_generator=PdfGenerator(report_root=tmp_path),
    )
    request_session = sessionmaker(bind=test_db.get_bind())()
    try:
        yield seeded, service, fake_email, request_session
    finally:
        request_session.close()


@pytest.fixture()
def scheduler_client(scheduler_context):
    seeded, service, _, request_session = scheduler_context
    app.dependency_overrides[get_interview_scheduler_service] = lambda: service
    app.dependency_overrides[get_db] = lambda: request_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def _schedule_payload(candidate_id: UUID, job_id: int) -> dict[str, object]:
    return {
        "candidate_id": str(candidate_id),
        "job_id": job_id,
        "interviewer_id": None,
        "interview_date": (date.today() + timedelta(days=2)).isoformat(),
        "interview_time": "10:30 AM",
        "duration_minutes": 45,
        "interview_type": "Online",
        "location": "Remote",
        "meeting_link": "https://meet.example.com/interview",
        "notes": "Technical interview.",
        "regenerate_questions": False,
    }


def test_schedule_update_cancel_complete_and_export(scheduler_context):
    seeded, service, fake_email, _ = scheduler_context
    recruiter = _recruiter_user(seeded["recruiter_id"])
    schedule_request = InterviewScheduleRequest.model_validate(
        _schedule_payload(seeded["candidate1_id"], seeded["job_id"])
    )

    scheduled = service.schedule_interview(schedule_request, recruiter)

    assert scheduled.status == "Scheduled"
    assert scheduled.questions
    assert len(scheduled.questions) == 15
    assert scheduled.guide is not None
    assert scheduled.email_status == "sent"
    assert scheduled.timeline[-1].event == "Interview Invitation Sent"
    assert fake_email.deliveries[-1]["subject"] == "SmartHire AI | Interview Invitation - Noah Patel"
    assert service.db.scalar(
        select(Application.__table__.c.status).where(
            Application.__table__.c.user_id == seeded["candidate1_id"],
            Application.__table__.c.job_id == seeded["job_id"],
        )
    ) == "interview_scheduled"
    assert service.db.scalar(select(Interview.__table__.c.status)) == "Scheduled"

    original_question = scheduled.questions[0].question
    updated = service.update_interview(
        scheduled.interview_id,
        InterviewUpdateRequest.model_validate(
            {
                "interview_date": (date.today() + timedelta(days=4)).isoformat(),
                "interview_time": "2:00 PM",
                "duration_minutes": 60,
                "interview_type": "Technical",
                "location": "Room 4B",
                "meeting_link": "https://meet.example.com/rescheduled",
                "notes": "Rescheduled technical interview.",
                "status": None,
                "regenerate_questions": True,
            }
        ),
        recruiter,
    )

    assert updated.status == "Rescheduled"
    assert updated.interview_type == "Technical"
    assert updated.interview_time == "2:00 PM"
    assert updated.questions[0].question != original_question
    assert fake_email.deliveries[-1]["subject"] == "SmartHire AI | Interview Rescheduled - Noah Patel"

    completed = service.complete_interview(updated.interview_id, recruiter, notes="Interview completed.")
    assert completed.status == "Completed"
    assert service.db.scalar(
        select(Application.__table__.c.status).where(
            Application.__table__.c.user_id == seeded["candidate1_id"],
            Application.__table__.c.job_id == seeded["job_id"],
        )
    ) == "interviewed"

    csv_content, csv_media_type, csv_filename = service.export_interviews(recruiter, report_format="csv")
    assert csv_media_type == "text/csv"
    assert csv_filename.endswith(".csv")
    assert "interview_id" in csv_content.decode("utf-8")

    json_content, json_media_type, json_filename = service.export_interviews(recruiter, report_format="json")
    assert json_media_type == "application/json"
    assert json_filename.endswith(".json")
    assert json.loads(json_content.decode("utf-8"))["dataset"] == "interview_schedule"

    powerbi_content, powerbi_media_type, powerbi_filename = service.export_interviews(
        recruiter, report_format="powerbi"
    )
    assert powerbi_media_type == "application/json"
    assert powerbi_filename.endswith("_powerbi.json")
    assert json.loads(powerbi_content.decode("utf-8"))["dataset"]["name"] == "interview_schedule"


def test_candidate_can_only_view_own_interviews_and_permissions_are_enforced(scheduler_context):
    seeded, service, _, _ = scheduler_context
    recruiter = _recruiter_user(seeded["recruiter_id"])
    candidate = _candidate_user(seeded["candidate1_id"], "Noah", "Patel")
    other_candidate = _candidate_user(seeded["candidate2_id"], "Sara", "Ahmed")
    schedule_request = InterviewScheduleRequest.model_validate(
        _schedule_payload(seeded["candidate1_id"], seeded["job_id"])
    )
    scheduled = service.schedule_interview(schedule_request, recruiter)
    service.schedule_interview(
        InterviewScheduleRequest.model_validate(
            _schedule_payload(seeded["candidate2_id"], seeded["job_id"])
        ),
        recruiter,
    )

    own_interviews = service.candidate_interviews(candidate.user_id, candidate)
    assert len(own_interviews) == 1
    assert own_interviews[0].candidate_id == candidate.user_id

    with pytest.raises(HTTPException):
        service.candidate_interviews(other_candidate.user_id, candidate)


def test_reminders_and_cancel_flow(scheduler_context):
    seeded, service, fake_email, _ = scheduler_context
    recruiter = _recruiter_user(seeded["recruiter_id"])
    schedule_request = InterviewScheduleRequest.model_validate(
        _schedule_payload(seeded["candidate2_id"], seeded["job_id"])
    )
    scheduled = service.schedule_interview(schedule_request, recruiter)

    reminder_count = service.send_due_reminders(now=datetime.now(timezone.utc) + timedelta(days=3))
    assert reminder_count == 1
    assert fake_email.deliveries[-1]["subject"] == "SmartHire AI | Interview Reminder - Sara Ahmed"

    cancelled = service.cancel_interview(scheduled.interview_id, recruiter, notes="Candidate withdrew.")
    assert cancelled.status == "Cancelled"
    assert fake_email.deliveries[-1]["subject"] == "SmartHire AI | Interview Cancelled - Sara Ahmed"


def test_api_endpoints_and_access_control(scheduler_client, scheduler_context):
    seeded, _, _, request_session = scheduler_context
    recruiter = _recruiter_user(seeded["recruiter_id"])
    admin = _admin_user(seeded["admin_id"])
    candidate = _candidate_user(seeded["candidate1_id"], "Noah", "Patel")

    app.dependency_overrides[get_current_user] = lambda: recruiter
    schedule_response = scheduler_client.post(
        "/interviews",
        json=_schedule_payload(seeded["candidate1_id"], seeded["job_id"]),
    )
    assert schedule_response.status_code == 201
    interview_id = schedule_response.json()["interview_id"]

    recruiter_list = scheduler_client.get("/interviews")
    assert recruiter_list.status_code == 200
    assert len(recruiter_list.json()) >= 1

    app.dependency_overrides[get_current_user] = lambda: candidate
    forbidden_list = scheduler_client.get("/interviews")
    assert forbidden_list.status_code == 403

    own_candidate_view = scheduler_client.get(f"/interviews/candidate/{seeded['candidate1_id']}")
    assert own_candidate_view.status_code == 200
    assert len(own_candidate_view.json()) == 1

    other_candidate_view = scheduler_client.get(f"/interviews/candidate/{seeded['candidate2_id']}")
    assert other_candidate_view.status_code == 403

    app.dependency_overrides[get_current_user] = lambda: recruiter
    update_response = scheduler_client.put(
        f"/interviews/{interview_id}",
        json={
            "interview_date": (date.today() + timedelta(days=5)).isoformat(),
            "interview_time": "1:30 PM",
            "duration_minutes": 60,
            "interview_type": "HR",
            "location": "Interview Room",
            "meeting_link": "https://meet.example.com/hr",
            "notes": "HR follow-up.",
            "regenerate_questions": True,
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "Rescheduled"

    delete_response = scheduler_client.delete(f"/interviews/{interview_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "Cancelled"

    app.dependency_overrides[get_current_user] = lambda: admin
    export_response = scheduler_client.get("/interviews/export", params={"format": "json"})
    assert export_response.status_code == 200
    assert export_response.headers["content-disposition"].endswith('.json"')
    assert "interview_schedule" in export_response.text

    app.dependency_overrides.clear()
