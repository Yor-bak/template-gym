import uuid

from pydantic import BaseModel, ConfigDict


class MembershipPlanCreate(BaseModel):
    name: str
    price: float
    duration: int
    duration_unit: str
    tolerance_days: int = 0
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
