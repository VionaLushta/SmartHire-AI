from __future__ import annotations

from datetime import datetime, timezone

from app.core.security import hash_password, verify_password
from app.repositories.auth_repository import AuthRepository
from scripts.create_admin import seed_admin


def test_create_admin_seed_is_idempotent(test_db, capsys):
    admin_email = "contact.smarthireai@proton.me"
    admin_password = "ChangeThisPassword"

    created = seed_admin(test_db, admin_email=admin_email, admin_password=admin_password)
    first_output = capsys.readouterr()

    assert created is True
    assert "Administrator account created." in first_output.out

    repo = AuthRepository(test_db)
    admin = repo.get_user_by_email(admin_email)
    assert admin is not None
    assert admin["email"] == admin_email
    assert str(admin["role_name"] or "").casefold() == "admin"
    assert admin["email_verified_at"] is not None
    assert verify_password(admin_password, admin["password_hash"])

    created_again = seed_admin(test_db, admin_email=admin_email, admin_password=admin_password)
    second_output = capsys.readouterr()

    assert created_again is False
    assert second_output.out.strip() == "Administrator already exists."


def test_create_admin_refreshes_existing_password_hash(test_db, capsys):
    admin_email = "contact.smarthireai@proton.me"
    current_admin_password = "CurrentAdminPassword123!"
    seed_password = "ChangeThisPassword"

    repo = AuthRepository(test_db)
    admin_role = repo.get_role_by_name("Admin") or repo.ensure_role("Admin", "Administrator")
    repo.create_user(
        first_name="SmartHire",
        last_name="Administrator",
        email=admin_email,
        phone=None,
        password_hash=hash_password(current_admin_password),
        role_id=admin_role["role_id"],
        email_verified_at=datetime.now(timezone.utc),
    )

    created = seed_admin(test_db, admin_email=admin_email, admin_password=seed_password)
    output = capsys.readouterr()

    assert created is False
    assert output.out.strip() == "Administrator already exists."

    admin = repo.get_user_by_email(admin_email)
    assert admin is not None
    assert verify_password(seed_password, admin["password_hash"])
