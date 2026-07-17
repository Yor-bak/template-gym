from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import LoginRequest, TokenResponse, UserPublic
from app.core.database import get_db
from app.core.exceptions import UnauthorizedError
from app.core.limiter import limiter
from app.core.security import create_access_token, verify_password
from app.modules.users import repository as users_repo

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    user = await users_repo.get_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise UnauthorizedError("Correo o contraseña incorrectos")
    if not user.active:
        raise UnauthorizedError("Esta cuenta está desactivada")

    token = create_access_token(user_id=user.id, role=user.role.value, gym_id=user.gym_id)
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))
