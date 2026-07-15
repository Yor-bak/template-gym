from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_expiry_min: int = 1440
    # Secreto separado del de sesión (jwt_secret) a propósito: el QR de acceso
    # se firma y valida con mucha más frecuencia (cada 20-30s) y por actores
    # distintos (recepción, entrenador) — poder rotarlo sin invalidar todas
    # las sesiones activas (y viceversa) es la razón de mantenerlos separados.
    qr_secret: str
    cors_origins: str = ""
    env: str = "development"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
