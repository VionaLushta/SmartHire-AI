"""job categories soft delete

Revision ID: c2c7a3d8f101
Revises: a1c7c4c2d0e1
Create Date: 2026-08-11 14:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c2c7a3d8f101"
down_revision = "a1c7c4c2d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("categories", "deleted_at")
