import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.access.models import AccessLog


async def create_log(db: AsyncSession, *, log: AccessLog) -> AccessLog:
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def list_for_gym(db: AsyncSession, gym_id: uuid.UUID, limit: int = 50) -> list[AccessLog]:
    result = await db.execute(
        select(AccessLog).where(AccessLog.gym_id == gym_id).order_by(AccessLog.scanned_at.desc()).limit(limit)
    )
    return list(result.scalars().all())
