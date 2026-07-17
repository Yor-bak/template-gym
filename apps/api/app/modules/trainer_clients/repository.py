import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.trainer_clients.models import TrainerClient


async def get_by_client_id(db: AsyncSession, client_id: uuid.UUID) -> TrainerClient | None:
    result = await db.execute(select(TrainerClient).where(TrainerClient.client_id == client_id))
    return result.scalar_one_or_none()


async def list_for_trainer(db: AsyncSession, trainer_id: uuid.UUID) -> list[TrainerClient]:
    result = await db.execute(select(TrainerClient).where(TrainerClient.trainer_id == trainer_id))
    return list(result.scalars().all())
