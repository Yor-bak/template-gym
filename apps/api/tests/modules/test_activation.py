import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import make_gym, make_member


@pytest.mark.asyncio
async def test_lookup_valid_code(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session, name="American Fitness")
    await make_member(db_session, gym_id=gym.id, first_name="Daniela", activation_code="DEMO1234")
    await db_session.commit()

    resp = await client.get("/activation/lookup", params={"code": "DEMO1234"})

    assert resp.status_code == 200
    assert resp.json() == {"first_name": "Daniela", "gym_name": "American Fitness"}


@pytest.mark.asyncio
async def test_lookup_invalid_code(client: AsyncClient, db_session: AsyncSession):
    resp = await client.get("/activation/lookup", params={"code": "NOPE0000"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_activate_account_success(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    await make_member(db_session, gym_id=gym.id, activation_code="ABCD1234")
    await db_session.commit()

    resp = await client.post(
        "/activation/activate",
        json={"code": "ABCD1234", "email": "cliente@test.com", "password": "password123"},
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["role"] == "client"
    assert body["access_token"]


@pytest.mark.asyncio
async def test_activate_account_code_already_used(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    await make_member(db_session, gym_id=gym.id, activation_code="USED0001")
    await db_session.commit()

    first = await client.post(
        "/activation/activate",
        json={"code": "USED0001", "email": "primero@test.com", "password": "password123"},
    )
    assert first.status_code == 201

    second = await client.post(
        "/activation/activate",
        json={"code": "USED0001", "email": "segundo@test.com", "password": "password123"},
    )
    assert second.status_code == 404


@pytest.mark.asyncio
async def test_activate_account_duplicate_email(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    await make_member(db_session, gym_id=gym.id, activation_code="DUPE0001", email=None)
    await make_member(db_session, gym_id=gym.id, activation_code="DUPE0002", email=None, member_number="TG-99999")
    await db_session.commit()

    first = await client.post(
        "/activation/activate",
        json={"code": "DUPE0001", "email": "repetido@test.com", "password": "password123"},
    )
    assert first.status_code == 201

    second = await client.post(
        "/activation/activate",
        json={"code": "DUPE0002", "email": "repetido@test.com", "password": "password123"},
    )
    assert second.status_code == 409
