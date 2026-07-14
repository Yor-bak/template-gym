from fastapi import Request, status
from fastapi.responses import JSONResponse


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


def register_exception_handlers(app) -> None:
    app.add_exception_handler(AppError, app_error_handler)
