import uuid

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.modules.members.models import Member
from app.modules.users import repository as users_repo
from app.modules.users.models import STAFF_ROLES, Role, User

# tokenUrl es solo informativo para los docs de /docs; el login real vive en
# app/modules/... /router.py (POST /auth/login) montado en main.py.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if token is None:
        raise UnauthorizedError()

    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise UnauthorizedError(str(exc)) from exc

    user = await users_repo.get_by_id(db, uuid.UUID(payload["sub"]))
    if user is None or not user.active:
        raise UnauthorizedError("Cuenta inválida o desactivada")
    return user


def require_role(*roles: Role):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise ForbiddenError()
        return user

    return checker


class AuthzService:
    """Equivalente Python de my_role()/my_gym_id()/... de las RLS de Postgres.
    Un método por regla de negocio de autorización — ver supabase/schema.sql
    (sección RLS) para la regla original que cada método reemplaza."""

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db

    def is_platform_admin(self) -> bool:
        return self.user.role == Role.PLATFORM_ADMIN

    def is_staff(self) -> bool:
        return self.user.role in STAFF_ROLES

    def gym_scope(self) -> uuid.UUID | None:
        """None = sin restricción (solo platform_admin); si no, el gym_id obligatorio."""
        return None if self.is_platform_admin() else self.user.gym_id

    async def assert_can_view_member(self, member: Member) -> None:
        if self.user.role == Role.CLIENT:
            if member.user_id != self.user.id:
                raise ForbiddenError()
        elif self.user.role == Role.TRAINER:
            # trainer_clients llega en una fase posterior — hasta entonces un
            # entrenador no tiene ningún member asignado que pueda ver.
            raise ForbiddenError()
        elif self.is_staff():
            if not self.is_platform_admin() and member.gym_id != self.user.gym_id:
                raise ForbiddenError()
        else:
            raise ForbiddenError()

    def assert_can_write_member(self) -> None:
        if self.user.role not in (Role.ADMIN, Role.RECEPTIONIST):
            raise ForbiddenError()


def get_authz(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AuthzService:
    return AuthzService(user, db)
