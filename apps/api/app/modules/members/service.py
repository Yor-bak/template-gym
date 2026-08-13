import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.gyms import repository as gyms_repo
from app.modules.members import repository as members_repo
from app.modules.members.models import Member
from app.modules.members.schemas import MemberCreate, MemberRead
from app.modules.members.vigency import compute_effective_status
from app.modules.membership_plans import repository as plans_repo
from app.modules.membership_plans.models import MembershipPlan


async def create_member(db: AsyncSession, payload: MemberCreate, *, gym_id: uuid.UUID, created_by: uuid.UUID) -> Member:
    gym = await gyms_repo.get_by_id(db, gym_id)
    member_number = await members_repo.next_member_number(db, gym_id, gym.member_prefix)

    member = Member(
        gym_id=gym_id,
        member_number=member_number,
        created_by=created_by,
        **payload.model_dump(),
    )
    member = await members_repo.create(db, member=member)
    await db.commit()
    return member


async def list_for_gym(db: AsyncSession, gym_id: uuid.UUID) -> list[Member]:
    return await members_repo.list_for_gym(db, gym_id)


def to_member_read(member: Member, plan: MembershipPlan | None) -> MemberRead:
    """Serializa un Member calculando su vigencia en vivo (vigency.py) en vez
    de confiar en la columna `status` cruda, que solo se actualiza como
    side-effect de un escaneo — ver docs/BACKEND_PREPARATION_AUDIT_GYM.md."""
    read = MemberRead.model_validate(member)
    return read.model_copy(update={"status": compute_effective_status(member, plan)})


async def to_member_reads_for_gym(db: AsyncSession, members: list[Member], *, gym_id: uuid.UUID) -> list[MemberRead]:
    plans = await plans_repo.list_for_gym(db, gym_id)
    plans_by_id = {plan.id: plan for plan in plans}
    return [to_member_read(m, plans_by_id.get(m.membership_plan_id)) for m in members]
