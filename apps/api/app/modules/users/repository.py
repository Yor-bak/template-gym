import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import Role, User


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_by_phone(db: AsyncSession, phone: str) -> User | None:
    """phone debe llegar ya normalizado — ver app/core/validators.py."""
    result = await db.execute(select(User).where(User.phone == phone))
    return result.scalar_one_or_none()


async def count_active_by_gym_and_role(db: AsyncSession, *, gym_id: uuid.UUID, role: Role) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(User)
        .where(User.gym_id == gym_id, User.role == role, User.active.is_(True))
    )
    return result.scalar_one()


async def create(db: AsyncSession, *, user: User) -> User:
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user
