import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import Base, UUIDPkMixin


def _now() -> datetime:
    return datetime.now(timezone.utc)


VALID_RESULTS = ("authorized", "expiring_soon", "expired", "blocked", "temporary_access", "invalid_token")


class AccessLog(Base, UUIDPkMixin):
    __tablename__ = "access_logs"
    __table_args__ = (
        CheckConstraint(
            "result IN ('authorized','expiring_soon','expired','blocked','temporary_access','invalid_token')",
            name="access_logs_result_valid",
        ),
    )

    gym_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE")
    )
    result: Mapped[str] = mapped_column(String, nullable=False)
    reader: Mapped[str] = mapped_column(String, nullable=False, default="Entrada principal")
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
