import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.inventory.models import InventoryItem
from app.modules.inventory_sales.models import InventorySale
from app.modules.users.models import Role
from tests.conftest import make_gym, make_user


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


async def _make_item(db: AsyncSession, *, gym_id, quantity: int, sale_price: float, status: str = "operating") -> InventoryItem:
    item = InventoryItem(
        gym_id=gym_id, area="tienda", name="Proteína 1kg", quantity=quantity, sale_price=sale_price, status=status
    )
    db.add(item)
    await db.flush()
    return item


@pytest.mark.asyncio
async def test_inventory_item_rejects_negative_price_and_quantity(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    admin, admin_password = await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="admin@test.com")
    await db_session.commit()
    token = await _login(client, "admin@test.com", admin_password)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/inventory/items",
        json={"area": "tienda", "name": "Producto malo", "quantity": -3, "sale_price": -50},
        headers=headers,
    )
    # Rechazado por Pydantic (Field(ge=0)/Field(gt=0)) antes de tocar el service.
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_sale_decrements_stock_and_persists_real_history(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    admin, admin_password = await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="admin@test.com")
    item = await _make_item(db_session, gym_id=gym.id, quantity=10, sale_price=99.5)
    await db_session.commit()
    token = await _login(client, "admin@test.com", admin_password)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/inventory/sales",
        json={"items": [{"item_id": str(item.id), "quantity": 3}], "method": "cash"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["total"] == 298.5
    assert body["items"][0]["quantity"] == 3
    assert body["status"] == "confirmed"

    # Persistencia real: recargar el item y la venta directamente de la BD
    # (no solo confiar en la respuesta HTTP) — esto es justo lo que el
    # prototipo Next.js NO tenía (la venta se perdía al recargar la página).
    await db_session.refresh(item)
    assert item.quantity == 7

    result = await db_session.execute(select(InventorySale).where(InventorySale.gym_id == gym.id))
    sales = result.scalars().all()
    assert len(sales) == 1
    assert sales[0].total == 298.5


@pytest.mark.asyncio
async def test_sale_is_all_or_nothing_stock_unchanged_on_partial_failure(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    admin, admin_password = await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="admin@test.com")
    item_ok = await _make_item(db_session, gym_id=gym.id, quantity=10, sale_price=50)
    item_short = await _make_item(db_session, gym_id=gym.id, quantity=2, sale_price=50)
    await db_session.commit()
    token = await _login(client, "admin@test.com", admin_password)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/inventory/sales",
        json={
            "items": [
                {"item_id": str(item_ok.id), "quantity": 5},  # disponible
                {"item_id": str(item_short.id), "quantity": 5},  # NO disponible (solo hay 2)
            ],
            "method": "cash",
        },
        headers=headers,
    )
    assert resp.status_code == 409, resp.text

    # Todo o nada: item_ok NO debe haberse descontado aunque su línea sí
    # era válida — la transacción completa se revierte.
    await db_session.refresh(item_ok)
    await db_session.refresh(item_short)
    assert item_ok.quantity == 10
    assert item_short.quantity == 2

    result = await db_session.execute(select(InventorySale).where(InventorySale.gym_id == gym.id))
    assert result.scalars().all() == []


@pytest.mark.asyncio
async def test_sale_rejects_item_out_of_service(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    admin, admin_password = await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="admin@test.com")
    item = await _make_item(db_session, gym_id=gym.id, quantity=10, sale_price=50, status="maintenance")
    await db_session.commit()
    token = await _login(client, "admin@test.com", admin_password)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/inventory/sales",
        json={"items": [{"item_id": str(item.id), "quantity": 1}], "method": "cash"},
        headers=headers,
    )
    assert resp.status_code == 409, resp.text


@pytest.mark.asyncio
async def test_sale_cannot_reach_item_from_another_gym(client: AsyncClient, db_session: AsyncSession):
    gym_a = await make_gym(db_session, name="A", slug="sale-a")
    gym_b = await make_gym(db_session, name="B", slug="sale-b")
    admin_a, admin_a_password = await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym_a.id, email="admin-a@test.com")
    item_b = await _make_item(db_session, gym_id=gym_b.id, quantity=10, sale_price=50)
    await db_session.commit()
    token = await _login(client, "admin-a@test.com", admin_a_password)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/inventory/sales",
        json={"items": [{"item_id": str(item_b.id), "quantity": 1}], "method": "cash"},
        headers=headers,
    )
    # El item de B no es visible/alcanzable desde el gimnasio A: se trata
    # como "no existe" (404), no se filtra información de otro tenant.
    assert resp.status_code == 404, resp.text

    await db_session.refresh(item_b)
    assert item_b.quantity == 10


@pytest.mark.asyncio
async def test_inventory_sale_schema_has_no_gym_id_field():
    """Confirma estructuralmente (no solo por comportamiento) que el body de
    creación de venta no puede llevar gym_id — no es un campo que se valide
    y descarte, es un campo que el schema ni siquiera acepta."""
    from app.modules.inventory_sales.schemas import InventorySaleCreate

    assert "gym_id" not in InventorySaleCreate.model_fields
