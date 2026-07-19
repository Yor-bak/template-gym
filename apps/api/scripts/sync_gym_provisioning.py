"""Dispara manualmente la sincronización de aprovisionamiento pendiente
desde admin-panel-j2ec (ver app/integrations/provisioning_service.py). No
existe todavía un endpoint ni un cron que llame a
sync_pending_gym_provisioning() — este script es ese disparador manual,
para pruebas y para operar mientras esa decisión de producto sigue
pendiente.

Uso (desde apps/api, con el entorno activado, o dentro del contenedor de
producción vía `docker compose exec backend python -m scripts.sync_gym_provisioning`):
    python -m scripts.sync_gym_provisioning

La contraseña temporal de cada gym_admin creado se imprime UNA sola vez en
esta salida (nunca se loguea desde provisioning_service.py) — cópiala de
inmediato, no queda registrada en ningún otro lugar.
"""

import asyncio

from app.core.database import async_session_factory
from app.integrations.provisioning_service import sync_pending_gym_provisioning


async def main() -> None:
    async with async_session_factory() as db:
        result = await sync_pending_gym_provisioning(db)

    print(f"Solicitudes pendientes encontradas: {result['total_pending']}")

    for item in result["provisioned"]:
        print(
            f"  OK  gym_id={item['gym_id']} admin_phone={item['gym_admin_phone']} "
            f"password_temporal={item['temp_password']}"
        )
    for item in result["skipped"]:
        print(f"  SKIP request_id={item['request_id']} motivo={item['reason']}")

    if not result["provisioned"] and not result["skipped"]:
        print("Nada que procesar.")


if __name__ == "__main__":
    asyncio.run(main())
