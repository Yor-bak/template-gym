import uuid

from pydantic import BaseModel, ConfigDict, EmailStr

from app.modules.users.models import Role


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Role
    gym_id: uuid.UUID | None = None
    phone: str | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: Role
    gym_id: uuid.UUID | None
    phone: str | None
    active: bool
