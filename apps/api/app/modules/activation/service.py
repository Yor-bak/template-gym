from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import create_access_token, hash_password
from app.modules.activation.schemas import ActivateAccountRequest, ActivationLookupResponse
from app.modules.gyms import repository as gyms_repo
from app.modules.members import repository as members_repo
from app.modules.users import repository as users_repo
from app.modules.users.models import Role, User


async def lookup_activation_code(db: AsyncSession, code: str) -> ActivationLookupResponse:
    member = await members_repo.get_by_activation_code(db, code.strip().upper())
    if member is None:
        raise NotFoundError("Código de activación inválido o ya utilizado")

    gym = await gyms_repo.get_by_id(db, member.gym_id)
    return ActivationLookupResponse(first_name=member.first_name, gym_name=gym.name)


async def activate_account(db: AsyncSession, payload: ActivateAccountRequest) -> tuple[str, User]:
    """Equivalente al trigger handle_new_user() del schema.sql: crea el `user`
    de rol client y linkea el `member` pendiente, en una sola transacción."""
    code = payload.code.strip().upper()

    async with db.begin():
        member = await members_repo.get_by_activation_code(db, code)
        if member is None:
            raise NotFoundError("Código de activación inválido o ya utilizado")

        existing = await users_repo.get_by_email(db, payload.email)
        if existing is not None:
            raise ConflictError("Ya existe una cuenta con ese correo")

        user = User(
            email=payload.email,
            password_hash=hash_password(payload.password),
            full_name=f"{member.first_name} {member.last_name}",
            role=Role.CLIENT,
            gym_id=member.gym_id,
            phone=member.phone,
        )
        db.add(user)
        await db.flush()

        member.user_id = user.id
        member.mobile_app_status = "activated"
        member.activation_code = None

    await db.refresh(user)
    token = create_access_token(user_id=user.id, role=user.role.value, gym_id=user.gym_id)
    return token, user
