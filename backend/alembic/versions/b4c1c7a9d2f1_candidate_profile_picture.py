"""candidate profile picture

Revision ID: b4c1c7a9d2f1
Revises: 7e2d2c2d4d3a
Create Date: 2026-08-11 14:35:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b4c1c7a9d2f1"
down_revision = "7e2d2c2d4d3a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_picture_url", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_picture_url")
