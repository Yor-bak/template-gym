import secrets
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import Base, TimestampMixin, UUIDPkMixin

_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin 0/O/1/I para evitar ambigüedad


def generate_activation_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))


class Member(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "members"
    __table_args__ = (UniqueConstraint("gym_id", "member_number", name="members_gym_id_member_number_key"),)

    gym_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False
    )
    # Nullable: el member existe desde que el staff lo da de alta, antes de que
    # el cliente active la app. Se linkea en activation/service.py.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), unique=True
    )
    member_number: Mapped[str] = mapped_column(String, nullable=False)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String)
    birth_date: Mapped[date | None] = mapped_column(Date)
    photo_url: Mapped[str | None] = mapped_column(String)

    membership_plan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("membership_plans.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending_activation")
    start_date: Mapped[date | None] = mapped_column(Date)
    expiration_date: Mapped[date | None] = mapped_column(Date)
    last_payment_date: Mapped[date | None] = mapped_column(Date)

    blocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    blocked_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    block_reason: Mapped[str | None] = mapped_column(String)

    temporary_access_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    temporary_access_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    temporary_access_reason: Mapped[str | None] = mapped_column(String)

    mobile_app_status: Mapped[str] = mapped_column(String, nullable=False, default="not_activated")
    # Único mientras esté vigente; se limpia (None) al activarse la cuenta.
    activation_code: Mapped[str | None] = mapped_column(String, unique=True, default=generate_activation_code)

    emergency_contact: Mapped[str | None] = mapped_column(String)
    emergency_phone: Mapped[str | None] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(String)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
