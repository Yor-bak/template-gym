import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError
from app.core.qr import InvalidQrTokenError, generate_qr_token, verify_qr_token
from app.modules.access import repository as access_repo
from app.modules.access.models import AccessLog
from app.modules.access.schemas import QrTokenRead
from app.modules.members import repository as members_repo
from app.modules.members.vigency import compute_effective_status
from app.modules.membership_plans import repository as plans_repo
from app.modules.users.models import Role, User


async def generate_my_qr_token(db: AsyncSession, *, current_user: User) -> QrTokenRead:
    if current_user.role != Role.CLIENT:
        raise ForbiddenError("Solo un cliente puede generar su propio QR de acceso")

    member = await members_repo.get_by_user_id(db, current_user.id)
    if member is None:
        raise ForbiddenError("Esta cuenta no está ligada a ningún miembro")

    token = generate_qr_token(subject_role="client", subject_id=member.id, gym_id=member.gym_id)
    return QrTokenRead(token=token)


async def _log_invalid(db: AsyncSession, *, gym_id: uuid.UUID, reader: str) -> AccessLog:
    log = AccessLog(gym_id=gym_id, member_id=None, result="invalid_token", reader=reader)
    log = await access_repo.create_log(db, log=log)
    await db.commit()
    return log


async def scan_access(db: AsyncSession, *, token: str, reader: str, scanning_staff: User) -> AccessLog:
    """Escaneado por recepción desde el dashboard — el único efecto es
    registrar un access_log (y, como side-effect, recalcular member.status si
    detecta vencimiento). NUNCA toca trainer_clients — ver
    trainer_clients/service.py:link_client para el otro consumidor de este
    mismo mecanismo de token."""
    if scanning_staff.gym_id is None:
        raise ForbiddenError("platform_admin no puede operar el escáner de una sucursal sin especificarla")

    try:
        payload = verify_qr_token(token)
    except InvalidQrTokenError:
        return await _log_invalid(db, gym_id=scanning_staff.gym_id, reader=reader)

    # El QR trae su propio gym_id firmado. Si no coincide con el del staff
    # que escanea, se trata igual que un token inválido — nunca se revela
    # si el member_id existe en otro gimnasio (evita usar este endpoint como
    # oráculo de existencia entre tenants).
    if payload.subject_role != "client" or payload.gym_id != scanning_staff.gym_id:
        return await _log_invalid(db, gym_id=scanning_staff.gym_id, reader=reader)

    member = await members_repo.get_by_id(db, payload.subject_id)
    if member is None or member.gym_id != scanning_staff.gym_id:
        return await _log_invalid(db, gym_id=scanning_staff.gym_id, reader=reader)

    plan = await plans_repo.get_by_id(db, member.membership_plan_id) if member.membership_plan_id else None

    # Misma función que alimenta GET /members y el registro de pagos
    # (app.modules.members.vigency) — antes esta lógica vivía solo aquí,
    # inline, así que un miembro sin escanear nunca reflejaba su vigencia
    # real en ningún otro lado (docs/BACKEND_PREPARATION_AUDIT_GYM.md).
    effective = compute_effective_status(member, plan)
    if effective == "active":
        result = "authorized"
    elif effective == "archived":
        # 'archived' no existe en el vocabulario de AccessLog.result (es un
        # estado administrativo, no de vigencia) — se trata como bloqueado
        # a efectos de control de acceso: un miembro archivado tampoco entra.
        result = "blocked"
    else:
        result = effective

    log = AccessLog(gym_id=member.gym_id, member_id=member.id, result=result, reader=reader)
    log = await access_repo.create_log(db, log=log)

    # Persiste la vigencia recién calculada (mismo criterio que
    # member_payments/service.py:register_payment) — nunca pisa un estado
    # administrativo (blocked/archived), que compute_effective_status ya
    # devuelve intacto.
    member.status = effective

    await db.commit()
    return log
