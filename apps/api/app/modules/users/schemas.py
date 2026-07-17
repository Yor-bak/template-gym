import uuid

from pydantic import EmailStr

from app.core.camel_model import CamelModel
from app.modules.users.models import Role


class UserCreate(CamelModel):
    email: EmailStr
    password: str
    full_name: str
    role: Role
    gym_id: uuid.UUID | None = None
    phone: str | None = None


class UserRead(CamelModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: Role
    gym_id: uuid.UUID | None
    phone: str | None
    active: bool
