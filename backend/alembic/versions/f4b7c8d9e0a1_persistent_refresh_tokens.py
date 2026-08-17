"""persistent refresh tokens

Revision ID: f4b7c8d9e0a1
Revises: e3a1f9b4c6d2
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f4b7c8d9e0a1"
down_revision = "e3a1f9b4c6d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("refresh_tokens", sa.Column("token_id", sa.Integer(), primary_key=True), sa.Column("jti", sa.String(length=64), nullable=False), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id"), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("revoked_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_refresh_tokens_jti", "refresh_tokens", ["jti"], unique=True)
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_expires_at", "refresh_tokens", ["expires_at"])


def downgrade() -> None:
    op.drop_table("refresh_tokens")
