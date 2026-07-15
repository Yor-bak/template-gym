import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LinkClientRequest(BaseModel):
    token: str


class TrainerClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    trainer_id: uuid.UUID
    client_id: uuid.UUID
    assigned_at: datetime


class TrainerClientMemberRead(BaseModel):
    """Vista mínima del miembro para la pantalla 'Mis clientes' del
    entrenador — no expone toda la ficha, solo lo necesario para la lista."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    phone: str
