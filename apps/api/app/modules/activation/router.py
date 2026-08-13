from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import UserPublic
from app.core.database import get_db
from app.modules.activation import service as activation_service
from app.modules.activation.schemas import (
    ActivateAccountRequest,
    ActivateAccountResponse,
    ActivationLookupResponse,
)

router = APIRouter(prefix="/activation", tags=["activation"])


@router.get("/lookup", response_model=ActivationLookupResponse)
async def lookup(code: str = Query(...), db: AsyncSession = Depends(get_db)) -> ActivationLookupResponse:
    return await activation_service.lookup_activation_code(db, code)


@router.post("/activate", response_model=ActivateAccountResponse, status_code=201)
async def activate(
    payload: ActivateAccountRequest, db: AsyncSession = Depends(get_db)
) -> ActivateAccountResponse:
    token, user = await activation_service.activate_account(db, payload)
    return ActivateAccountResponse(access_token=token, user=UserPublic.model_validate(user))
