from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_for_password_change
from app.auth.schemas import ChangePasswordRequest, LoginRequest, TokenResponse, UserPublic
from app.core.database import get_db
from app.core.exceptions import UnauthorizedError
from app.core.limiter import limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.users import repository as users_repo
from app.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    # payload.phone ya llega normalizado (LoginRequest.field_validator) —
    # login siempre funciona sin importar must_change_password, el gate vive
    # en get_current_user, no aquí.
    user = await users_repo.get_by_phone(db, payload.phone)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise UnauthorizedError("Teléfono o contraseña incorrectos")
    if not user.active:
        raise UnauthorizedError("Esta cuenta está desactivada")

    token = create_access_token(user_id=user.id, role=user.role.value, gym_id=user.gym_id)
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/change-password", response_model=UserPublic)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user_for_password_change),
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    if not verify_password(payload.current_password, user.password_hash):
        raise UnauthorizedError("Contraseña actual incorrecta")

    # No reemite el JWT: get_current_user relee must_change_password desde
    # BD en cada request, así que el mismo token ya emitido en /login pasa a
    # tener acceso normal apenas se hace este commit — no hace falta un
    # segundo login.
    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = False
    await db.commit()
    await db.refresh(user)
    return UserPublic.model_validate(user)
