import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import Role
from tests.conftest import make_gym, make_user


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    user, password = await make_user(
        db_session, role=Role.GYM_ADMIN, gym_id=gym.id, phone="5512345678"
    )
    await db_session.commit()

    resp = await client.post("/auth/login", json={"phone": "5512345678", "password": password})

    assert resp.status_code == 200
    body = resp.json()
    assert body["accessToken"]
    assert body["user"]["role"] == "gym_admin"
    assert body["user"]["phone"] == "5512345678"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, phone="5512345679")
    await db_session.commit()

    resp = await client.post("/auth/login", json={"phone": "5512345679", "password": "wrong"})

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    user, password = await make_user(
        db_session, role=Role.GYM_ADMIN, gym_id=gym.id, phone="5512345680", active=False
    )
    await db_session.commit()

    resp = await client.post("/auth/login", json={"phone": "5512345680", "password": password})

    assert resp.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "raw_phone",
    [
        "5512345681",
        "+52 55 1234 5681",
        "521-55-1234-5681",
        "  55 1234 5681  ",
    ],
)
async def test_login_accepts_phone_with_or_without_country_prefix(
    client: AsyncClient, db_session: AsyncSession, raw_phone: str
):
    # Paso 6 de la verificación pedida: el login normaliza (últimos 10
    # dígitos) igual que el guardado — a diferencia de admin-panel-j2ec,
    # donde el login NO normaliza y un teléfono con prefijo falla ahí.
    gym = await make_gym(db_session)
    user, password = await make_user(
        db_session, role=Role.GYM_ADMIN, gym_id=gym.id, phone="5512345681"
    )
    await db_session.commit()

    resp = await client.post("/auth/login", json={"phone": raw_phone, "password": password})

    assert resp.status_code == 200, resp.text
    assert resp.json()["user"]["phone"] == "5512345681"


@pytest.mark.asyncio
async def test_must_change_password_blocks_protected_endpoints(
    client: AsyncClient, db_session: AsyncSession
):
    # Pasos 1-4 de la verificación pedida, a nivel HTTP real (Postgres real,
    # bcrypt real, JWT real) contra gym_test.
    gym = await make_gym(db_session)
    user, password = await make_user(
        db_session,
        role=Role.GYM_ADMIN,
        gym_id=gym.id,
        phone="5512345682",
        password="123456",
        must_change_password=True,
    )
    await db_session.commit()

    # 2) Login con el fallback funciona (login nunca está gateado).
    login_resp = await client.post(
        "/auth/login", json={"phone": "5512345682", "password": "123456"}
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["user"]["mustChangePassword"] is True
    token = login_resp.json()["accessToken"]
    auth = {"Authorization": f"Bearer {token}"}

    # Un endpoint protegido normal (GET /members) debe rechazar mientras
    # must_change_password sea true — solo /auth/change-password debe
    # funcionar con este token.
    members_resp = await client.get("/members", headers=auth)
    assert members_resp.status_code == 403
    assert "cambiar tu contraseña" in members_resp.json()["detail"]

    me_resp = await client.get("/users/me", headers=auth)
    assert me_resp.status_code == 403

    # 3) Cambia la contraseña vía el endpoint dedicado.
    change_resp = await client.post(
        "/auth/change-password",
        json={"current_password": "123456", "new_password": "NuevaSegura123"},
        headers=auth,
    )
    assert change_resp.status_code == 200, change_resp.text
    assert change_resp.json()["mustChangePassword"] is False

    # Mismo token, ahora sí pasa (no hace falta re-loguear).
    members_resp_2 = await client.get("/members", headers=auth)
    assert members_resp_2.status_code == 200

    # 4) La contraseña vieja ya no sirve.
    old_login = await client.post(
        "/auth/login", json={"phone": "5512345682", "password": "123456"}
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/auth/login", json={"phone": "5512345682", "password": "NuevaSegura123"}
    )
    assert new_login.status_code == 200
    assert new_login.json()["user"]["mustChangePassword"] is False


@pytest.mark.asyncio
async def test_change_password_requires_correct_current_password(
    client: AsyncClient, db_session: AsyncSession
):
    gym = await make_gym(db_session)
    user, password = await make_user(
        db_session,
        role=Role.GYM_ADMIN,
        gym_id=gym.id,
        phone="5512345683",
        password="123456",
        must_change_password=True,
    )
    await db_session.commit()

    login_resp = await client.post(
        "/auth/login", json={"phone": "5512345683", "password": "123456"}
    )
    token = login_resp.json()["accessToken"]

    resp = await client.post(
        "/auth/change-password",
        json={"current_password": "incorrecta", "new_password": "otra123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401
