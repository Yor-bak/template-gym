"""Autenticación servicio-a-servicio para endpoints internos (no JWT de
usuario humano). Mismo patrón que require_service_key en
admin-panel-j2ec-backend/app/dependencies/service_auth.py, para
POST /admin/sync-provisioning.
"""

import secrets

from fastapi import Header, HTTPException, status

from app.config import get_settings

settings = get_settings()


async def require_service_key(x_service_key: str | None = Header(default=None)) -> None:
    # Falla cerrado si SYNC_SERVICE_KEY no está configurado — nunca se trata
    # "sin secreto configurado" como "sin autenticación requerida".
    if not settings.sync_service_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Servicio no configurado")
    if not x_service_key or not secrets.compare_digest(x_service_key, settings.sync_service_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="X-Service-Key inválido o ausente")
