import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.member_payments.models import MemberPayment


async def create(db: AsyncSession, *, payment: MemberPayment) -> MemberPayment:
    db.add(payment)
    await db.flush()
    await db.refresh(payment)
    return payment


async def list_for_member(db: AsyncSession, member_id: uuid.UUID) -> list[MemberPayment]:
    result = await db.execute(
        select(MemberPayment)
        .where(MemberPayment.member_id == member_id)
        .order_by(MemberPayment.paid_at.desc(), MemberPayment.created_at.desc())
    )
    return list(result.scalars().all())
