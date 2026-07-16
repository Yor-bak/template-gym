from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.qr import InvalidQrTokenError, verify_qr_token
from app.modules.members import repository as members_repo
from app.modules.trainer_clients import repository as trainer_clients_repo
from app.modules.trainer_clients.models import TrainerClient
from app.modules.users.models import User

# Un solo mensaje genérico para "token corrupto/expirado" y "miembro de otro
# gimnasio" — nunca distinguir los dos casos en la respuesta, para que este
# endpoint no sirva de oráculo para probar si un member_id existe en un
# gimnasio ajeno al del entrenador que escanea.
_INVALID_LINK_MESSAGE = "El código escaneado no es válido o el miembro no pertenece a este gimnasio."


async def link_client(db: AsyncSession, *, token: str, trainer: User) -> TrainerClient:
    """Escaneado desde la app del entrenador — el único efecto es
    crear/reasignar la fila de trainer_clients. NUNCA crea un access_log ni
    cuenta como entrada al gimnasio — ver access/service.py:scan_access para
    el otro consumidor de este mismo mecanismo de token."""
    if trainer.gym_id is None:
        raise ForbiddenError()

    try:
        payload = verify_qr_token(token)
    except InvalidQrTokenError as exc:
        raise NotFoundError(_INVALID_LINK_MESSAGE) from exc

    if payload.subject_role != "client" or payload.gym_id != trainer.gym_id:
        raise NotFoundError(_INVALID_LINK_MESSAGE)

    member = await members_repo.get_by_id(db, payload.subject_id)
    if member is None or member.gym_id != trainer.gym_id:
        raise NotFoundError(_INVALID_LINK_MESSAGE)

    existing = await trainer_clients_repo.get_by_client_id(db, member.id)
    if existing is not None:
        existing.trainer_id = trainer.id
        existing.assigned_at = datetime.now(timezone.utc)
        link = existing
    else:
        link = TrainerClient(trainer_id=trainer.id, client_id=member.id)
        db.add(link)

    await db.commit()
    await db.refresh(link)
    return link
