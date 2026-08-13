"""Token de QR de acceso: firmado con HMAC, autoverificable (sin round-trip a
BD para confirmar autenticidad), con ventana de validez corta (20-30s) y sin
invalidación de un solo uso — trade-off de seguridad aceptado explícitamente
en DECISION_LOG_GYM.md, Bloque 2, decisión 4.

Un solo mecanismo de generación/verificación, reutilizado por DOS flujos con
efectos distintos:
  - Entrada al gimnasio: app/modules/access/service.py (POST /access/scan,
    lo escanea recepción desde el dashboard) — crea un access_log.
  - Vinculación entrenador-cliente: app/modules/trainer_clients/service.py
    (POST /trainer/link-client, lo escanea el entrenador desde su propia
    app) — crea/actualiza una fila de trainer_clients.
Son dos endpoints y dos efectos secundarios completamente distintos; lo único
compartido es este módulo de firma/verificación del token.
"""

import base64
import hashlib
import hmac
import time
import uuid
from dataclasses import dataclass

from app.config import get_settings

settings = get_settings()

# 20-30s de ventana de validez (DECISION_LOG_GYM.md, Bloque 2, decisión 4):
# el cliente/entrenador vuelve a pedir un token nuevo cada 20s mientras la
# pantalla del QR está abierta; el servidor acepta hasta 30s de antigüedad
# para tolerar latencia de red entre generar el QR y que alguien lo escanee.
MAX_TOKEN_AGE_SECONDS = 30
# Tolerancia de reloj: nunca se debe aceptar un token "emitido en el futuro"
# más allá de un pequeño margen de desfase entre relojes de servidor/cliente.
CLOCK_SKEW_TOLERANCE_SECONDS = 5


class InvalidQrTokenError(ValueError):
    pass


@dataclass(frozen=True)
class QrTokenPayload:
    subject_role: str  # 'client' (miembro) — el único emisor válido hoy.
    subject_id: uuid.UUID  # member.id
    gym_id: uuid.UUID
    issued_at: int  # epoch seconds


def _sign(payload: str) -> str:
    return hmac.new(settings.qr_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def generate_qr_token(*, subject_role: str, subject_id: uuid.UUID, gym_id: uuid.UUID) -> str:
    """Genera un token nuevo. Se llama server-side en cada rotación (cada
    ~20s desde la app) — el cliente nunca puede firmar uno por su cuenta."""
    issued_at = int(time.time())
    payload = f"{subject_role}:{subject_id}:{gym_id}:{issued_at}"
    signature = _sign(payload)
    raw = f"{payload}:{signature}"
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8")


def verify_qr_token(token: str, *, max_age_seconds: int = MAX_TOKEN_AGE_SECONDS) -> QrTokenPayload:
    """Verifica firma + ventana de tiempo. No consulta la base de datos —
    eso lo hace cada caller (access/service.py, trainer_clients/service.py)
    con el subject_id ya confiable que devuelve esta función."""
    try:
        raw = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        subject_role, subject_id_str, gym_id_str, issued_at_str, signature = raw.split(":")
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidQrTokenError("Formato de token inválido") from exc

    payload = f"{subject_role}:{subject_id_str}:{gym_id_str}:{issued_at_str}"
    expected_signature = _sign(payload)
    if not hmac.compare_digest(signature, expected_signature):
        raise InvalidQrTokenError("Firma inválida")

    issued_at = int(issued_at_str)
    now = int(time.time())
    if issued_at > now + CLOCK_SKEW_TOLERANCE_SECONDS:
        raise InvalidQrTokenError("Token emitido en el futuro")
    if now - issued_at > max_age_seconds:
        raise InvalidQrTokenError("Token expirado")

    try:
        subject_id = uuid.UUID(subject_id_str)
        gym_id = uuid.UUID(gym_id_str)
    except ValueError as exc:
        raise InvalidQrTokenError("IDs de token inválidos") from exc

    return QrTokenPayload(subject_role=subject_role, subject_id=subject_id, gym_id=gym_id, issued_at=issued_at)
