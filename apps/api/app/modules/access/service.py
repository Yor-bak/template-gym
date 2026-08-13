import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError
from app.core.qr import InvalidQrTokenError, generate_qr_token, verify_qr_token
from app.modules.access import repository as access_repo
from app.modules.access.models import AccessLog
from app.modules.access.schemas import QrTokenRead
from app.modules.members import repository as members_repo
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


# Ventana durante la cual un segundo escaneo exitoso del mismo member se
# considera un reingreso accidental (doble tap del staff, QR leído dos veces
# por la cámara, etc.) en vez de una entrada nueva legítima. Suficiente para
# cubrir errores de operación en el mostrador sin bloquear a alguien que de
# verdad sale y vuelve a entrar más tarde en el día.
DUPLICATE_ENTRY_COOLDOWN = timedelta(minutes=5)


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
    tolerance_days = plan.tolerance_days if plan else 0

    if member.status == "blocked":
        result = "blocked"
    elif member.status == "temporary_access" and (
        member.temporary_access_until is None or member.temporary_access_until > datetime.now(timezone.utc)
    ):
        result = "temporary_access"
    elif member.expiration_date is None:
        result = "expired"
    else:
        days_left = (member.expiration_date - date.today()).days
        if days_left < -tolerance_days:
            result = "expired"
        elif days_left <= 5:
            result = "expiring_soon"
        else:
            result = "authorized"

    # Solo se avisa "ya ingresó" cuando el escaneo SÍ habría dado acceso de
    # nuevo (authorized/expiring_soon/temporary_access) — un member bloqueado
    # o vencido debe seguir viendo su motivo real de rechazo, nunca taparlo
    # con un aviso de reingreso.
    if result in ("authorized", "expiring_soon", "temporary_access"):
        last_granted = await access_repo.get_last_granted_log(db, member_id=member.id)
        if last_granted is not None:
            elapsed = datetime.now(timezone.utc) - last_granted.scanned_at
            if elapsed < DUPLICATE_ENTRY_COOLDOWN:
                result = "already_entered"

    log = AccessLog(gym_id=member.gym_id, member_id=member.id, result=result, reader=reader)
    log = await access_repo.create_log(db, log=log)

    # Mismo side-effect que validate_access() en Supabase: si se detecta
    # vencimiento/próximo a vencer y el miembro seguía "active", se persiste
    # — pero solo se recalcula al escanear, no hay job proactivo (documentado
    # como comportamiento heredado, no una mejora nueva de esta tarea).
    if result in ("expired", "expiring_soon") and member.status == "active":
        member.status = result

    await db.commit()
    return log
