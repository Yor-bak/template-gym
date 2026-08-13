import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.access.models import AccessLog


async def create_log(db: AsyncSession, *, log: AccessLog) -> AccessLog:
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def get_last_granted_log(db: AsyncSession, *, member_id: uuid.UUID) -> AccessLog | None:
    """Último access_log de este member cuyo resultado sí dejó entrar
    (excluye blocked/expired/invalid/already_entered) — usado para decidir
    si un nuevo escaneo cae dentro de la ventana de "ya ingresó"."""
    result = await db.execute(
        select(AccessLog)
        .where(
            AccessLog.member_id == member_id,
            AccessLog.result.in_(("authorized", "expiring_soon", "temporary_access")),
        )
        .order_by(AccessLog.scanned_at.desc())
        .limit(1)
    )
    return result.scalars().first()


async def list_for_gym(db: AsyncSession, gym_id: uuid.UUID, limit: int = 50) -> list[AccessLog]:
    result = await db.execute(
        select(AccessLog).where(AccessLog.gym_id == gym_id).order_by(AccessLog.scanned_at.desc()).limit(limit)
    )
    return list(result.scalars().all())
