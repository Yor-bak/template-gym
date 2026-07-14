import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthzService, get_authz, get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.members import repository as members_repo
from app.modules.members import service as members_service
from app.modules.members.schemas import MemberCreate, MemberRead
from app.modules.users.models import Role, User

router = APIRouter(prefix="/members", tags=["members"])


@router.post(
    "",
    response_model=MemberRead,
    status_code=201,
    dependencies=[Depends(require_role(Role.ADMIN, Role.RECEPTIONIST))],
)
async def create_member(
    payload: MemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MemberRead:
    if current_user.gym_id is None:
        raise ForbiddenError()
    member = await members_service.create_member(
        db, payload, gym_id=current_user.gym_id, created_by=current_user.id
    )
    return MemberRead.model_validate(member)


@router.get("", response_model=list[MemberRead])
async def list_members(
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz),
) -> list[MemberRead]:
    user = authz.user

    if user.role == Role.CLIENT:
        member = await members_repo.get_by_user_id(db, user.id)
        return [MemberRead.model_validate(member)] if member else []

    if user.role == Role.TRAINER:
        # trainer_clients llega en una fase posterior.
        return []

    if authz.is_staff():
        gym_id = authz.gym_scope()
        if gym_id is None:
            raise ForbiddenError("platform_admin debe especificar la sucursal")
        members = await members_service.list_for_gym(db, gym_id)
        return [MemberRead.model_validate(m) for m in members]

    raise ForbiddenError()


@router.get("/{member_id}", response_model=MemberRead)
async def get_member(
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz),
) -> MemberRead:
    member = await members_repo.get_by_id(db, member_id)
    if member is None:
        raise NotFoundError("Member no encontrado")
    await authz.assert_can_view_member(member)
    return MemberRead.model_validate(member)
