"""add last_login_at to users

Revision ID: b8f2c7a1d4e9
Revises: aa91b4c7d5e3
Create Date: 2026-08-28 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "b8f2c7a1d4e9"
down_revision = "aa91b4c7d5e3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_login_at")
