import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations import provisioning_service
from app.integrations.admin_panel_client import AdminPanelError, ProvisioningRequest
from app.modules.gyms.models import Gym
from app.modules.users.models import Role, User


def _request(payload: dict, *, req_id: uuid.UUID | None = None) -> ProvisioningRequest:
    return ProvisioningRequest(
        id=req_id or uuid.uuid4(),
        client_id=uuid.uuid4(),
        target_system="gym",
        payload=payload,
        status="pending",
        created_at="2026-07-15T00:00:00Z",
    )


@pytest.mark.asyncio
async def test_sync_creates_gym_and_admin_and_consumes(db_session: AsyncSession, monkeypatch):
    req = _request({"businessName": "Acme Gym", "email": "owner@acme-gym.test", "slug": "acme-gym"})
    consumed_ids = []

    async def fake_list():
        return [req]

    async def fake_consume(request_id, *, note=None):
        consumed_ids.append((request_id, note))

    monkeypatch.setattr(provisioning_service, "list_pending_gym_requests", fake_list)
    monkeypatch.setattr(provisioning_service, "consume_request", fake_consume)

    result = await provisioning_service.sync_pending_gym_provisioning(db_session)

    assert result["total_pending"] == 1
    assert len(result["provisioned"]) == 1
    assert result["skipped"] == []
    assert consumed_ids == [(req.id, f"gym_id={result['provisioned'][0]['gym_id']}")]

    gym_row = (await db_session.execute(select(Gym).where(Gym.slug == "acme-gym"))).scalar_one()
    assert gym_row.name == "Acme Gym"

    admin_row = (await db_session.execute(select(User).where(User.email == "owner@acme-gym.test"))).scalar_one()
    assert admin_row.role == Role.GYM_ADMIN
    assert admin_row.gym_id == gym_row.id
    # La contraseña nunca se guarda en texto plano — el hash no debe coincidir
    # con el string que sí se regresa al caller.
    assert admin_row.password_hash != result["provisioned"][0]["temp_password"]
    assert result["provisioned"][0]["temp_password"]


@pytest.mark.asyncio
async def test_sync_skips_request_missing_email_and_never_consumes(db_session: AsyncSession, monkeypatch):
    req = _request({"businessName": "Sin Correo Gym", "slug": "sin-correo"})
    consume_calls = []

    async def fake_list():
        return [req]

    async def fake_consume(request_id, *, note=None):
        consume_calls.append(request_id)

    monkeypatch.setattr(provisioning_service, "list_pending_gym_requests", fake_list)
    monkeypatch.setattr(provisioning_service, "consume_request", fake_consume)

    result = await provisioning_service.sync_pending_gym_provisioning(db_session)

    assert result["provisioned"] == []
    assert len(result["skipped"]) == 1
    assert "email" in result["skipped"][0]["reason"]
    assert consume_calls == []

    gym_row = (await db_session.execute(select(Gym).where(Gym.slug == "sin-correo"))).scalar_one_or_none()
    assert gym_row is None


@pytest.mark.asyncio
async def test_sync_does_not_consume_when_gym_creation_fails(db_session: AsyncSession, monkeypatch):
    # Provoca un fallo real en la creación (email duplicado -> UNIQUE
    # constraint) para confirmar que el rollback deja todo limpio y que
    # consume() nunca se llama.
    from app.core.security import hash_password

    db_session.add(User(
        email="dup@acme-gym.test", password_hash=hash_password("x"),
        full_name="Ya existe", role=Role.PLATFORM_ADMIN, gym_id=None,
    ))
    await db_session.commit()

    req = _request({"businessName": "Duplicado Gym", "email": "dup@acme-gym.test", "slug": "duplicado-gym"})
    consume_calls = []

    async def fake_list():
        return [req]

    async def fake_consume(request_id, *, note=None):
        consume_calls.append(request_id)

    monkeypatch.setattr(provisioning_service, "list_pending_gym_requests", fake_list)
    monkeypatch.setattr(provisioning_service, "consume_request", fake_consume)

    result = await provisioning_service.sync_pending_gym_provisioning(db_session)

    assert result["provisioned"] == []
    assert consume_calls == []
    # El gym tampoco debe quedar huérfano: el rollback revierte toda la
    # transacción, no solo el insert del User que falló.
    gym_row = (await db_session.execute(select(Gym).where(Gym.slug == "duplicado-gym"))).scalar_one_or_none()
    assert gym_row is None


@pytest.mark.asyncio
async def test_sync_recovers_without_duplicating_after_consume_failure(db_session: AsyncSession, monkeypatch):
    req = _request({"businessName": "Recovery Gym", "email": "owner@recovery-gym.test", "slug": "recovery-gym"})

    async def fake_list():
        return [req]

    async def fake_consume_fails(request_id, *, note=None):
        raise AdminPanelError("red caída, simulado")

    monkeypatch.setattr(provisioning_service, "list_pending_gym_requests", fake_list)
    monkeypatch.setattr(provisioning_service, "consume_request", fake_consume_fails)

    first = await provisioning_service.sync_pending_gym_provisioning(db_session)
    # consume() falló: no se cuenta como provisioned, pero el gym+admin SÍ
    # quedaron confirmados en la base (commit ya corrió antes de consume()).
    assert first["provisioned"] == []
    gym_after_first = (await db_session.execute(select(Gym).where(Gym.slug == "recovery-gym"))).scalar_one()

    consumed_ids = []

    async def fake_consume_succeeds(request_id, *, note=None):
        consumed_ids.append(request_id)

    monkeypatch.setattr(provisioning_service, "consume_request", fake_consume_succeeds)

    second = await provisioning_service.sync_pending_gym_provisioning(db_session)

    assert consumed_ids == [req.id]
    assert len(second["provisioned"]) == 1
    assert second["provisioned"][0]["gym_id"] == str(gym_after_first.id)
    # No se creó un segundo gym con el mismo slug.
    all_gyms = (await db_session.execute(select(Gym).where(Gym.slug == "recovery-gym"))).scalars().all()
    assert len(all_gyms) == 1
