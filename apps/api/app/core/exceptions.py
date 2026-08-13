import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.errors")


class AppError(Exception):
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class UnauthorizedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED

    def __init__(self, message: str = "No autenticado"):
        super().__init__(message)


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN

    def __init__(self, message: str = "No tienes permiso para esta acción"):
        super().__init__(message)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND

    def __init__(self, message: str = "No encontrado"):
        super().__init__(message)


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message: str = "Conflicto con el estado actual"):
        super().__init__(message)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


# CRIT-02 (DECISION_LOG_GYM.md, Bloque 3, decisión 5): ningún endpoint debe
# devolver un 500 sin cuerpo JSON — un error no anticipado (bug, timeout de
# BD, etc.) debe seguir el mismo contrato {"detail": ...} que AppError, para
# que el frontend tenga siempre algo capturable en el `catch`. El detalle
# real queda en el log del servidor, nunca expuesto al cliente.
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error interno del servidor"},
    )


def register_exception_handlers(app) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
