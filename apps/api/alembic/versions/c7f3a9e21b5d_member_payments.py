"""member_payments

Registro de pagos de membresía (docs/BACKEND_PREPARATION_AUDIT_GYM.md §3.5,
ALTA-08): antes ningún registro real de pago existía, así que la vigencia
del miembro nunca se derivaba de nada — todo miembro sin escaneo previo
quedaba "Vencido" indefinidamente.

Revision ID: c7f3a9e21b5d
Revises: 8b2e6f1a4c9d
Create Date: 2026-07-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c7f3a9e21b5d'
down_revision: Union[str, None] = '8b2e6f1a4c9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'member_payments',
        sa.Column('gym_id', sa.UUID(), nullable=False),
        sa.Column('member_id', sa.UUID(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('paid_at', sa.Date(), nullable=False),
        sa.Column('covers_until', sa.Date(), nullable=False),
        sa.Column('payment_method', sa.String(), nullable=True),
        sa.Column('recorded_by', sa.UUID(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['gym_id'], ['gyms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_member_payments_member_id', 'member_payments', ['member_id'])


def downgrade() -> None:
    op.drop_index('ix_member_payments_member_id', table_name='member_payments')
    op.drop_table('member_payments')
