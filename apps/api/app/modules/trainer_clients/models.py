import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import Base, UUIDPkMixin


def _now() -> datetime:
    return datetime.now(timezone.utc)


class TrainerClient(Base, UUIDPkMixin):
    __tablename__ = "trainer_clients"
    # Un cliente, un entrenador a la vez — igual que el prototipo
    # (unique(client_id) en supabase/schema.sql). Volver a escanear a un
    # cliente ya vinculado con OTRO entrenador reasigna (upsert), no falla.
    __table_args__ = (UniqueConstraint("client_id", name="trainer_clients_client_id_key"),)

    trainer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
