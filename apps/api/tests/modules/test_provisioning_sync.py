import pytest
from httpx import AsyncClient

from app.config import get_settings

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def sync_service_key(monkeypatch):
    monkeypatch.setattr(get_settings(), "sync_service_key", "test-sync-key")
    yield


async def test_sync_provisioning_requires_key(client: AsyncClient):
    resp = await client.post("/admin/sync-provisioning")
    assert resp.status_code == 401


async def test_sync_provisioning_rejects_wrong_key(client: AsyncClient):
    resp = await client.post("/admin/sync-provisioning", headers={"X-Service-Key": "wrong"})
    assert resp.status_code == 401


async def test_sync_provisioning_with_valid_key(client: AsyncClient, monkeypatch):
    async def fake_sync(db):
        return {
            "total_pending": 2,
            "provisioned": [{"request_id": "r1", "gym_id": "g1", "gym_admin_phone": "5500000000", "temp_password": "abc123"}],
            "skipped": [{"request_id": "r2", "reason": "falta accessPhone"}],
        }

    monkeypatch.setattr(
        "app.modules.provisioning_sync.router.sync_pending_gym_provisioning", fake_sync
    )

    resp = await client.post("/admin/sync-provisioning", headers={"X-Service-Key": "test-sync-key"})

    assert resp.status_code == 200
    body = resp.json()
    assert body == {"total_pending": 2, "provisioned": 1, "skipped": 1}
    # La contraseña temporal y los detalles internos nunca deben viajar en la
    # respuesta HTTP de este endpoint disparado por cron.
    assert "temp_password" not in resp.text
