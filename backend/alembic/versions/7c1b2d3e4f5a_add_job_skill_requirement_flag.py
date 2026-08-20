"""add job skill requirement flag

Revision ID: 7c1b2d3e4f5a
Revises: f4b7c8d9e0a1
"""

from alembic import op
import sqlalchemy as sa

revision = "7c1b2d3e4f5a"
down_revision = "f4b7c8d9e0a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "job_skills",
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column("job_skills", "is_required", server_default=None)


def downgrade() -> None:
    op.drop_column("job_skills", "is_required")
