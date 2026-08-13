import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.gyms import repository as gyms_repo
from app.modules.members import repository as members_repo
from app.modules.members.models import Member
from app.modules.members.schemas import MemberCreate


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
