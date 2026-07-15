"""Cliente HTTP interno hacia los endpoints de aprovisionamiento de
admin-panel-j2ec (Decisión #10 de ese proyecto — ver
DECISION_LOG_addendum_10.md y API_PROPUESTA.md §17 "Integración interna" en
el repo admin-panel-j2ec).

Estado a 2026-07-15: estos dos endpoints **no existen todavía** del lado de
admin-panel-j2ec-backend — solo está implementada la tabla
`client_provisioning_requests` y la escritura de filas al activar un cliente
(`app/services/activation_service.py` en ese repo). El router
`/internal/provisioning-requests` en sí no está construido. Este cliente
está hecho contra el contrato ya documentado en API_PROPUESTA.md §17, para
no bloquear el trabajo de este lado — pero no puede probarse contra un
servidor real hasta que ese router exista (solo con respuestas simuladas,
ver tests/).

Autenticación: header `X-Service-Key` (API key de servicio compartida por
variable de entorno en ambos lados, NUNCA JWT de usuario) — mismo mecanismo
que ya usa `admin_panel_service_key` en app/config.py.
"""

import uuid
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field

from app.config import get_settings

settings = get_settings()


class AdminPanelError(Exception):
    """Error de comunicación con admin-panel-j2ec: red, auth, o respuesta
    inesperada. Nunca se traduce a un estado 'consumed' de este lado — el
    caller decide si reintentar."""


class ProvisioningRequest(BaseModel):
    """Fila de client_provisioning_requests tal como la expone
    GET /internal/provisioning-requests. Los campos llegan en camelCase
    (convención de admin-panel-j2ec, distinta a la snake_case de este
    proyecto) — se traducen aquí, en la frontera, para que el resto del
    código de apps/api nunca tenga que pensar en esa diferencia."""

    model_config = ConfigDict(populate_by_name=True)

    id: uuid.UUID
    client_id: uuid.UUID = Field(alias="clientId")
    target_system: str = Field(alias="targetSystem")
    payload: dict[str, Any]
    status: str
    created_at: str = Field(alias="createdAt")


def _require_service_key() -> str:
    if not settings.admin_panel_service_key:
        raise AdminPanelError(
            "ADMIN_PANEL_SERVICE_KEY no está configurado — no se puede hablar con admin-panel-j2ec."
        )
    return settings.admin_panel_service_key


# Punto de inyección para tests: no hay servidor real de
# admin-panel-j2ec-backend contra el que probar (el router
# /internal/provisioning-requests no existe todavía, ver docstring del
# módulo) — los tests simulan sus respuestas con httpx.MockTransport en vez
# de golpear la red. None en producción (usa el transporte real de httpx).
_transport_override: httpx.BaseTransport | None = None


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.admin_panel_base_url,
        headers={"X-Service-Key": _require_service_key()},
        timeout=10.0,
        transport=_transport_override,
    )


async def list_pending_gym_requests() -> list[ProvisioningRequest]:
    """GET /internal/provisioning-requests?target_system=gym&status=pending"""
    async with _client() as client:
        try:
            resp = await client.get(
                "/internal/provisioning-requests",
                params={"target_system": "gym", "status": "pending"},
            )
        except httpx.RequestError as exc:
            raise AdminPanelError(f"No se pudo conectar con admin-panel-j2ec: {exc}") from exc

    if resp.status_code != 200:
        raise AdminPanelError(
            f"GET /internal/provisioning-requests devolvió {resp.status_code}: {resp.text}"
        )

    body = resp.json()
    rows = body.get("data", [])
    return [ProvisioningRequest.model_validate(row) for row in rows]


async def consume_request(request_id: uuid.UUID, *, note: str | None = None) -> None:
    """POST /internal/provisioning-requests/{id}/consume

    Idempotente del lado de admin-panel-j2ec: responde 409 si la fila ya no
    está 'pending' (ya consumida por un intento anterior). Ese caso se
    trata como error aquí — el caller decide si es señal de "ya se procesó,
    todo bien" o de un conflicto real; este cliente no lo asume por él."""
    async with _client() as client:
        try:
            resp = await client.post(
                f"/internal/provisioning-requests/{request_id}/consume",
                json={"consumedByNote": note} if note else {},
            )
        except httpx.RequestError as exc:
            raise AdminPanelError(f"No se pudo conectar con admin-panel-j2ec: {exc}") from exc

    if resp.status_code == 409:
        raise AdminPanelError(
            f"La solicitud {request_id} ya no está 'pending' (409) — "
            "probablemente ya fue consumida en un intento anterior."
        )
    if resp.status_code != 204:
        raise AdminPanelError(
            f"POST /internal/provisioning-requests/{request_id}/consume devolvió "
            f"{resp.status_code}: {resp.text}"
        )
