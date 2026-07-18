import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import Role, User
from tests.conftest import make_gym, make_user, phone_from_email


async def _login(client: AsyncClient, email: str, password: str) -> str:
    # email aquí es el identificador legado usado por los call-sites de este
    # archivo (literal o de un User.email) — se deriva el phone determinístico
    # correspondiente porque el login real ahora es por phone, no por email.
    resp = await client.post(
        "/auth/login", json={"phone": phone_from_email(email), "password": password}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["accessToken"]


# ---------------------------------------------------------------------------
# Límite de personal: 1 gym_admin_secondary + 2 receptionist por gimnasio
# (DECISION_LOG_GYM.md, Bloque 1, decisión 1). COUNT(*) server-side, no solo UI.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_receptionist_limit_of_two(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    admin, admin_password = await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="admin@test.com")
    await db_session.commit()

    token = await _login(client, "admin@test.com", admin_password)
    headers = {"Authorization": f"Bearer {token}"}

    def payload(email: str) -> dict:
        return {
            "email": email,
            "phone": phone_from_email(email),
            "password": "password123",
            "full_name": "Recepcionista",
            "role": "receptionist",
            "gym_id": str(gym.id),
        }

    first = await client.post("/users", json=payload("r1@test.com"), headers=headers)
    assert first.status_code == 201, first.text

    second = await client.post("/users", json=payload("r2@test.com"), headers=headers)
    assert second.status_code == 201, second.text

    # Tercer recepcionista activo del mismo gimnasio: debe rechazarse.
    third = await client.post("/users", json=payload("r3@test.com"), headers=headers)
    assert third.status_code == 409, third.text
    assert "límite" in third.json()["detail"].lower()

    result = await db_session.execute(
        select(func.count()).select_from(User).where(User.gym_id == gym.id, User.role == Role.RECEPTIONIST)
    )
    assert result.scalar_one() == 2


@pytest.mark.asyncio
async def test_gym_admin_secondary_limit_of_one(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    admin, admin_password = await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="admin@test.com")
    await db_session.commit()

    token = await _login(client, "admin@test.com", admin_password)
    headers = {"Authorization": f"Bearer {token}"}

    def payload(email: str) -> dict:
        return {
            "email": email,
            "phone": phone_from_email(email),
            "password": "password123",
            "full_name": "Admin Secundario",
            "role": "gym_admin_secondary",
            "gym_id": str(gym.id),
        }

    first = await client.post("/users", json=payload("secondary1@test.com"), headers=headers)
    assert first.status_code == 201, first.text
    assert first.json()["role"] == "gym_admin_secondary"

    # Segundo admin secundario del mismo gimnasio: debe rechazarse (máx. 1).
    second = await client.post("/users", json=payload("secondary2@test.com"), headers=headers)
    assert second.status_code == 409, second.text
    assert "límite" in second.json()["detail"].lower()

    result = await db_session.execute(
        select(func.count()).select_from(User).where(User.gym_id == gym.id, User.role == Role.GYM_ADMIN_SECONDARY)
    )
    assert result.scalar_one() == 1


@pytest.mark.asyncio
async def test_gym_admin_secondary_cannot_create_another_secondary(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    secondary, secondary_password = await make_user(
        db_session, role=Role.GYM_ADMIN_SECONDARY, gym_id=gym.id, email="secondary@test.com"
    )
    await db_session.commit()

    token = await _login(client, "secondary@test.com", secondary_password)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/users",
        json={
            "email": "another-secondary@test.com",
            "phone": phone_from_email("another-secondary@test.com"),
            "password": "password123",
            "full_name": "Otro Secundario",
            "role": "gym_admin_secondary",
            "gym_id": str(gym.id),
        },
        headers=headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_cannot_create_gym_admin_via_staff_endpoint(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    admin, admin_password = await make_user(db_session, role=Role.GYM_ADMIN, gym_id=gym.id, email="admin@test.com")
    await db_session.commit()

    token = await _login(client, "admin@test.com", admin_password)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/users",
        json={
            "email": "otro-gym-admin@test.com",
            "phone": phone_from_email("otro-gym-admin@test.com"),
            "password": "password123",
            "full_name": "Otro Titular",
            "role": "gym_admin",
            "gym_id": str(gym.id),
        },
        headers=headers,
    )
    assert resp.status_code == 403, resp.text


# ---------------------------------------------------------------------------
# CRIT-01: un admin del gimnasio A no puede crear/afectar staff del gimnasio B
# pasando su gymId explícitamente en el body — debe ignorarse por completo
# salvo que el caller sea platform_admin. Prueba end-to-end real: login real,
# request real con el gym_id de otro tenant, se verifica la respuesta Y el
# estado real de la base de datos (no solo que el código "parezca" bloquearlo).
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_cannot_create_staff_in_another_gym_via_body(client: AsyncClient, db_session: AsyncSession):
    gym_a = await make_gym(db_session, name="Gimnasio A", slug="gimnasio-a")
    gym_b = await make_gym(db_session, name="Gimnasio B", slug="gimnasio-b")
    admin_a, admin_a_password = await make_user(
        db_session, role=Role.GYM_ADMIN, gym_id=gym_a.id, email="admin-a@test.com"
    )
    await db_session.commit()

    token = await _login(client, "admin-a@test.com", admin_a_password)
    headers = {"Authorization": f"Bearer {token}"}

    # El admin de A intenta crear un recepcionista pasando el gym_id de B
    # explícitamente en el body — exactamente el escenario de CRIT-01.
    resp = await client.post(
        "/users",
        json={
            "email": "intruso@test.com",
            "phone": phone_from_email("intruso@test.com"),
            "password": "password123",
            "full_name": "Recepcionista Intruso",
            "role": "receptionist",
            "gym_id": str(gym_b.id),
        },
        headers=headers,
    )

    # No se rechaza la request entera (el admin sí puede crear recepcionistas
    # — solo no en un gimnasio ajeno): se acepta, pero el servidor IGNORA el
    # gym_id del body y usa el del propio caller.
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["gym_id"] == str(gym_a.id), (
        f"El servidor debía ignorar el gym_id del body y usar el del caller (gym A), "
        f"pero el usuario quedó creado con gym_id={body['gym_id']!r} (se pidió {str(gym_b.id)!r})"
    )
    assert body["gym_id"] != str(gym_b.id)

    # Confirmación contra la base de datos real, no solo contra la respuesta.
    result = await db_session.execute(select(User).where(User.email == "intruso@test.com"))
    created = result.scalar_one()
    assert created.gym_id == gym_a.id
    assert created.gym_id != gym_b.id

    gym_b_staff_count = await db_session.execute(
        select(func.count()).select_from(User).where(User.gym_id == gym_b.id)
    )
    assert gym_b_staff_count.scalar_one() == 0, "El gimnasio B no debe tener ningún usuario creado por el admin de A"


@pytest.mark.asyncio
async def test_platform_admin_can_target_any_gym_explicitly(client: AsyncClient, db_session: AsyncSession):
    """Contraparte del test anterior: platform_admin SÍ puede especificar
    gym_id en el body (es la única excepción por diseño — administra multi-sucursal)."""
    gym_a = await make_gym(db_session, name="Gimnasio A", slug="gimnasio-a-2")
    gym_b = await make_gym(db_session, name="Gimnasio B", slug="gimnasio-b-2")
    platform_admin, pa_password = await make_user(
        db_session, role=Role.PLATFORM_ADMIN, gym_id=None, email="platform@test.com"
    )
    await db_session.commit()

    token = await _login(client, "platform@test.com", pa_password)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/users",
        json={
            "email": "recepcion-b@test.com",
            "phone": phone_from_email("recepcion-b@test.com"),
            "password": "password123",
            "full_name": "Recepcionista B",
            "role": "receptionist",
            "gym_id": str(gym_b.id),
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["gym_id"] == str(gym_b.id)
