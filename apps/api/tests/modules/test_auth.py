import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import Role
from tests.conftest import make_gym, make_user


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    user, password = await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="admin@test.com")
    await db_session.commit()

    resp = await client.post("/auth/login", json={"email": "admin@test.com", "password": password})

    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["user"]["role"] == "gym_admin"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="admin2@test.com")
    await db_session.commit()

    resp = await client.post("/auth/login", json={"email": "admin2@test.com", "password": "wrong"})

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    user, password = await make_user(
        db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="inactive@test.com", active=False
    )
    await db_session.commit()

    resp = await client.post("/auth/login", json={"email": "inactive@test.com", "password": password})

    assert resp.status_code == 401
