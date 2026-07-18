import uuid

from pydantic import EmailStr, field_validator

from app.core.camel_model import CamelModel
from app.core.validators import normalize_phone
from app.modules.users.models import Role


class LoginRequest(CamelModel):
    phone: str
    password: str

    @field_validator("phone")
    @classmethod
    def _normalize_phone(cls, v: str) -> str:
        return normalize_phone(v)


class ChangePasswordRequest(CamelModel):
    current_password: str
    new_password: str


class UserPublic(CamelModel):
    id: uuid.UUID
    role: Role
    gym_id: uuid.UUID | None
    full_name: str
    phone: str
    email: EmailStr | None
    must_change_password: bool


class TokenResponse(CamelModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
