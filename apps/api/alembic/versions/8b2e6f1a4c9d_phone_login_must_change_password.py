"""phone_login_must_change_password

Login pasa de email a phone (decisión 2026-07-17): phone se vuelve el
identificador único obligatorio, email queda opcional. Agrega
must_change_password para el enforcement real de contraseñas de
aprovisionamiento (ver app/auth/dependencies.py).

Asume una tabla users vacía o sin filas legítimas todavía (pre-lanzamiento
de gym) — si se aplica sobre una base con usuarios reales sin phone, el
ALTER COLUMN ... SET NOT NULL falla y hay que backfillear phone antes.

Revision ID: 8b2e6f1a4c9d
Revises: 4a66e532d066
Create Date: 2026-07-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8b2e6f1a4c9d'
down_revision: Union[str, None] = '4a66e532d066'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column('users', 'phone', existing_type=sa.String(), nullable=False)
    op.create_unique_constraint('users_phone_key', 'users', ['phone'])
    op.alter_column('users', 'email', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'email', existing_type=sa.String(), nullable=False)
    op.drop_constraint('users_phone_key', 'users', type_='unique')
    op.alter_column('users', 'phone', existing_type=sa.String(), nullable=True)
    op.drop_column('users', 'must_change_password')
