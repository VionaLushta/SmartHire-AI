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
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("departments")}
    if "company_id" not in columns:
        op.add_column("departments", sa.Column("company_id", sa.Integer(), nullable=False))

    foreign_keys = {key.get("name") for key in inspector.get_foreign_keys("departments")}
    if "fk_departments_company_id_companies" not in foreign_keys:
        op.create_foreign_key(
            "fk_departments_company_id_companies", "departments", "companies",
            ["company_id"], ["company_id"],
        )

    unique_constraints = {key.get("name") for key in inspector.get_unique_constraints("departments")}
    if "departments_name_key" in unique_constraints:
        op.drop_constraint("departments_name_key", "departments", type_="unique")
    if "uq_departments_company_name" not in unique_constraints:
        op.create_unique_constraint("uq_departments_company_name", "departments", ["company_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_departments_company_name", "departments", type_="unique")
    op.create_unique_constraint("departments_name_key", "departments", ["name"])
    op.drop_constraint("fk_departments_company_id_companies", "departments", type_="foreignkey")
    op.drop_column("departments", "company_id")

