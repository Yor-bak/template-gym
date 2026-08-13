import uuid
from datetime import date, datetime

from pydantic import Field

from app.core.camel_model import CamelModel


class PaymentCreate(CamelModel):
    amount: float = Field(gt=0)
    # Ninguno de los dos es obligatorio: paidAt default a hoy si se omite;
    # coversUntil es el override manual explícito que pidió el negocio — si
    # se manda, el backend lo usa tal cual en vez de calcularlo del plan.
    paid_at: date | None = None
    covers_until: date | None = None
    payment_method: str | None = None


class PaymentRead(CamelModel):
    id: uuid.UUID
    gym_id: uuid.UUID
    member_id: uuid.UUID
    amount: float
    paid_at: date
    covers_until: date
    payment_method: str | None
    recorded_by: uuid.UUID | None
    created_at: datetime
