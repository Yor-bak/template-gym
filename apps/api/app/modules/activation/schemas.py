from pydantic import BaseModel, EmailStr

from app.auth.schemas import TokenResponse


class ActivationLookupResponse(BaseModel):
    first_name: str
    gym_name: str


class ActivateAccountRequest(BaseModel):
    code: str
    email: EmailStr
    password: str


ActivateAccountResponse = TokenResponse
