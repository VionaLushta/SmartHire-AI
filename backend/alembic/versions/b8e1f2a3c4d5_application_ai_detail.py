"""store application AI component scores and explanations

Revision ID: b8e1f2a3c4d5
Revises: a7c9d8e1f2b3
"""
from alembic import op
import sqlalchemy as sa

revision = "b8e1f2a3c4d5"
down_revision = "a7c9d8e1f2b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ai_analysis", sa.Column("resume_score", sa.Float(), nullable=True))
    op.add_column("ai_analysis", sa.Column("language_score", sa.Float(), nullable=True))
    op.add_column("ai_analysis", sa.Column("missing_skills", sa.Text(), nullable=True))
    op.add_column("ai_analysis", sa.Column("strengths", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("ai_analysis", "strengths")
    op.drop_column("ai_analysis", "missing_skills")
    op.drop_column("ai_analysis", "language_score")
    op.drop_column("ai_analysis", "resume_score")
