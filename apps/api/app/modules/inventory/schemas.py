import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.core.camel_model import CamelModel

InventoryArea = Literal["cardio", "fuerza", "peso_libre", "tienda"]
InventoryStatus = Literal["operating", "maintenance", "out_of_service"]


class InventoryItemCreate(CamelModel):
    area: InventoryArea
    name: str
    sku: str | None = None
    # CRIT-03 (DECISION_LOG_GYM.md, Bloque 3, decisión 6): rango válido
    # declarado en el propio schema, nunca un `if` disperso en el service.
    quantity: int = Field(ge=0)
    sale_price: float | None = Field(default=None, gt=0)
    status: InventoryStatus = "operating"


class InventoryItemRead(CamelModel):
    id: uuid.UUID
    gym_id: uuid.UUID
    area: str
    name: str
    sku: str | None
    quantity: int
    sale_price: float | None
    status: str
    created_at: datetime
