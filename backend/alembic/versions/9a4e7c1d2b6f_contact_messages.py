"""Add contact messages inbox.

Revision ID: 9a4e7c1d2b6f
Revises: f4b7c8d9e0a1
"""

from alembic import op
import sqlalchemy as sa


revision = "9a4e7c1d2b6f"
down_revision = "f4b7c8d9e0a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "contact_messages",
        sa.Column("message_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("company", sa.String(length=150), nullable=True),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="unread"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("message_id"),
    )
    op.create_index("ix_contact_messages_email", "contact_messages", ["email"])
    op.create_index("ix_contact_messages_status", "contact_messages", ["status"])


def downgrade() -> None:
    op.drop_index("ix_contact_messages_status", table_name="contact_messages")
    op.drop_index("ix_contact_messages_email", table_name="contact_messages")
    op.drop_table("contact_messages")
