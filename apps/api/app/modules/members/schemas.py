import uuid
from datetime import date, datetime

from app.core.camel_model import CamelModel


class MemberCreate(CamelModel):
    first_name: str
    last_name: str
    phone: str
    email: str | None = None
    birth_date: date | None = None
    membership_plan_id: uuid.UUID | None = None
    emergency_contact: str | None = None
    emergency_phone: str | None = None
    notes: str | None = None


class MemberRead(CamelModel):
    id: uuid.UUID
    gym_id: uuid.UUID
    user_id: uuid.UUID | None
    member_number: str
    first_name: str
    last_name: str
    phone: str
    email: str | None
    status: str
    start_date: date | None
    expiration_date: date | None
    mobile_app_status: str
    activation_code: str | None
    created_at: datetime
