import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthzService, get_authz, get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.member_payments import service as payments_service
from app.modules.member_payments.schemas import PaymentCreate, PaymentRead
from app.modules.members import repository as members_repo
from app.modules.users.models import ADMIN_ROLES, Role, User

router = APIRouter(tags=["payments"])


@router.post(
    "/members/{member_id}/payments",
    response_model=PaymentRead,
    status_code=201,
    dependencies=[Depends(require_role(*ADMIN_ROLES, Role.RECEPTIONIST))],
)
async def create_payment(
    member_id: uuid.UUID,
    payload: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentRead:
    if current_user.gym_id is None:
        raise ForbiddenError()
    member = await members_repo.get_by_id(db, member_id)
    if member is None:
        raise NotFoundError("Member no encontrado")
    if member.gym_id != current_user.gym_id:
        raise ForbiddenError()

    payment = await payments_service.register_payment(
        db, member=member, payload=payload, gym_id=current_user.gym_id, recorded_by=current_user.id
    )
    return PaymentRead.model_validate(payment)


@router.get("/members/{member_id}/payments", response_model=list[PaymentRead])
async def list_payments(
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz),
) -> list[PaymentRead]:
    member = await members_repo.get_by_id(db, member_id)
    if member is None:
        raise NotFoundError("Member no encontrado")
    await authz.assert_can_view_member(member)
    payments = await payments_service.list_for_member(db, member_id)
    return [PaymentRead.model_validate(p) for p in payments]
