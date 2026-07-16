import time
from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.qr import _sign
from app.modules.access.models import AccessLog
from app.modules.members.models import Member
from app.modules.membership_plans.models import MembershipPlan
from app.modules.users.models import Role
from tests.conftest import make_gym, make_member, make_user


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


async def _make_active_plan(db: AsyncSession, *, gym_id, tolerance_days: int = 0) -> MembershipPlan:
    plan = MembershipPlan(
        gym_id=gym_id, name="Mensual", price=500, duration=1, duration_unit="months", tolerance_days=tolerance_days
    )
    db.add(plan)
    await db.flush()
    return plan


async def _make_client_user_and_member(
    db: AsyncSession, *, gym_id, status: str, expiration_date, email: str, **overrides
) -> tuple[Member, str]:
    user, password = await make_user(db, role=Role.CLIENT, gym_id=gym_id, email=email)
    member = await make_member(
        db,
        gym_id=gym_id,
        user_id=user.id,
        status=status,
        expiration_date=expiration_date,
        activation_code=None,
        **overrides,
    )
    return member, password


@pytest.mark.asyncio
async def test_client_generates_token_and_reception_scans_authorized(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    plan = await _make_active_plan(db_session, gym_id=gym.id)
    member, member_password = await _make_client_user_and_member(
        db_session,
        gym_id=gym.id,
        status="active",
        expiration_date=date.today() + timedelta(days=20),
        email="cliente@test.com",
        membership_plan_id=plan.id,
    )
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion@test.com"
    )
    await db_session.commit()

    # 1) El miembro pide su propio token (app móvil).
    client_token_jwt = await _login(client, "cliente@test.com", member_password)
    token_resp = await client.post(
        "/access/my-qr-token", headers={"Authorization": f"Bearer {client_token_jwt}"}
    )
    assert token_resp.status_code == 200, token_resp.text
    qr_token = token_resp.json()["token"]

    # 2) Recepción escanea ese mismo token (dashboard web).
    staff_jwt = await _login(client, "recepcion@test.com", receptionist_password)
    scan_resp = await client.post(
        "/access/scan",
        json={"token": qr_token, "reader": "Entrada principal"},
        headers={"Authorization": f"Bearer {staff_jwt}"},
    )
    assert scan_resp.status_code == 200, scan_resp.text
    body = scan_resp.json()
    assert body["result"] == "authorized"
    assert body["member_id"] == str(member.id)

    # Verificación real contra la BD, no solo la respuesta.
    result = await db_session.execute(select(AccessLog).where(AccessLog.gym_id == gym.id))
    logs = result.scalars().all()
    assert len(logs) == 1
    assert logs[0].result == "authorized"
    assert logs[0].member_id == member.id


@pytest.mark.asyncio
async def test_scan_blocked_member(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    member, member_password = await _make_client_user_and_member(
        db_session,
        gym_id=gym.id,
        status="blocked",
        expiration_date=date.today() + timedelta(days=20),
        email="bloqueado@test.com",
    )
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion2@test.com"
    )
    await db_session.commit()

    client_jwt = await _login(client, "bloqueado@test.com", member_password)
    token = (
        await client.post("/access/my-qr-token", headers={"Authorization": f"Bearer {client_jwt}"})
    ).json()["token"]

    staff_jwt = await _login(client, "recepcion2@test.com", receptionist_password)
    resp = await client.post(
        "/access/scan", json={"token": token}, headers={"Authorization": f"Bearer {staff_jwt}"}
    )
    assert resp.status_code == 200
    assert resp.json()["result"] == "blocked"


