import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.inventory.models import InventoryItem


async def get_by_id(db: AsyncSession, item_id: uuid.UUID) -> InventoryItem | None:
    return await db.get(InventoryItem, item_id)


async def list_for_gym(db: AsyncSession, gym_id: uuid.UUID) -> list[InventoryItem]:
    result = await db.execute(select(InventoryItem).where(InventoryItem.gym_id == gym_id))
    return list(result.scalars().all())


async def create(db: AsyncSession, *, item: InventoryItem) -> InventoryItem:
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item
