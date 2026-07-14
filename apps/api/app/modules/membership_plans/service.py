import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.membership_plans import repository as plans_repo
from app.modules.membership_plans.models import MembershipPlan
from app.modules.membership_plans.schemas import MembershipPlanCreate


async def create_plan(db: AsyncSession, payload: MembershipPlanCreate, *, gym_id: uuid.UUID) -> MembershipPlan:
    plan = MembershipPlan(**payload.model_dump(), gym_id=gym_id)
    plan = await plans_repo.create(db, plan=plan)
    await db.commit()
    return plan
