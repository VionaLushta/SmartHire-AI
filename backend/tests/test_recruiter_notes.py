from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import insert
from sqlalchemy.orm import sessionmaker

from app.api.recruiter_notes import get_recruiter_notes_service
from app.core.dependencies import get_current_user, get_db
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import CurrentUserResponse
from app.schemas.recruiter_notes import (
    RecruiterNoteCategory,
    RecruiterNoteCreateRequest,
    RecruiterNotePinRequest,
    RecruiterNoteReplyRequest,
    RecruiterNoteUpdateRequest,
)
from app.services.recruiter_notes_service import RecruiterNotesService


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


def _seed_recruiter_notes_data(test_db) -> dict[str, object]:
    admin_role_id = test_db.execute(
        insert(Role.__table__).values(name="Admin", description="Administrator")
    ).inserted_primary_key[0]
    recruiter_role_id = test_db.execute(
        insert(Role.__table__).values(name="Recruiter", description="Recruiter")
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
    mention_recruiter_id = test_db.execute(
        insert(User.__table__).values(
            role_id=recruiter_role_id,
            first_name="Alex",
            last_name="Mentor",
            email="alex.mentor@smarthire.ai",
            password_hash="hash-mentor",
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
        "mentor": _current_user(
            user_id=mention_recruiter_id,
            role_id=recruiter_role_id,
            role_name="Recruiter",
            first_name="Alex",
            last_name="Mentor",
            email="alex.mentor@smarthire.ai",
        ),
        "candidate": _current_user(
            user_id=candidate_id,
            role_id=candidate_role_id,
            role_name="Candidate",
            first_name="Dana",
            last_name="Lee",
            email="dana.lee@example.com",
        ),
        "candidate_id": candidate_id,
    }


def test_recruiter_notes_service_supports_threads_mentions_search_and_timeline(test_db, tmp_path):
    seeded = _seed_recruiter_notes_data(test_db)
    service = RecruiterNotesService(test_db, report_root=tmp_path)

    note = service.create_note(
        seeded["recruiter"],
        RecruiterNoteCreateRequest(
            candidate_id=seeded["candidate_id"],
            message="Please review Docker, FastAPI, and the handoff with @alex.mentor.",
            category="Technical Review",
        ),
    )
    assert note.category == "Technical Review"
    assert note.mentions[0].handle == "alex.mentor"
    assert note.pinned_status is False

    reply = service.reply_to_note(
        seeded["mentor"],
        note.note_id,
        RecruiterNoteReplyRequest(
            message="Candidate looks good for the HR discussion.",
            category="HR Review",
        ),
    )
    assert reply.parent_note_id == note.note_id
    assert reply.author_name == "Alex Mentor"

    updated = service.update_note(
        seeded["recruiter"],
        note.note_id,
        RecruiterNoteUpdateRequest(
            message="Final decision: strong Docker and FastAPI ownership for @alex.mentor.",
            category="Hiring Decision",
        ),
    )
    assert updated.edited_status is True
    assert updated.category == "Hiring Decision"

    pinned = service.pin_note(
        seeded["admin"],
        note.note_id,
        RecruiterNotePinRequest(pinned=True),
    )
    assert pinned.pinned_status is True

    thread = service.get_notes(
        seeded["recruiter"],
        seeded["candidate_id"],
        author="Maya",
        keyword="Docker",
        category="Hiring Decision",
        date_from=datetime.now(timezone.utc).date(),
    )
    assert thread.total_notes == 1
    assert thread.discussion_thread[0].note_id == note.note_id
    assert thread.discussion_thread[0].replies[0].note_id == reply.note_id
    assert thread.pinned_notes[0].note_id == note.note_id
    assert any(item.handle == "alex.mentor" for item in thread.recruiter_mentions)
    assert any(event.event == "Recruiter Note Added" for event in thread.recent_activity)
    assert any(event.event == "Recruiter Mentioned" for event in thread.recent_activity)
    assert any(event.event == "Recruiter Note Edited" for event in thread.recent_activity)
    assert any(event.event == "Recruiter Note Pinned" for event in thread.recent_activity)
    assert any(event.event == "Hiring Decision Updated" for event in thread.recent_activity)

    admin_note = service.create_note(
        seeded["admin"],
        RecruiterNoteCreateRequest(
            candidate_id=seeded["candidate_id"],
            message="Internal HR note for follow-up.",
            category="HR Review",
        ),
    )
    service.delete_note(seeded["admin"], admin_note.note_id)

    refreshed = service.get_notes(seeded["recruiter"], seeded["candidate_id"])
    assert refreshed.total_notes == 2
    assert all(item.note_id != admin_note.note_id for item in refreshed.discussion_thread)

    candidate_forbidden = False
    try:
        service.get_notes(seeded["candidate"], seeded["candidate_id"])
    except Exception:
        candidate_forbidden = True
    assert candidate_forbidden is True


def test_recruiter_notes_api_permissions_and_moderation(test_db, tmp_path):
    seeded = _seed_recruiter_notes_data(test_db)
    service = RecruiterNotesService(test_db, report_root=tmp_path)
    request_session = sessionmaker(bind=test_db.get_bind())()
    app.dependency_overrides[get_db] = lambda: request_session
    app.dependency_overrides[get_recruiter_notes_service] = lambda: service
    try:
        with TestClient(app) as client:
            app.dependency_overrides[get_current_user] = lambda: seeded["recruiter"]
            create_response = client.post(
                "/recruiter-notes",
                json={
                    "candidate_id": str(seeded["candidate_id"]),
                    "message": "Needs stronger evidence of SQL ownership.",
                    "category": "Technical Review",
                },
            )
            assert create_response.status_code == 201
            note_id = create_response.json()["note_id"]

            list_response = client.get(
                f"/recruiter-notes/{seeded['candidate_id']}",
                params={"keyword": "SQL"},
            )
            assert list_response.status_code == 200
            assert list_response.json()["total_notes"] == 1

            reply_response = client.post(
                f"/recruiter-notes/{note_id}/reply",
                json={"message": "Please verify this with the hiring manager.", "category": "General"},
            )
            assert reply_response.status_code == 201

            pin_response = client.post(f"/recruiter-notes/{note_id}/pin")
            assert pin_response.status_code == 200
            assert pin_response.json()["pinned_status"] is True

            app.dependency_overrides[get_current_user] = lambda: seeded["candidate"]
            forbidden_get = client.get(f"/recruiter-notes/{seeded['candidate_id']}")
            assert forbidden_get.status_code == 403
            forbidden_post = client.post(
                "/recruiter-notes",
                json={
                    "candidate_id": str(seeded["candidate_id"]),
                    "message": "I should not be able to post this.",
                    "category": "General",
                },
            )
            assert forbidden_post.status_code == 403

            app.dependency_overrides[get_current_user] = lambda: seeded["mentor"]
            forbidden_update = client.put(
                f"/recruiter-notes/{note_id}",
                json={"message": "Editing someone else's note.", "category": "General"},
            )
            assert forbidden_update.status_code == 403

            app.dependency_overrides[get_current_user] = lambda: seeded["recruiter"]
            delete_response = client.delete(f"/recruiter-notes/{note_id}")
            assert delete_response.status_code == 204
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_recruiter_notes_service, None)
        app.dependency_overrides.pop(get_current_user, None)
