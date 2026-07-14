"""phase1_auth_members

Revision ID: 0001
Revises:
Create Date: 2026-07-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "gyms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False, unique=True),
        sa.Column("address", sa.String()),
        sa.Column("phone", sa.String()),
        sa.Column("email", sa.String()),
        sa.Column("timezone", sa.String(), nullable=False, server_default="America/Mexico_City"),
        sa.Column("currency", sa.String(), nullable=False, server_default="MXN"),
        sa.Column("member_prefix", sa.String(), nullable=False),
        sa.Column("logo_url", sa.String()),
        sa.Column("primary_color", sa.String()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("subscription_status", sa.String(), nullable=False, server_default="trial"),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("gym_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gyms.id", ondelete="SET NULL")),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("phone", sa.String()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.CheckConstraint("role = 'platform_admin' OR gym_id IS NOT NULL", name="users_gym_required"),
    )
    op.create_index("ix_users_gym_id", "users", ["gym_id"])

    op.create_table(
        "membership_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("gym_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("duration", sa.Integer(), nullable=False),
        sa.Column("duration_unit", sa.String(), nullable=False),
        sa.Column("tolerance_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("description", sa.String()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("allows_multi_branch_access", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_membership_plans_gym_id", "membership_plans", ["gym_id"])

    op.create_table(
        "members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("gym_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), unique=True),
        sa.Column("member_number", sa.String(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("email", sa.String()),
        sa.Column("birth_date", sa.Date()),
        sa.Column("photo_url", sa.String()),
        sa.Column("membership_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("membership_plans.id", ondelete="SET NULL")),
        sa.Column("status", sa.String(), nullable=False, server_default="pending_activation"),
        sa.Column("start_date", sa.Date()),
        sa.Column("expiration_date", sa.Date()),
        sa.Column("last_payment_date", sa.Date()),
        sa.Column("blocked_at", sa.DateTime(timezone=True)),
        sa.Column("blocked_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("block_reason", sa.String()),
        sa.Column("temporary_access_until", sa.DateTime(timezone=True)),
        sa.Column("temporary_access_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("temporary_access_reason", sa.String()),
        sa.Column("mobile_app_status", sa.String(), nullable=False, server_default="not_activated"),
        sa.Column("activation_code", sa.String(), unique=True),
        sa.Column("emergency_contact", sa.String()),
        sa.Column("emergency_phone", sa.String()),
        sa.Column("notes", sa.String()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.UniqueConstraint("gym_id", "member_number", name="members_gym_id_member_number_key"),
    )
    op.create_index("ix_members_gym_id", "members", ["gym_id"])


def downgrade() -> None:
    op.drop_table("members")
    op.drop_table("membership_plans")
    op.drop_table("users")
    op.drop_table("gyms")
