"""routines

Módulo de rutinas — no existía en el backend hasta ahora (ver
docs/PENDIENTES.md #3): apps/mobile seguía usando mock-db.ts para rutinas
personalizadas, rutinas genéricas por grupo muscular, y el historial de
sesiones completadas (calendario). Esta migración crea las 3 tablas
correspondientes.

Revision ID: c1a2b3d4e5f6
Revises: 8b2e6f1a4c9d
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, None] = '8b2e6f1a4c9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'routines',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('gym_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gyms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('trainer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('members.id', ondelete='CASCADE'), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('goal', sa.String(), nullable=True),
        sa.Column('muscle_group', sa.String(), nullable=True),
    )
    op.create_index('ix_routines_gym_id', 'routines', ['gym_id'])
    op.create_index('ix_routines_client_id', 'routines', ['client_id'])

    op.create_table(
        'routine_exercises',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('routine_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('routines.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('sets', sa.Integer(), nullable=False),
        sa.Column('reps', sa.String(), nullable=False),
        sa.Column('rest_seconds', sa.Integer(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('catalog_id', sa.String(), nullable=True),
    )
    op.create_index('ix_routine_exercises_routine_id', 'routine_exercises', ['routine_id'])

    op.create_table(
        'workout_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('gym_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gyms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('routine_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('routines.id', ondelete='SET NULL'), nullable=True),
        sa.Column('routine_title', sa.String(), nullable=False),
        sa.Column('completed_date', sa.Date(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_workout_logs_member_id', 'workout_logs', ['member_id'])


def downgrade() -> None:
    op.drop_table('workout_logs')
    op.drop_table('routine_exercises')
    op.drop_table('routines')
