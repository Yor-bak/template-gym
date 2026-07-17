import uuid

import httpx
import pytest

from app.integrations import admin_panel_client as client_module
from app.integrations.admin_panel_client import (
    AdminPanelError,
    consume_request,
    list_pending_gym_requests,
)


@pytest.fixture(autouse=True)
def _service_key(monkeypatch):
    monkeypatch.setattr(client_module.settings, "admin_panel_service_key", "test-shared-secret")
    yield


@pytest.mark.asyncio
async def test_list_pending_gym_requests_parses_camelcase_and_sends_service_key():
    seen_requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_requests.append(request)
        assert request.url.params["target_system"] == "gym"
        assert request.url.params["status"] == "pending"
        assert request.headers["x-service-key"] == "test-shared-secret"
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "id": str(uuid.uuid4()),
                        "clientId": str(uuid.uuid4()),
                        "targetSystem": "gym",
                        "payload": {"slug": "acme-gym", "businessType": "gym"},
                        "status": "pending",
                        "createdAt": "2026-07-13T15:00:00Z",
                    }
                ]
            },
        )

    client_module._transport_override = httpx.MockTransport(handler)
    try:
        rows = await list_pending_gym_requests()
    finally:
        client_module._transport_override = None

    assert len(seen_requests) == 1
    assert len(rows) == 1
    assert rows[0].target_system == "gym"
    assert rows[0].payload["slug"] == "acme-gym"


@pytest.mark.asyncio
async def test_list_pending_gym_requests_raises_on_non_200():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="boom")

    client_module._transport_override = httpx.MockTransport(handler)
    try:
        with pytest.raises(AdminPanelError):
            await list_pending_gym_requests()
    finally:
        client_module._transport_override = None


@pytest.mark.asyncio
async def test_missing_service_key_raises_before_any_request(monkeypatch):
    monkeypatch.setattr(client_module.settings, "admin_panel_service_key", "")
    with pytest.raises(AdminPanelError, match="ADMIN_PANEL_SERVICE_KEY"):
        await list_pending_gym_requests()


@pytest.mark.asyncio
async def test_consume_request_success_sends_note():
    seen_bodies = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_bodies.append(request.content)
        assert request.method == "POST"
        assert request.url.path.endswith("/consume")
        return httpx.Response(204)

    client_module._transport_override = httpx.MockTransport(handler)
    try:
        await consume_request(uuid.uuid4(), note="gym_id=abc")
    finally:
        client_module._transport_override = None

    assert b"gym_id=abc" in seen_bodies[0]


@pytest.mark.asyncio
async def test_consume_request_409_raises_admin_panel_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(409, json={"detail": "already consumed"})

    client_module._transport_override = httpx.MockTransport(handler)
    try:
        with pytest.raises(AdminPanelError):
            await consume_request(uuid.uuid4())
    finally:
        client_module._transport_override = None
