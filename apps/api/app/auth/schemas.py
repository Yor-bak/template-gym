import uuid

from pydantic import EmailStr

from app.core.camel_model import CamelModel
from app.modules.users.models import Role


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class UserPublic(CamelModel):
    id: uuid.UUID
    role: Role
    gym_id: uuid.UUID | None
    full_name: str
    email: EmailStr


class TokenResponse(CamelModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
