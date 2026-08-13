"""Disparador HTTP de la sincronización de aprovisionamiento (Decisión: mover
scripts/sync_gym_provisioning.py, corrido manualmente por SSH, a un endpoint
que un cron/timer de sistema pueda llamar). Misma lógica que ese script,
misma función core (sync_pending_gym_provisioning) — solo cambia quién la
dispara. Autenticación con X-Service-Key (require_service_key), nunca JWT de
usuario humano: ni un gym_admin ni un platform_admin deben poder llamarlo,
solo el propio sistema.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service_key import require_service_key
from app.core.database import get_db
from app.integrations.provisioning_service import sync_pending_gym_provisioning

router = APIRouter(prefix="/admin", tags=["internal"], dependencies=[Depends(require_service_key)])


@router.post("/sync-provisioning")
async def sync_provisioning(db: AsyncSession = Depends(get_db)) -> dict:
    result = await sync_pending_gym_provisioning(db)
    # Sin temp_password en la respuesta a propósito: un endpoint disparado
    # por cron es más superficie de exposición que el terminal humano de un
    # solo uso del script manual (ver docstring de ese script). El log de
    # resumen (sync_pending_gym_provisioning) tampoco la incluye.
    return {
        "total_pending": result["total_pending"],
        "provisioned": len(result["provisioned"]),
        "skipped": len(result["skipped"]),
    }
