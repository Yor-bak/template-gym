import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import Base, TimestampMixin, UUIDPkMixin


def _now() -> datetime:
    return datetime.now(timezone.utc)


# Los 6 grupos musculares fijos para las rutinas genéricas (ver
# routines/service.py:ensure_generic_routines) — mismo catálogo usado en
# apps/mobile/src/lib/mock-db.ts antes de conectar el backend real.
GENERIC_MUSCLE_GROUPS: list[tuple[str, str]] = [
    ("legs", "Rutina de pierna"),
    ("back", "Rutina de espalda"),
    ("chest", "Rutina de pecho"),
    ("shoulders", "Rutina de hombros"),
    ("arms", "Rutina de brazos"),
    ("core", "Rutina de abdomen"),
]


class Routine(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "routines"

    # Aislamiento estricto por gimnasio (Decisión Bloque 3 de
    # DECISION_LOG_GYM.md) — incluye a las rutinas genéricas: cada gimnasio
    # tiene su propia copia, nunca se comparten entre gimnasios.
    gym_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False
    )
    # Ambos nulos = rutina genérica por grupo muscular (muscle_group set).
    trainer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    goal: Mapped[str | None] = mapped_column(String)
    muscle_group: Mapped[str | None] = mapped_column(String)


class RoutineExercise(Base, UUIDPkMixin):
    __tablename__ = "routine_exercises"

    routine_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("routines.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    sets: Mapped[int] = mapped_column(Integer, nullable=False)
    reps: Mapped[str] = mapped_column(String, nullable=False)
    rest_seconds: Mapped[int | None] = mapped_column(Integer)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(String)
    # Referencia al catálogo de ejercicios estático de apps/mobile (no es FK
    # real: el catálogo vive en el cliente, no en esta base de datos — ver
    # apps/mobile/src/lib/exercise-catalog.ts).
    catalog_id: Mapped[str | None] = mapped_column(String)


class WorkoutLog(Base, UUIDPkMixin):
    __tablename__ = "workout_logs"

    gym_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    routine_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("routines.id", ondelete="SET NULL")
    )
    # Denormalizado a propósito: si la rutina se borra/edita después, el
    # historial sigue mostrando qué se hizo ese día tal como era entonces.
    routine_title: Mapped[str] = mapped_column(String, nullable=False)
    completed_date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
