import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.inventory.models import InventoryItem
from app.modules.inventory_sales.models import InventorySale


async def lock_items_for_gym(
    db: AsyncSession, *, item_ids: list[uuid.UUID], gym_id: uuid.UUID
) -> dict[uuid.UUID, InventoryItem]:
    """SELECT ... FOR UPDATE de todas las líneas del carrito en una sola
    query, acotado al gimnasio del caller. El lock de fila es lo que cierra
    la carrera real (dos ventas concurrentes del último artículo en stock):
    la segunda transacción espera a que la primera haga commit/rollback antes
    de poder leer la cantidad actualizada, en vez de que ambas lean el mismo
    stock "viejo" y ambas crean que hay suficiente."""
    if not item_ids:
        return {}
    result = await db.execute(
        select(InventoryItem)
        .where(InventoryItem.id.in_(item_ids), InventoryItem.gym_id == gym_id)
        .with_for_update()
    )
    items = result.scalars().all()
    return {item.id: item for item in items}


async def create_sale(db: AsyncSession, *, sale: InventorySale) -> InventorySale:
    db.add(sale)
    await db.flush()
    await db.refresh(sale, attribute_names=["items"])
    return sale


async def get_by_id_for_gym(db: AsyncSession, sale_id: uuid.UUID, *, gym_id: uuid.UUID) -> InventorySale | None:
    result = await db.execute(
        select(InventorySale).where(InventorySale.id == sale_id, InventorySale.gym_id == gym_id)
    )
    return result.scalar_one_or_none()


async def list_for_gym(db: AsyncSession, gym_id: uuid.UUID) -> list[InventorySale]:
    result = await db.execute(
        select(InventorySale).where(InventorySale.gym_id == gym_id).order_by(InventorySale.sold_at.desc())
    )
    return list(result.scalars().all())
