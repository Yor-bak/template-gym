"""access: add already_entered result

Revision ID: d2e3f4a5b6c7
Revises: c1a2b3d4e5f6
Create Date: 2026-08-13

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, None] = 'c1a2b3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("access_logs_result_valid", "access_logs", type_="check")
    op.create_check_constraint(
        "access_logs_result_valid",
        "access_logs",
        "result IN ('authorized','expiring_soon','expired','blocked','temporary_access','invalid_token','already_entered')",
    )


def downgrade() -> None:
    op.drop_constraint("access_logs_result_valid", "access_logs", type_="check")
    op.create_check_constraint(
        "access_logs_result_valid",
        "access_logs",
        "result IN ('authorized','expiring_soon','expired','blocked','temporary_access','invalid_token')",
    )
