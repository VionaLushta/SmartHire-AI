"""Merge the existing Alembic migration branches.

This revision only unifies the migration graph. The five parent revisions
already exist in the database, so no schema operation is required here.
"""

from collections.abc import Sequence

from alembic import op


revision: str = "f8e9d0c1b2a3"
down_revision: tuple[str, ...] = (
    "b8f2c7a1d4e9",
    "7c1b2d3e4f5a",
    "c4d5e6f7a8b9",
    "9a4e7c1d2b6f",
    "a7c9d2e4f601",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
