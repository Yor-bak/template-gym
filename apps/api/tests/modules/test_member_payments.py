from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.member_payments.models import MemberPayment
from app.modules.membership_plans.models import MembershipPlan
from app.modules.users.models import Role
from tests.conftest import make_gym, make_member, make_user, phone_from_email


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post(
        "/auth/login", json={"phone": phone_from_email(email), "password": password}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["accessToken"]


async def _make_plan(db: AsyncSession, *, gym_id, duration: int = 1, duration_unit: str = "months") -> MembershipPlan:
    plan = MembershipPlan(
        gym_id=gym_id, name="Mensual", price=500, duration=duration, duration_unit=duration_unit, tolerance_days=0
    )
    db.add(plan)
    await db.flush()
    return plan


@pytest.mark.asyncio
async def test_new_member_without_payments_shows_expired(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion@test.com"
    )
    member = await make_member(db_session, gym_id=gym.id, activation_code=None)
    await db_session.commit()

    staff_jwt = await _login(client, "recepcion@test.com", receptionist_password)
    resp = await client.get("/members", headers={"Authorization": f"Bearer {staff_jwt}"})
    assert resp.status_code == 200, resp.text
    body = [m for m in resp.json() if m["id"] == str(member.id)]
    assert len(body) == 1
    assert body[0]["status"] == "expired"

    detail = await client.get(f"/members/{member.id}", headers={"Authorization": f"Bearer {staff_jwt}"})
    assert detail.json()["status"] == "expired"


@pytest.mark.asyncio
async def test_register_payment_computes_covers_until_from_plan_and_activates_member(
    client: AsyncClient, db_session: AsyncSession
):
    gym = await make_gym(db_session)
    plan = await _make_plan(db_session, gym_id=gym.id, duration=1, duration_unit="months")
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion2@test.com"
    )
    member = await make_member(db_session, gym_id=gym.id, membership_plan_id=plan.id, activation_code=None)
    await db_session.commit()

    staff_jwt = await _login(client, "recepcion2@test.com", receptionist_password)
    resp = await client.post(
        f"/members/{member.id}/payments",
        json={"amount": 500, "paymentMethod": "cash"},
        headers={"Authorization": f"Bearer {staff_jwt}"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    # Cálculo esperado con el mismo helper que usa el backend.
    from app.core.dates import add_duration

    today = date.today()
    expected_covers_until = add_duration(today, 1, "months")
    assert body["coversUntil"] == expected_covers_until.isoformat()
    assert body["memberId"] == str(member.id)
    assert body["recordedBy"] == str(receptionist.id)

    # Verificación real contra la BD, no solo la respuesta.
    result = await db_session.execute(select(MemberPayment).where(MemberPayment.member_id == member.id))
    rows = result.scalars().all()
    assert len(rows) == 1
    assert rows[0].amount == 500
    assert rows[0].covers_until == expected_covers_until

    await db_session.refresh(member)
    assert member.expiration_date == expected_covers_until
    assert member.status == "active"

    # Y así se ve reflejado en el listado real, no solo en el objeto interno.
    listing = await client.get("/members", headers={"Authorization": f"Bearer {staff_jwt}"})
    updated = next(m for m in listing.json() if m["id"] == str(member.id))
    assert updated["status"] == "active"
    assert updated["expirationDate"] == expected_covers_until.isoformat()


@pytest.mark.asyncio
async def test_payment_stacks_from_existing_unexpired_coverage_not_from_today(
    client: AsyncClient, db_session: AsyncSession
):
    """Pagar antes de que venza no debe recortar los días ya pagados: la
    nueva cobertura se suma sobre la fecha de vencimiento actual, no sobre
    hoy."""
    gym = await make_gym(db_session)
    plan = await _make_plan(db_session, gym_id=gym.id, duration=30, duration_unit="days")
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion3@test.com"
    )
    current_expiration = date.today() + timedelta(days=10)
    member = await make_member(
        db_session,
        gym_id=gym.id,
        membership_plan_id=plan.id,
        status="active",
        expiration_date=current_expiration,
        activation_code=None,
    )
    await db_session.commit()

    staff_jwt = await _login(client, "recepcion3@test.com", receptionist_password)
    resp = await client.post(
        f"/members/{member.id}/payments",
        json={"amount": 400},
        headers={"Authorization": f"Bearer {staff_jwt}"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["coversUntil"] == (current_expiration + timedelta(days=30)).isoformat()


@pytest.mark.asyncio
async def test_manual_covers_until_override_and_auto_expiry_afterwards(
    client: AsyncClient, db_session: AsyncSession
):
    """El override manual de coversUntil (pedido explícitamente por el
    negocio) funciona, y una vez que esa fecha ya pasó el miembro vuelve a
    'expired' automáticamente en la siguiente lectura, sin intervención
    manual — la vigencia siempre se recalcula en vivo, nunca queda pegada."""
    gym = await make_gym(db_session)
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion4@test.com"
    )
    member = await make_member(db_session, gym_id=gym.id, activation_code=None)
    await db_session.commit()

    staff_jwt = await _login(client, "recepcion4@test.com", receptionist_password)
    past_date = (date.today() - timedelta(days=1)).isoformat()
    resp = await client.post(
        f"/members/{member.id}/payments",
        json={"amount": 100, "coversUntil": past_date},
        headers={"Authorization": f"Bearer {staff_jwt}"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["coversUntil"] == past_date

    detail = await client.get(f"/members/{member.id}", headers={"Authorization": f"Bearer {staff_jwt}"})
    assert detail.json()["status"] == "expired"


@pytest.mark.asyncio
async def test_scan_reflects_active_status_after_payment(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    plan = await _make_plan(db_session, gym_id=gym.id, duration=1, duration_unit="months")
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion5@test.com"
    )
    user, member_password = await make_user(db_session, role=Role.CLIENT, gym_id=gym.id, email="cliente@test.com")
    member = await make_member(
        db_session, gym_id=gym.id, user_id=user.id, membership_plan_id=plan.id, activation_code=None
    )
    await db_session.commit()

    staff_jwt = await _login(client, "recepcion5@test.com", receptionist_password)

    # Antes de pagar: escaneo real muestra "expired".
    client_jwt = await _login(client, "cliente@test.com", member_password)
    token_before = (
        await client.post("/access/my-qr-token", headers={"Authorization": f"Bearer {client_jwt}"})
    ).json()["token"]
    scan_before = await client.post(
        "/access/scan", json={"token": token_before}, headers={"Authorization": f"Bearer {staff_jwt}"}
    )
    assert scan_before.json()["result"] == "expired"

    await client.post(
        f"/members/{member.id}/payments",
        json={"amount": 500},
        headers={"Authorization": f"Bearer {staff_jwt}"},
    )

    # Después de pagar: mismo mecanismo de escaneo, ahora autorizado.
    token_after = (
        await client.post("/access/my-qr-token", headers={"Authorization": f"Bearer {client_jwt}"})
    ).json()["token"]
    scan_after = await client.post(
        "/access/scan", json={"token": token_after}, headers={"Authorization": f"Bearer {staff_jwt}"}
    )
    assert scan_after.status_code == 200, scan_after.text
    assert scan_after.json()["result"] == "authorized"


@pytest.mark.asyncio
async def test_cannot_register_payment_for_member_of_another_gym(client: AsyncClient, db_session: AsyncSession):
    gym_a = await make_gym(db_session, name="A", slug="pay-a")
    gym_b = await make_gym(db_session, name="B", slug="pay-b")
    receptionist_a, receptionist_a_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym_a.id, email="recepcion-a@test.com"
    )
    member_b = await make_member(db_session, gym_id=gym_b.id, activation_code=None)
    await db_session.commit()

    staff_a_jwt = await _login(client, "recepcion-a@test.com", receptionist_a_password)
    resp = await client.post(
        f"/members/{member_b.id}/payments",
        json={"amount": 300},
        headers={"Authorization": f"Bearer {staff_a_jwt}"},
    )
    assert resp.status_code == 403, resp.text

    result = await db_session.execute(select(MemberPayment).where(MemberPayment.member_id == member_b.id))
    assert result.scalars().all() == []
    await db_session.refresh(member_b)
    assert member_b.expiration_date is None


@pytest.mark.asyncio
async def test_only_staff_roles_can_register_payment(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    trainer, trainer_password = await make_user(db_session, role=Role.TRAINER, gym_id=gym.id, email="trainer@test.com")
    member = await make_member(db_session, gym_id=gym.id, activation_code=None)
    await db_session.commit()

    trainer_jwt = await _login(client, "trainer@test.com", trainer_password)
    resp = await client.post(
        f"/members/{member.id}/payments",
        json={"amount": 300},
        headers={"Authorization": f"Bearer {trainer_jwt}"},
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_list_payments_history_for_member(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    receptionist, receptionist_password = await make_user(
        db_session, role=Role.RECEPTIONIST, gym_id=gym.id, email="recepcion6@test.com"
    )
    member = await make_member(db_session, gym_id=gym.id, activation_code=None)
    await db_session.commit()

    staff_jwt = await _login(client, "recepcion6@test.com", receptionist_password)
    for amount in (100, 200):
        r = await client.post(
            f"/members/{member.id}/payments",
            json={"amount": amount},
            headers={"Authorization": f"Bearer {staff_jwt}"},
        )
        assert r.status_code == 201

    resp = await client.get(f"/members/{member.id}/payments", headers={"Authorization": f"Bearer {staff_jwt}"})
    assert resp.status_code == 200, resp.text
    amounts = sorted(p["amount"] for p in resp.json())
    assert amounts == [100, 200]


@pytest.mark.asyncio
async def test_trainer_cannot_list_member_payments(client: AsyncClient, db_session: AsyncSession):
    gym = await make_gym(db_session)
    trainer, trainer_password = await make_user(db_session, role=Role.TRAINER, gym_id=gym.id, email="trainer2@test.com")
    member = await make_member(db_session, gym_id=gym.id, activation_code=None)
    await db_session.commit()

    trainer_jwt = await _login(client, "trainer2@test.com", trainer_password)
    resp = await client.get(f"/members/{member.id}/payments", headers={"Authorization": f"Bearer {trainer_jwt}"})
    assert resp.status_code == 403, resp.text
