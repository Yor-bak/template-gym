from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.access.models import AccessLog
from app.modules.trainer_clients.models import TrainerClient
from app.modules.users.models import Role
from tests.conftest import make_gym, make_member, make_user


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


async def _make_client_with_token(client: AsyncClient, db: AsyncSession, *, gym_id, email: str):
    user, password = await make_user(db, role=Role.CLIENT, gym_id=gym_id, email=email)
    member = await make_member(
        db,
        gym_id=gym_id,
        user_id=user.id,
        status="active",
        expiration_date=date.today() + timedelta(days=20),
        activation_code=None,
    )
    await db.commit()
    jwt = await _login(client, email, password)
    token_resp = await client.post("/access/my-qr-token", headers={"Authorization": f"Bearer {jwt}"})
    assert token_resp.status_code == 200, token_resp.text
    return member, token_resp.json()["token"]


@pytest.mark.asyncio
async def test_trainer_links_client_by_scanning_qr(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    trainer, trainer_password = await make_user(db_session, role=Role.TRAINER, gym_id=gym.id, email="trainer@test.com")
    await db_session.commit()
    member, qr_token = await _make_client_with_token(client, db_session, gym_id=gym.id, email="cliente@test.com")

    trainer_jwt = await _login(client, "trainer@test.com", trainer_password)
    resp = await client.post(
        "/trainer/link-client", json={"token": qr_token}, headers={"Authorization": f"Bearer {trainer_jwt}"}
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["trainer_id"] == str(trainer.id)
    assert body["client_id"] == str(member.id)

    # Verificación real contra la BD.
    result = await db_session.execute(select(TrainerClient).where(TrainerClient.client_id == member.id))
    link = result.scalar_one()
    assert link.trainer_id == trainer.id

    # El escaneo del entrenador NO debe crear ningún access_log — no es una
    # entrada al gimnasio, es una vinculación. Confirma la distinción de
    # efectos secundarios entre los dos endpoints que comparten el token.
    logs = await db_session.execute(select(AccessLog).where(AccessLog.gym_id == gym.id))
    assert logs.scalars().all() == []

    # Y aparece en "Mis clientes" del entrenador vía la API real.
    my_clients = await client.get("/trainer/my-clients", headers={"Authorization": f"Bearer {trainer_jwt}"})
    assert my_clients.status_code == 200
    assert [c["id"] for c in my_clients.json()] == [str(member.id)]


@pytest.mark.asyncio
async def test_scanning_again_reassigns_to_new_trainer(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    trainer_1, trainer_1_password = await make_user(db_session, role=Role.TRAINER, gym_id=gym.id, email="t1@test.com")
    trainer_2, trainer_2_password = await make_user(db_session, role=Role.TRAINER, gym_id=gym.id, email="t2@test.com")
    await db_session.commit()
    member, qr_token_1 = await _make_client_with_token(client, db_session, gym_id=gym.id, email="cliente2@test.com")

    t1_jwt = await _login(client, "t1@test.com", trainer_1_password)
    first = await client.post(
        "/trainer/link-client", json={"token": qr_token_1}, headers={"Authorization": f"Bearer {t1_jwt}"}
    )
    assert first.status_code == 201

    # El mismo miembro pide un token nuevo y otro entrenador lo escanea:
    # un cliente, un entrenador a la vez — la fila se reasigna, no se duplica.
    member_jwt = await _login(client, "cliente2@test.com", "password123")
    token_resp_2 = await client.post("/access/my-qr-token", headers={"Authorization": f"Bearer {member_jwt}"})
    qr_token_2 = token_resp_2.json()["token"]

    t2_jwt = await _login(client, "t2@test.com", trainer_2_password)
    second = await client.post(
        "/trainer/link-client", json={"token": qr_token_2}, headers={"Authorization": f"Bearer {t2_jwt}"}
    )
    assert second.status_code == 201

    result = await db_session.execute(select(TrainerClient).where(TrainerClient.client_id == member.id))
    links = result.scalars().all()
    assert len(links) == 1  # no se duplicó la fila
    assert links[0].trainer_id == trainer_2.id  # quedó reasignado al segundo


@pytest.mark.asyncio
async def test_trainer_cannot_link_client_from_another_gym(client: AsyncClient, db_session: AsyncSession):
    gym_a = await make_gym(db_session, name="A", slug="trainer-a")
    gym_b = await make_gym(db_session, name="B", slug="trainer-b")
    trainer_a, trainer_a_password = await make_user(
        db_session, role=Role.TRAINER, gym_id=gym_a.id, email="trainer-a@test.com"
    )
    await db_session.commit()
    member_b, qr_token_b = await _make_client_with_token(client, db_session, gym_id=gym_b.id, email="cliente-b2@test.com")

    trainer_a_jwt = await _login(client, "trainer-a@test.com", trainer_a_password)
    resp = await client.post(
        "/trainer/link-client", json={"token": qr_token_b}, headers={"Authorization": f"Bearer {trainer_a_jwt}"}
    )
    assert resp.status_code == 404, resp.text

    result = await db_session.execute(select(TrainerClient).where(TrainerClient.client_id == member_b.id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_only_trainer_role_can_link_client(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion@test.com"
    )
    await db_session.commit()
    _member, qr_token = await _make_client_with_token(client, db_session, gym_id=gym.id, email="cliente3@test.com")

    staff_jwt = await _login(client, "recepcion@test.com", receptionist_password)
    resp = await client.post(
        "/trainer/link-client", json={"token": qr_token}, headers={"Authorization": f"Bearer {staff_jwt}"}
    )
    assert resp.status_code == 403, resp.text
