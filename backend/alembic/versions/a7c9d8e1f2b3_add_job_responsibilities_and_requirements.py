"""add job responsibilities and requirements

Revision ID: a7c9d8e1f2b3
Revises: f4b7c8d9e0a1
Create Date: 2026-08-31 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "a7c9d8e1f2b3"
down_revision = "f4b7c8d9e0a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("responsibilities", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("requirements", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "requirements")
    op.drop_column("jobs", "responsibilities")
