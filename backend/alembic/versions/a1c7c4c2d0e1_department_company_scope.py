"""department company scope

Revision ID: a1c7c4c2d0e1
Revises: 650a107bcf13
Create Date: 2026-08-11 12:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1c7c4c2d0e1"
down_revision = "650a107bcf13"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("departments", sa.Column("company_id", sa.Integer(), nullable=False))
    op.create_foreign_key(
        "fk_departments_company_id_companies",
        "departments",
        "companies",
        ["company_id"],
        ["company_id"],
    )
    op.drop_constraint("departments_name_key", "departments", type_="unique")
    op.create_unique_constraint("uq_departments_company_name", "departments", ["company_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_departments_company_name", "departments", type_="unique")
    op.create_unique_constraint("departments_name_key", "departments", ["name"])
    op.drop_constraint("fk_departments_company_id_companies", "departments", type_="foreignkey")
    op.drop_column("departments", "company_id")

