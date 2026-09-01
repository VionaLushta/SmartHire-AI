"""add candidate about me field

Revision ID: c4d5e6f7a8b9
Revises: b8e1f2a3c4d5
"""

from alembic import op
import sqlalchemy as sa


revision = "c4d5e6f7a8b9"
down_revision = "b8e1f2a3c4d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("about_me", sa.String(length=4000), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "about_me")
