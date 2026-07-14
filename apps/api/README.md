# apps/api — Backend de Template-GYM

FastAPI + SQLAlchemy (async) + PostgreSQL. Ver el plan completo (fases, modelo de dominio, patrón de autorización) en las notas del equipo — este README es solo para correrlo en desarrollo.

## Desarrollo local

Requiere [uv](https://docs.astral.sh/uv/) y un Postgres accesible (local o remoto).

```
cd apps/api
cp .env.example .env      # llena DATABASE_URL, JWT_SECRET, etc.
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Docs interactivos: `http://localhost:8000/docs`.

## Tests

Los tests corren contra un Postgres real (no SQLite — ver por qué en el plan). Necesitas una base de datos de prueba aparte:

```
# TEST_DATABASE_URL apunta a una base separada, p. ej. "gym_test"
export TEST_DATABASE_URL=postgresql+asyncpg://gym:changeme@localhost:5432/gym_test
uv run pytest
```

## Primer admin (bootstrap)

`POST /gyms` y `POST /users` requieren estar autenticado como `platform_admin` — para crear el primero (sin que exista ninguno todavía), corre:

```
uv run python -m scripts.seed_first_admin
```

## Estructura

Por módulo/dominio bajo `app/modules/` (uno por entidad: `gyms`, `users`, `members`, etc.), cada uno con `models.py` (SQLAlchemy), `schemas.py` (Pydantic), `repository.py` (queries puras), `service.py` (reglas de negocio) y `router.py` (endpoints HTTP). La autenticación/autorización transversal vive en `app/auth/` (`AuthzService`, `require_role`, `get_current_user`).

## Migraciones

```
uv run alembic revision --autogenerate -m "descripción"
uv run alembic upgrade head
```
