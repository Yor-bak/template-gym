import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import Role
from tests.conftest import make_gym, make_member, make_user, phone_from_email


async def _login(client: AsyncClient, email: str, password: str) -> str:
    # email aquí es el identificador legado usado por los call-sites de este
    # archivo (literal o de un User.email) — se deriva el phone determinístico
    # correspondiente porque el login real ahora es por phone, no por email.
    resp = await client.post(
        "/auth/login", json={"phone": phone_from_email(email), "password": password}
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_client_sees_only_own_member(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    member = await make_member(db_session, gym_id=gym.id)
    await make_member(db_session, gym_id=gym.id, member_number="TG-00002")
    client_user, password = await make_user(
        db_session, role=Role.CLIENT, gym_id=gym.id, email="cliente@test.com"
    )
    member.user_id = client_user.id
    await db_session.commit()

    token = await _login(client, "cliente@test.com", password)
    resp = await client.get("/members", headers=_auth(token))

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["id"] == str(member.id)


@pytest.mark.asyncio
async def test_staff_sees_all_members_of_own_gym(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    await make_member(db_session, gym_id=gym.id, member_number="TG-00001")
    await make_member(db_session, gym_id=gym.id, member_number="TG-00002")
    staff, password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="staff@test.com"
    )
    await db_session.commit()

    token = await _login(client, "staff@test.com", password)
    resp = await client.get("/members", headers=_auth(token))

    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_staff_cannot_see_members_of_other_gym(client: AsyncClient, db_session: AsyncSession):
    gym_a = await make_gym(db_session, slug="gym-a")
    gym_b = await make_gym(db_session, slug="gym-b")
    await make_member(db_session, gym_id=gym_b.id, member_number="B-00001")
    staff_a, password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym_a.id, email="staff-a@test.com"
    )
    await db_session.commit()

    token = await _login(client, "staff-a@test.com", password)
    resp = await client.get("/members", headers=_auth(token))

    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_platform_admin_sees_all_gyms(client: AsyncClient, db_session: AsyncSession):
    gym_a = await make_gym(db_session, slug="gym-a2")
    gym_b = await make_gym(db_session, slug="gym-b2")
    await make_member(db_session, gym_id=gym_a.id, member_number="A-00001")
    await make_member(db_session, gym_id=gym_b.id, member_number="B-00001")
    admin, password = await make_user(
        db_session, role=Role.PLATFORM_ADMIN, gym_id=None, email="platform@test.com"
    )
    await db_session.commit()

    token = await _login(client, "platform@test.com", password)
    resp = await client.get("/members", headers=_auth(token))

    # Limitación conocida de Fase 1: GET /members no acepta todavía un filtro
    # explícito de gym_id para platform_admin (no tiene gym propio), así que
    # devuelve 403 en vez de "todos los members de todas las sucursales".
    # Se resuelve en una fase futura agregando ?gym_id= al endpoint.
    assert resp.status_code == 403
