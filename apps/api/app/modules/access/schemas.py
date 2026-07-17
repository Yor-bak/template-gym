import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class QrTokenRead(BaseModel):
    token: str
    # Segundos que el cliente debería esperar antes de pedir el siguiente
    # (mismo ritmo que rotate_my_access_code en el prototipo: cada ~20s).
    rotate_after_seconds: int = 20


class ScanRequest(BaseModel):
    token: str
    reader: str = "Entrada principal"


class AccessLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    gym_id: uuid.UUID
    member_id: uuid.UUID | None
    result: str
    reader: str
    scanned_at: datetime
