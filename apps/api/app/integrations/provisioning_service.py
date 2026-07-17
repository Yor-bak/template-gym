"""Núcleo de sincronización de aprovisionamiento de gimnasios desde
admin-panel-j2ec (Decisión #10 de ese proyecto). Ver conversación del
2026-07-15 y docs/BACKEND_PREPARATION_AUDIT_GYM.md — el mecanismo de disparo
(endpoint manual vs. job programado) y la entrega de la contraseña inicial
al cliente real son decisiones pendientes, deliberadamente NO resueltas
aquí; esta función es el núcleo reusable sin importar qué termine
llamándola.

Por cada solicitud pendiente:
1. Crea el gym + su gym_admin en una única transacción de este lado.
2. Solo si eso se confirma con éxito, llama a consume() en admin-panel-j2ec.
3. Si falla la creación, NO se llama a consume() — la fila queda 'pending'
   y se reintenta en la siguiente sincronización.

Nota de payload (bloqueante conocido, 2026-07-15): el payload que hoy
escribe activation_service.py en admin-panel-j2ec-backend solo trae
`clientId, clientNumber, slug, businessType, accessPhone,
mustChangePassword` — NO incluye `businessName` ni un correo de acceso.
Sin esos dos campos no se puede crear un gym_admin funcional (User.email es
NOT NULL + único). En vez de inventar un nombre o correo falso, esas filas
se registran como "skipped" con el motivo exacto — no se consumen, y no se
crea una cuenta rota."""

import logging
import re
import secrets

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.integrations.admin_panel_client import (
    AdminPanelError,
    ProvisioningRequest,
    consume_request,
    list_pending_gym_requests,
)
from app.modules.gyms import repository as gyms_repo
from app.modules.gyms.models import Gym
from app.modules.users import repository as users_repo
from app.modules.users.models import Role, User

logger = logging.getLogger("app.provisioning")

_PREFIX_CHARS = re.compile(r"[^A-Z0-9]")


class ProvisioningPayloadError(Exception):
    """El payload de la solicitud no trae los campos mínimos para
    aprovisionar un gimnasio funcional."""


def _generate_temp_password() -> str:
    # Criptográficamente seguro (secrets, no random). Se retorna al caller
    # una sola vez y NUNCA se loguea — ver la nota sobre entrega al cliente
    # real en la conversación del 2026-07-15 (decisión de producto
    # pendiente: hoy no existe ningún mecanismo para comunicársela).
    return secrets.token_urlsafe(18)


def _derive_member_prefix(seed: str) -> str:
    # Valor técnico por defecto, no una decisión de negocio: Gym.member_prefix
    # es NOT NULL y hoy no hay ningún endpoint (ni siquiera /settings real,
    # ver QA_AUDIT_REPORT_GYM.md ALTA-01/02) para que el gimnasio lo edite
    # después. Se deriva determinísticamente del slug/nombre para que no
    # quede vacío, asumiendo que en una fase posterior se agregue esa
    # edición — no bloquea el aprovisionamiento por un campo puramente
    # decorativo de numeración interna.
    cleaned = _PREFIX_CHARS.sub("", seed.upper())
    return (cleaned[:3] or "GYM")


async def _provision_one(db: AsyncSession, req: ProvisioningRequest) -> tuple[Gym, User, str]:
    payload = req.payload
    business_name = payload.get("businessName") or payload.get("business_name")
    email = payload.get("email") or payload.get("specialistEmail") or payload.get("accessEmail")
    slug = payload.get("slug")

    missing = [
        name for name, value in (("businessName", business_name), ("email", email), ("slug", slug))
        if not value
    ]
    if missing:
        raise ProvisioningPayloadError(
            f"Solicitud {req.id} (client_id={req.client_id}): faltan campos {missing} en el "
            "payload — no se puede crear un gym_admin funcional sin ellos. Ver la nota de "
            "payload en app/integrations/provisioning_service.py."
        )

    existing_gym = await gyms_repo.get_by_slug(db, slug)
    if existing_gym is not None:
        # Recuperación de un intento previo que creó el gym pero falló antes
        # de poder llamar a consume() (ver sync_pending_gym_provisioning) —
        # no se duplica, se reutiliza el gym ya creado. El admin ya debería
        # existir también en ese caso (misma transacción del intento previo).
        existing_admin = await users_repo.get_by_email(db, email)
        if existing_admin is not None:
            return existing_gym, existing_admin, ""
        raise ProvisioningPayloadError(
            f"Solicitud {req.id}: ya existe un gym con slug='{slug}' pero sin el gym_admin "
            f"esperado (email={email}) — requiere revisión manual, no se reintenta solo."
        )

    gym = Gym(name=business_name, slug=slug, member_prefix=_derive_member_prefix(slug))
    gym = await gyms_repo.create(db, gym=gym)

    temp_password = _generate_temp_password()
    admin = User(
        email=email,
        password_hash=hash_password(temp_password),
        full_name=business_name,
        role=Role.GYM_ADMIN,
        gym_id=gym.id,
    )
    admin = await users_repo.create(db, user=admin)
    return gym, admin, temp_password


async def sync_pending_gym_provisioning(db: AsyncSession) -> dict:
    requests = await list_pending_gym_requests()

    provisioned: list[dict] = []
    skipped: list[dict] = []

    for req in requests:
        try:
            gym, admin, temp_password = await _provision_one(db, req)
            await db.commit()
        except ProvisioningPayloadError as exc:
            await db.rollback()
            logger.warning(str(exc))
            skipped.append({"request_id": str(req.id), "reason": str(exc)})
            continue
        except Exception:
            # Cualquier otro fallo (constraint inesperado, DB caída, etc.):
            # rollback y NO se consume — se reintenta en la siguiente
            # sincronización. Se loguea con traceback completo para poder
            # diagnosticar, pero nunca se loguea temp_password (no existe
            # todavía en este punto si la creación falló).
            await db.rollback()
            logger.exception("Fallo al aprovisionar gimnasio para request %s", req.id)
            continue

        try:
            await consume_request(req.id, note=f"gym_id={gym.id}")
        except AdminPanelError:
            # El gym+admin YA quedaron confirmados de este lado (db.commit()
            # ya corrió). Si consume() falla aquí, la fila se reintentará en
            # la siguiente sincronización y _provision_one la encontrará vía
            # get_by_slug (recuperación sin duplicar, ver arriba) — no hace
            # falta revertir nada.
            logger.exception(
                "gym %s (request %s) se creó pero no se pudo marcar consumido en admin-panel-j2ec",
                gym.id, req.id,
            )
            continue

        provisioned.append({
            "request_id": str(req.id),
            "gym_id": str(gym.id),
            "gym_admin_email": admin.email,
            # La contraseña temporal se expone SOLO en este resultado en
            # memoria, para que quien dispare la sincronización decida cómo
            # entregarla — nunca se loguea (ver decisión pendiente #4).
            "temp_password": temp_password,
        })

    return {
        "total_pending": len(requests),
        "provisioned": provisioned,
        "skipped": skipped,
    }
