"""job location remote

Revision ID: 7e2d2c2d4d3a
Revises: c2c7a3d8f101
Create Date: 2026-08-11 14:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "7e2d2c2d4d3a"
down_revision = "c2c7a3d8f101"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("location", sa.String(length=255), nullable=True))
    op.add_column("jobs", sa.Column("remote_option", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column("jobs", "remote_option", server_default=None)


def downgrade() -> None:
    op.drop_column("jobs", "remote_option")
    op.drop_column("jobs", "location")
