import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.core.validators import normalize_phone
from app.modules.users.models import Role


class UserCreate(BaseModel):
    phone: str
    password: str
    full_name: str
    role: Role
    gym_id: uuid.UUID | None = None
    email: EmailStr | None = None

    @field_validator("phone")
    @classmethod
    def _normalize_phone(cls, v: str) -> str:
        return normalize_phone(v)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone: str
    email: EmailStr | None
    full_name: str
    role: Role
    gym_id: uuid.UUID | None
    active: bool
    must_change_password: bool
