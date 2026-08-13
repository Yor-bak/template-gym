import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.membership_plans.models import MembershipPlan


async def get_by_id(db: AsyncSession, plan_id: uuid.UUID) -> MembershipPlan | None:
    return await db.get(MembershipPlan, plan_id)


async def list_for_gym(db: AsyncSession, gym_id: uuid.UUID) -> list[MembershipPlan]:
    result = await db.execute(select(MembershipPlan).where(MembershipPlan.gym_id == gym_id))
    return list(result.scalars().all())


async def create(db: AsyncSession, *, plan: MembershipPlan) -> MembershipPlan:
    db.add(plan)
    await db.flush()
    await db.refresh(plan)
    return plan
