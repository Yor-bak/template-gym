import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.core.camel_model import CamelModel

PaymentMethod = Literal["cash", "card", "transfer", "other"]


class InventorySaleLineCreate(CamelModel):
    item_id: uuid.UUID
    quantity: int = Field(gt=0)


class InventorySaleCreate(CamelModel):
    # Sin gym_id en el body a propósito — no hay ningún caso legítimo de que
    # el staff de un gimnasio registre una venta en otro (a diferencia de
    # /users, aquí no existe la excepción de platform_admin). Es
    # estructuralmente imposible de spoofear, no solo validado en runtime.
    items: list[InventorySaleLineCreate] = Field(min_length=1)
    method: PaymentMethod
    member_id: uuid.UUID | None = None
    notes: str | None = None


class InventorySaleItemRead(CamelModel):
    id: uuid.UUID
    item_id: uuid.UUID
    quantity: int
    unit_price: float
    subtotal: float


class InventorySaleRead(CamelModel):
    id: uuid.UUID
    gym_id: uuid.UUID
    member_id: uuid.UUID | None
    subtotal: float
    total: float
    method: str
    status: str
    notes: str | None
    sold_at: datetime
    items: list[InventorySaleItemRead]
