import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.inventory_sales import repository as sales_repo
from app.modules.inventory_sales.models import InventorySale, InventorySaleItem
from app.modules.inventory_sales.schemas import InventorySaleCreate
from app.modules.members import repository as members_repo


async def create_sale(
    db: AsyncSession, payload: InventorySaleCreate, *, gym_id: uuid.UUID, registered_by: uuid.UUID
) -> InventorySale:
    if payload.member_id is not None:
        member = await members_repo.get_by_id(db, payload.member_id)
        if member is None or member.gym_id != gym_id:
            raise NotFoundError("El miembro indicado no existe en este gimnasio")

    # 1) Lock de fila de TODAS las líneas del carrito antes de validar nada —
    # ninguna otra transacción puede modificar estas cantidades hasta que
    # esta termine (commit o rollback). Evita la carrera de "dos ventas
    # concurrentes del último artículo en stock" que el prototipo Next.js
    # no podía cerrar (era una serie de updates independientes, sin lock).
    item_ids = [line.item_id for line in payload.items]
    locked_items = await sales_repo.lock_items_for_gym(db, item_ids=item_ids, gym_id=gym_id)

    # 2) Validar TODAS las líneas contra el stock ya bloqueado, antes de
    # tocar cualquier cantidad — todo o nada, mismo criterio que
    # completeInventorySale del prototipo, ahora con integridad real de
    # transacción de base de datos (no solo orden de ejecución en memoria).
    sale_items: list[InventorySaleItem] = []
    subtotal = 0.0
    for line in payload.items:
        item = locked_items.get(line.item_id)
        if item is None:
            raise NotFoundError(f"Uno de los productos del carrito no existe en este gimnasio ({line.item_id}).")
        if item.status != "operating":
            raise ConflictError(f"'{item.name}' no está disponible para venta.")
        if item.sale_price is None:
            raise ConflictError(f"'{item.name}' no tiene un precio de venta configurado.")
        if line.quantity > item.quantity:
            raise ConflictError(f"No hay existencias suficientes de '{item.name}' para completar la venta.")

        unit_price = float(item.sale_price)
        line_subtotal = round(unit_price * line.quantity, 2)
        subtotal += line_subtotal
        sale_items.append(
            InventorySaleItem(item_id=item.id, quantity=line.quantity, unit_price=unit_price, subtotal=line_subtotal)
        )

    # 3) Solo ahora, con todo validado, se descuenta stock y se crea la
    # venta — en la misma transacción, así que si algo de aquí en adelante
    # fallara, ni el descuento ni la venta se confirmarían (rollback).
    for line in payload.items:
        locked_items[line.item_id].quantity -= line.quantity

    sale = InventorySale(
        gym_id=gym_id,
        member_id=payload.member_id,
        subtotal=round(subtotal, 2),
        total=round(subtotal, 2),
        method=payload.method,
        status="confirmed",
        notes=payload.notes,
        registered_by=registered_by,
        items=sale_items,
    )
    sale = await sales_repo.create_sale(db, sale=sale)
    await db.commit()
    return sale
