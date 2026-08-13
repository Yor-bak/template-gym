import re


def normalize_phone(phone: str) -> str:
    """Normaliza a los últimos 10 dígitos, ignorando prefijo de país y
    cualquier carácter no numérico (espacios, guiones, +52, etc.).

    Decisión explícita (2026-07-17): distinto del normalize_phone de
    admin-panel-j2ec, que exige exactamente 10 dígitos y no soporta prefijo
    de país ni en el guardado ni en el login (bug latente allá). Aquí el
    login normaliza con la misma función que el guardado, así que un
    teléfono con o sin +52 siempre resuelve al mismo usuario.
    """
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 10:
        raise ValueError("El teléfono debe tener al menos 10 dígitos")
    return digits[-10:]
