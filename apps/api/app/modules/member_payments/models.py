import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import Base, TimestampMixin, UUIDPkMixin


class MemberPayment(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "member_payments"

    gym_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    paid_at: Mapped[date] = mapped_column(Date, nullable=False)
    # Fecha hasta la que el pago deja vigente al miembro — ver
    # member_payments/service.py:register_payment para cómo se calcula
    # (plan del miembro, o un período fijo si no tiene plan asignado).
    covers_until: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
