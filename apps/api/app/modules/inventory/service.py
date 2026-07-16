import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.inventory import repository as inventory_repo
from app.modules.inventory.models import InventoryItem
from app.modules.inventory.schemas import InventoryItemCreate


async def create_item(
    db: AsyncSession, payload: InventoryItemCreate, *, gym_id: uuid.UUID, created_by: uuid.UUID
) -> InventoryItem:
    item = InventoryItem(**payload.model_dump(), gym_id=gym_id, created_by=created_by)
    item = await inventory_repo.create(db, item=item)
    await db.commit()
    return item