@pytest.mark.asyncio
async def test_scan_garbage_token_logs_invalid_under_scanning_staff_gym(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion3@test.com"
    )
    await db_session.commit()

    staff_jwt = await _login(client, "recepcion3@test.com", receptionist_password)
    resp = await client.post(
        "/access/scan",
        json={"token": "esto-no-es-un-token-valido"},
        headers={"Authorization": f"Bearer {staff_jwt}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["result"] == "invalid_token"
    assert body["member_id"] is None
    assert body["gym_id"] == str(gym.id)


@pytest.mark.asyncio
async def test_scan_rejects_valid_token_from_another_gym_without_leaking_status(
    client: AsyncClient, db_session: AsyncSession
):
    """Escenario CRIT-01-equivalente para QR: un token válidamente firmado
    (no falsificado) de un miembro del gimnasio B, escaneado por recepción
    del gimnasio A. Debe rechazarse como si fuera inválido, SIN revelar el
    status real del miembro de B (blocked/expired/etc.) — de lo contrario
    este endpoint sería un oráculo para sondear miembros de otro tenant."""
    gym_a = await make_gym(db_session, name="A", slug="access-a")
    gym_b = await make_gym(db_session, name="B", slug="access-b")
    member_b, member_b_password = await _make_client_user_and_member(
        db_session,
        gym_id=gym_b.id,
        status="active",
        expiration_date=date.today() + timedelta(days=20),
        email="cliente-b@test.com",
    )
    receptionist_a, receptionist_a_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym_a.id, email="recepcion-a@test.com"
    )
    await db_session.commit()

    client_b_jwt = await _login(client, "cliente-b@test.com", member_b_password)
    token_b = (
        await client.post("/access/my-qr-token", headers={"Authorization": f"Bearer {client_b_jwt}"})
    ).json()["token"]

    staff_a_jwt = await _login(client, "recepcion-a@test.com", receptionist_a_password)
    resp = await client.post(
        "/access/scan", json={"token": token_b}, headers={"Authorization": f"Bearer {staff_a_jwt}"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["result"] == "invalid_token"
    assert body["member_id"] is None
    assert body["gym_id"] == str(gym_a.id)

    # El log quedó registrado en A (quien escaneó), nunca tocó nada de B.
    result_b = await db_session.execute(select(AccessLog).where(AccessLog.gym_id == gym_b.id))
    assert result_b.scalars().all() == []


@pytest.mark.asyncio
async def test_token_expires_after_window(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    member, _ = await _make_client_user_and_member(
        db_session,
        gym_id=gym.id,
        status="active",
        expiration_date=date.today() + timedelta(days=20),
        email="viejo@test.com",
    )
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion4@test.com"
    )
    await db_session.commit()

    # Token firmado válidamente pero con issued_at de hace 60s (> ventana de 30s).
    import base64

    issued_at = int(time.time()) - 60
    payload = f"client:{member.id}:{gym.id}:{issued_at}"
    signature = _sign(payload)
    stale_token = base64.urlsafe_b64encode(f"{payload}:{signature}".encode()).decode()

    staff_jwt = await _login(client, "recepcion4@test.com", receptionist_password)
    resp = await client.post(
        "/access/scan", json={"token": stale_token}, headers={"Authorization": f"Bearer {staff_jwt}"}
    )
    assert resp.status_code == 200
    assert resp.json()["result"] == "invalid_token"


@pytest.mark.asyncio
async def test_only_client_role_can_generate_own_qr_token(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion5@test.com"
    )
    await db_session.commit()

    staff_jwt = await _login(client, "recepcion5@test.com", receptionist_password)
    resp = await client.post("/access/my-qr-token", headers={"Authorization": f"Bearer {staff_jwt}"})
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_client_cannot_list_gym_access_logs(client: AsyncClient, db_session: AsyncSession):
    """ALTA-hallazgo detectado al auditar los endpoints reales de apps/api:
    GET /access/logs solo comprobaba gym_id != None, así que cualquier CLIENT
    autenticado podía ver los horarios de entrada/salida de TODOS los
    miembros del gimnasio, no solo los suyos. Debe quedar reservado a staff."""
    gym = await make_gym(db_session)
    member, member_password = await _make_client_user_and_member(
        db_session,
        gym_id=gym.id,
        status="active",
        expiration_date=date.today() + timedelta(days=20),
        email="cliente6@test.com",
    )
    await db_session.commit()

    client_jwt = await _login(client, "cliente6@test.com", member_password)
    resp = await client.get("/access/logs", headers={"Authorization": f"Bearer {client_jwt}"})
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_receptionist_can_list_gym_access_logs(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion6@test.com"
    )
    await db_session.commit()

    staff_jwt = await _login(client, "recepcion6@test.com", receptionist_password)
    resp = await client.get("/access/logs", headers={"Authorization": f"Bearer {staff_jwt}"})
    assert resp.status_code == 200, resp.text
