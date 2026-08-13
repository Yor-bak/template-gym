import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dates import add_duration
from app.modules.member_payments import repository as payments_repo
from app.modules.member_payments.models import MemberPayment
from app.modules.member_payments.schemas import PaymentCreate
from app.modules.members.models import Member
from app.modules.members.vigency import compute_effective_status
from app.modules.membership_plans import repository as plans_repo

# Cobertura por defecto cuando el miembro no tiene membership_plan_id
# asignado — caso real (alta rápida sin plan todavía), no un error. 30 días
# es el mismo período que usa un plan "Mensual" típico en los seeds/tests
# existentes; confirmar con negocio si debe ser configurable por gym.
DEFAULT_COVERAGE_DAYS = 30


async def register_payment(
    db: AsyncSession,
    *,
    member: Member,
    payload: PaymentCreate,
    gym_id: uuid.UUID,
    recorded_by: uuid.UUID,
) -> MemberPayment:
    paid_at = payload.paid_at or date.today()
    plan = await plans_repo.get_by_id(db, member.membership_plan_id) if member.membership_plan_id else None

    if payload.covers_until is not None:
        covers_until = payload.covers_until
    else:
        # Si el miembro todavía no vence, el pago se apila desde su fecha de
        # vencimiento actual (pagar antes de tiempo no recorta días ya
        # pagados). Si ya venció, o es su primer pago, arranca desde la
        # fecha del pago.
        base = member.expiration_date if member.expiration_date and member.expiration_date > paid_at else paid_at
        if plan is not None:
            covers_until = add_duration(base, plan.duration, plan.duration_unit)
        else:
            covers_until = add_duration(base, DEFAULT_COVERAGE_DAYS, "days")

    payment = MemberPayment(
        gym_id=gym_id,
        member_id=member.id,
        amount=payload.amount,
        paid_at=paid_at,
        covers_until=covers_until,
        payment_method=payload.payment_method,
        recorded_by=recorded_by,
    )
    payment = await payments_repo.create(db, payment=payment)

    # Misma transacción que el insert del pago (ALTA-08 /
    # docs/BACKEND_PREPARATION_AUDIT_GYM.md §3.5): la vigencia nunca se
    # fuerza a 'active' sin comparar la fecha real contra hoy, y nunca es una
    # segunda llamada aparte del cliente que pueda fallar dejando el pago
    # huérfano sin que se actualice la fecha de vencimiento.
    member.expiration_date = covers_until
    member.last_payment_date = paid_at
    member.status = compute_effective_status(member, plan, today=date.today())

    await db.commit()
    await db.refresh(payment)
    return payment


async def list_for_member(db: AsyncSession, member_id: uuid.UUID) -> list[MemberPayment]:
    return await payments_repo.list_for_member(db, member_id)
