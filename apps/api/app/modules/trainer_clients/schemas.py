import uuid
from datetime import datetime

from app.core.camel_model import CamelModel


class LinkClientRequest(CamelModel):
    token: str


class TrainerClientRead(CamelModel):
    id: uuid.UUID
    trainer_id: uuid.UUID
    client_id: uuid.UUID
    assigned_at: datetime


class TrainerClientMemberRead(CamelModel):
    """Vista mínima del miembro para la pantalla 'Mis clientes' del
    entrenador — no expone toda la ficha, solo lo necesario para la lista."""

    id: uuid.UUID
    first_name: str
    last_name: str
    phone: str


class MyTrainerRead(CamelModel):
    """Vista mínima del entrenador para la pantalla 'Mi entrenador' del
    cliente — el inverso de TrainerClientMemberRead."""

    id: uuid.UUID
    full_name: str
    phone: str
