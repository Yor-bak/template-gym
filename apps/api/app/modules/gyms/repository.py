import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.gyms.models import Gym


async def get_by_id(db: AsyncSession, gym_id: uuid.UUID) -> Gym | None:
    return await db.get(Gym, gym_id)


async def list_all(db: AsyncSession) -> list[Gym]:
    result = await db.execute(select(Gym).order_by(Gym.name))
    return list(result.scalars().all())


async def create(db: AsyncSession, *, gym: Gym) -> Gym:
    db.add(gym)
    await db.flush()
    await db.refresh(gym)
    return gym
