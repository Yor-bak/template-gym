import uuid
from datetime import datetime

from app.core.camel_model import CamelModel


class GymCreate(CamelModel):
    name: str
    slug: str
    member_prefix: str
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    timezone: str = "America/Mexico_City"
    currency: str = "MXN"


class GymRead(CamelModel):
    id: uuid.UUID
    name: str
    slug: str
    member_prefix: str
    address: str | None
    phone: str | None
    email: str | None
    timezone: str
    currency: str
    active: bool
    subscription_status: str
    created_at: datetime
