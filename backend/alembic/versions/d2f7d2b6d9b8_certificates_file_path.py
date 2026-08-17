"""certificates file path

Revision ID: d2f7d2b6d9b8
Revises: c9bdf6f4a8e2
Create Date: 2026-08-11 15:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d2f7d2b6d9b8"
down_revision = "c9bdf6f4a8e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("certificates", sa.Column("file_path", sa.String(length=255), nullable=False, server_default=""))
    op.alter_column("certificates", "file_path", server_default=None)


def downgrade() -> None:
    op.drop_column("certificates", "file_path")
