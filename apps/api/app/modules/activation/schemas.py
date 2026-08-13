from pydantic import EmailStr

from app.auth.schemas import TokenResponse
from app.core.camel_model import CamelModel


class ActivationLookupResponse(CamelModel):
    first_name: str
    gym_name: str


class ActivateAccountRequest(CamelModel):
    code: str
    email: EmailStr
    password: str


ActivateAccountResponse = TokenResponse
