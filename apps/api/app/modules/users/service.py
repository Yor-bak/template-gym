from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError
from app.core.security import hash_password
from app.modules.users import repository as users_repo
from app.modules.users.models import Role, User
from app.modules.users.schemas import UserCreate


async def create_staff_user(db: AsyncSession, payload: UserCreate, *, created_by: User) -> User:
    # Nunca se crea un cliente por esta vía: los clientes solo nacen del flujo
    # de activación (ver modules/activation/service.py), nunca de un alta
    # directa de staff — evita crear cuentas de cliente sin un `member` real.
    if payload.role == Role.CLIENT:
        raise ForbiddenError("Las cuentas de cliente se crean por activación, no aquí")

    if payload.role != Role.PLATFORM_ADMIN and payload.gym_id is None:
        raise ForbiddenError("gym_id es obligatorio para este rol")

    # Un admin de sucursal solo puede crear cuentas dentro de SU sucursal.
    if not created_by.role == Role.PLATFORM_ADMIN and payload.gym_id != created_by.gym_id:
        raise ForbiddenError("No puedes crear cuentas fuera de tu sucursal")

    existing = await users_repo.get_by_email(db, payload.email)
    if existing is not None:
        raise ConflictError("Ya existe una cuenta con ese correo")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        gym_id=payload.gym_id,
        phone=payload.phone,
    )
    user = await users_repo.create(db, user=user)
    await db.commit()
    return user
