from fastapi import APIRouter, Depends

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthzService, get_authz, get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ForbiddenError
from app.modules.membership_plans import repository as plans_repo
from app.modules.membership_plans import service as plans_service
from app.modules.membership_plans.schemas import MembershipPlanCreate, MembershipPlanRead
from app.modules.users.models import Role, User

router = APIRouter(prefix="/membership-plans", tags=["membership_plans"])


@router.post(
    "",
    response_model=MembershipPlanRead,
    status_code=201,
    dependencies=[Depends(require_role(Role.ADMIN, Role.PLATFORM_ADMIN))],
)
async def create_membership_plan(
    payload: MembershipPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MembershipPlanRead:
    gym_id = current_user.gym_id
    if gym_id is None:
        raise ForbiddenError("platform_admin debe especificar la sucursal en otro endpoint")
    plan = await plans_service.create_plan(db, payload, gym_id=gym_id)
    return MembershipPlanRead.model_validate(plan)


@router.get("", response_model=list[MembershipPlanRead])
async def list_membership_plans(
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz),
) -> list[MembershipPlanRead]:
    gym_id = authz.gym_scope() or authz.user.gym_id
    if gym_id is None:
        raise ForbiddenError("platform_admin debe especificar la sucursal")
    plans = await plans_repo.list_for_gym(db, gym_id)
    return [MembershipPlanRead.model_validate(p) for p in plans]
