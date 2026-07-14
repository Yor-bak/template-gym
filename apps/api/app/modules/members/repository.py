import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.members.models import Member


async def get_by_id(db: AsyncSession, member_id: uuid.UUID) -> Member | None:
    return await db.get(Member, member_id)


async def get_by_user_id(db: AsyncSession, user_id: uuid.UUID) -> Member | None:
    result = await db.execute(select(Member).where(Member.user_id == user_id))
    return result.scalar_one_or_none()


async def get_by_activation_code(db: AsyncSession, code: str) -> Member | None:
    result = await db.execute(
        select(Member).where(Member.activation_code == code, Member.user_id.is_(None))
    )
    return result.scalar_one_or_none()


async def list_for_gym(db: AsyncSession, gym_id: uuid.UUID) -> list[Member]:
    result = await db.execute(
        select(Member).where(Member.gym_id == gym_id).order_by(Member.created_at.desc())
    )
    return list(result.scalars().all())


async def next_member_number(db: AsyncSession, gym_id: uuid.UUID, prefix: str) -> str:
    count = await db.scalar(select(func.count()).select_from(Member).where(Member.gym_id == gym_id))
    return f"{prefix}-{(count or 0) + 1:05d}"


async def create(db: AsyncSession, *, member: Member) -> Member:
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return member
