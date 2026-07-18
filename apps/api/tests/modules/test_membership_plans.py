import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import Role
from tests.conftest import make_gym, make_user, phone_from_email


async def _login(client: AsyncClient, email: str, password: str) -> str:
    # email aquí es el identificador legado usado por los call-sites de este
    # archivo (literal o de un User.email) — se deriva el phone determinístico
    # correspondiente porque el login real ahora es por phone, no por email.
    resp = await client.post(
        "/auth/login", json={"phone": phone_from_email(email), "password": password}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


async def _admin_headers(client: AsyncClient, db_session: AsyncSession) -> dict[str, str]:
    gym = await make_gym(db_session)
    admin, password = await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="admin@test.com")
    await db_session.commit()
    token = await _login(client, "admin@test.com", password)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_plan_rejects_non_positive_price(client: AsyncClient, db_session: AsyncSession):
    headers = await _admin_headers(client, db_session)
    resp = await client.post(
        "/membership-plans",
        json={"name": "Mensual", "price": -500, "duration": 1, "duration_unit": "months"},
        headers=headers,
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_create_plan_rejects_zero_duration(client: AsyncClient, db_session: AsyncSession):
    headers = await _admin_headers(client, db_session)
    resp = await client.post(
        "/membership-plans",
        json={"name": "Mensual", "price": 500, "duration": 0, "duration_unit": "months"},
        headers=headers,
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_create_plan_rejects_invalid_duration_unit(client: AsyncClient, db_session: AsyncSession):
    headers = await _admin_headers(client, db_session)
    resp = await client.post(
        "/membership-plans",
        json={"name": "Mensual", "price": 500, "duration": 1, "duration_unit": "fortnights"},
        headers=headers,
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_create_plan_accepts_valid_payload(client: AsyncClient, db_session: AsyncSession):
    headers = await _admin_headers(client, db_session)
    resp = await client.post(
        "/membership-plans",
        json={"name": "Mensual", "price": 500, "duration": 1, "duration_unit": "months"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["price"] == 500
    assert body["duration"] == 1
    assert body["tolerance_days"] == 0
