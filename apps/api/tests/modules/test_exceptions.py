import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_unhandled_exception_returns_uniform_500_contract():
    @app.get("/__boom")
    async def _boom():
        raise RuntimeError("boom")

    try:
        # raise_app_exceptions=False: queremos observar la respuesta JSON
        # que el cliente real recibiría, no que httpx re-lance la excepción
        # original (comportamiento normal de ASGITransport para depuración).
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/__boom")
    finally:
        app.router.routes = [r for r in app.router.routes if getattr(r, "path", None) != "/__boom"]

    assert resp.status_code == 500
    assert resp.json() == {"detail": "Error interno del servidor"}
