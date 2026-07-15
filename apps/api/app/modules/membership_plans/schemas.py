import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DurationUnit = Literal["days", "weeks", "months", "years"]


class MembershipPlanCreate(BaseModel):
    name: str
    # CRIT-03 (DECISION_LOG_GYM.md, Bloque 3, decisión 6): rango válido
    # declarado en el propio schema, nunca un `if` disperso en el service.
    price: float = Field(gt=0)
    duration: int = Field(gt=0)
    duration_unit: DurationUnit
    tolerance_days: int = Field(ge=0, default=0)
    description: str | None = None


class MembershipPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    gym_id: uuid.UUID
    name: str
    price: float
    duration: int
    duration_unit: str
    tolerance_days: int
    description: str | None
    active: bool
