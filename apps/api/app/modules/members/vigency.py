from datetime import date, datetime, timezone

from app.modules.members.models import Member
from app.modules.membership_plans.models import MembershipPlan

# Estados administrativos: los pone/quita el staff explícitamente y nunca
# deben perderse por un recálculo automático de vigencia (un pago no
# desbloquea a alguien bloqueado, ni desarchiva a alguien archivado).
OVERRIDE_STATUSES = frozenset({"blocked", "archived"})


def compute_effective_status(
    member: Member,
    plan: MembershipPlan | None,
    *,
    today: date | None = None,
    now: datetime | None = None,
) -> str:
    """Única fuente de verdad para "¿está vigente este miembro ahora mismo?"
    — usada al leer un miembro (MemberRead), al registrar un pago
    (member_payments/service.py) y al escanear su QR en control de acceso
    (access/service.py). Antes esta lógica vivía duplicada e inline solo
    dentro de scan_access, por lo que un miembro sin escanear nunca reflejaba
    su vigencia real en el listado — ver docs/BACKEND_PREPARATION_AUDIT_GYM.md.

    Mismos umbrales que la lógica original de scan_access: no cambia
    comportamiento existente, solo lo centraliza.
    """
    today = today or date.today()
    now = now or datetime.now(timezone.utc)

    if member.status in OVERRIDE_STATUSES:
        return member.status

    if member.status == "temporary_access" and (
        member.temporary_access_until is None or member.temporary_access_until > now
    ):
        return "temporary_access"

    if member.expiration_date is None:
        return "expired"

    tolerance_days = plan.tolerance_days if plan else 0
    days_left = (member.expiration_date - today).days
    if days_left < -tolerance_days:
        return "expired"
    if days_left <= 5:
        return "expiring_soon"
    return "active"
