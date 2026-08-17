"""Initial schema

Revision ID: 650a107bcf13
Revises: 
Create Date: 2026-08-11 12:40:00.404263

"""
from alembic import op
import sqlalchemy as sa
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database.database import Base
import app.models  # noqa: F401


# revision identifiers, used by Alembic.
revision = '650a107bcf13'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    for table in Base.metadata.sorted_tables:
        table.create(bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    for table in reversed(Base.metadata.sorted_tables):
        table.drop(bind, checkfirst=True)
