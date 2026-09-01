from __future__ import annotations

import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BACKEND_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_ROOT / ".env"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import Settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.core.security import verify_password  # noqa: E402
from app.repositories.auth_repository import AuthRepository  # noqa: E402


def _load_settings() -> Settings:
    return Settings(_env_file=ENV_FILE, _env_file_encoding="utf-8")


@contextmanager
def _session_scope(database_url: str):
    engine = create_engine(database_url, pool_pre_ping=True)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def seed_admin(db, *, admin_email: str, admin_password: str) -> bool:
    repo = AuthRepository(db)
    admin_role = (
        repo.get_role_by_name("admin")
        or repo.get_role_by_name("Admin")
        or repo.ensure_role("Admin", "Administrator")
    )
    existing_user = repo.get_user_by_email(admin_email)
    if existing_user is not None:
        if str(existing_user.get("role_name") or "").casefold() == "admin":
            if not verify_password(admin_password, str(existing_user.get("password_hash") or "")):
                repo.update_user(
                    existing_user["user_id"],
                    password_hash=hash_password(admin_password),
                )
            print("Administrator already exists.")
            return False
        raise SystemExit(f"Email {admin_email} is already used by another account.")

    repo.create_user(
        first_name="SmartHire",
        last_name="Administrator",
        email=admin_email,
        phone=None,
        password_hash=hash_password(admin_password),
        role_id=admin_role["role_id"],
        email_verified_at=datetime.now(timezone.utc),
    )
    print("Administrator account created.")
    return True


def main() -> int:
    settings = _load_settings()
    admin_email = str(settings.admin_email or "").strip()
    admin_password = str(settings.admin_password or "")

    if not settings.database_url:
        raise SystemExit("DATABASE_URL is not configured.")
    if not admin_email:
        raise SystemExit("ADMIN_EMAIL is not configured.")
    if not admin_password:
        raise SystemExit("ADMIN_PASSWORD is not configured.")

    with _session_scope(settings.database_url) as db:
        seed_admin(db, admin_email=admin_email, admin_password=admin_password)
        db.commit()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
