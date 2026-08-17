"""add high-traffic query indexes

Revision ID: e3a1f9b4c6d2
Revises: d2f7d2b6d9b8
"""

from alembic import op


revision = "e3a1f9b4c6d2"
down_revision = "d2f7d2b6d9b8"
branch_labels = None
depends_on = None


_INDEXES = (
    ("ix_users_role_id", "users", ["role_id"]),
    ("ix_company_users_user_id", "company_users", ["user_id"]),
    ("ix_applications_user_id", "applications", ["user_id"]),
    ("ix_applications_job_id", "applications", ["job_id"]),
    ("ix_applications_status", "applications", ["status"]),
    ("ix_resumes_user_id", "resumes", ["user_id"]),
    ("ix_certificates_user_id", "certificates", ["user_id"]),
    ("ix_jobs_company_id", "jobs", ["company_id"]),
    ("ix_jobs_department_id", "jobs", ["department_id"]),
    ("ix_jobs_status", "jobs", ["status"]),
    ("ix_interviews_application_id", "interviews", ["application_id"]),
)


def upgrade() -> None:
    for name, table, columns in _INDEXES:
        op.create_index(name, table, columns)


def downgrade() -> None:
    for name, table, _ in reversed(_INDEXES):
        op.drop_index(name, table_name=table)
