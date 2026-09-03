"""add candidate date of birth

Revision ID: a7c9d2e4f601
Revises: f4b7c8d9e0a1
"""

from alembic import op
import sqlalchemy as sa


revision = "a7c9d2e4f601"
down_revision = "f4b7c8d9e0a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("date_of_birth", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "date_of_birth")
