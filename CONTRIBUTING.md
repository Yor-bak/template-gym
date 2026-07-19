# Contribuir a Template-GYM

Convenciones heredadas de `admin-panel-j2ec` (mismo nivel de rigor en todos los proyectos de J2EC) — no renegociables sin discutirlo primero con el equipo.

## Flujo de cambios en el backend (`apps/api`, `infra/`)

**Ningún cambio se edita directo en el servidor de producción.** El flujo siempre es:

1. Commit local.
2. Push a la rama correspondiente.
3. `git pull` en el servidor.
4. `docker compose up -d --build` (aplica migraciones nuevas solo, ver [`infra/README.md`](infra/README.md#9-actualizar-el-backend-con-cambios-nuevos-nunca-editar-en-el-servidor)).

Si necesitas un fix urgente en producción: haz el cambio local, pruébalo, y sigue el mismo flujo — no hay atajo de "lo edito rápido por SSH y ya subo el commit después". Eso es exactamente cómo el código en el servidor y el repo se desincronizan sin que nadie se dé cuenta.

## Migraciones (Alembic)

Toda migración se genera y se prueba en local antes de subirse:

```
cd apps/api
uv run alembic revision --autogenerate -m "descripción corta"
uv run alembic upgrade head   # pruébala contra tu Postgres local antes de commitear
```

Nunca se edita una migración ya mergeada a la rama principal — si algo salió mal, se agrega una migración nueva que corrige, igual que en cualquier proyecto con Alembic/Django/Rails.

## Convenciones del backend (no negociables)

- **CamelCase en el JSON de la API, snake_case en el código Python interno** — todo schema Pydantic nuevo hereda de `app.core.camel_model.CamelModel`, nunca de `pydantic.BaseModel` directo.
- **Ningún campo calculado server-side aceptado en el body de un request** (`gymId`, `id`, `createdAt`, totales, etc. — el servidor los calcula/deriva, nunca confía en lo que mande el cliente).
- **`gym_id` siempre derivado del usuario autenticado** (`AuthzService.gym_scope()` en `app/auth/dependencies.py`) — nunca leído de un campo del body salvo que el caller sea `platform_admin` administrando explícitamente otra sucursal. Ver `docs/DECISION_LOG_GYM.md`, Bloque 1, decisión 2.
- **El JWT solo lleva el `id` del usuario** — rol, gimnasio y permisos se resuelven consultando la base de datos en cada request, nunca se confía en un claim del token para eso.
- **Todo error de negocio esperable** (límite alcanzado, dato duplicado, validación fallida) **usa las excepciones de `app/core/exceptions.py`** (`ConflictError`, `NotFoundError`, etc.) — nunca un 500 genérico ni un `raise Exception("...")` suelto.
- **Todo campo numérico de negocio declara su rango válido en el propio schema Pydantic** (`Field(gt=0)`, `Field(ge=0)`, etc.), no en un `if` disperso dentro de un `service.py`.
- **Nunca reutilizar contraseñas/secretos de otros entornos** — cada `.env` (local, staging, producción) tiene sus propios valores generados independientemente. Nunca copiar un `.env` de un entorno a otro.

## Puertos

Antes de desplegar o exponer un puerto nuevo, revisa y actualiza [`docs/PORTS.md`](docs/PORTS.md) — el servidor puede compartir host con otros proyectos del equipo (ya tuvimos un conflicto real de puertos por no hacer esto).

## Tests

Los tests del backend corren contra un Postgres real, no SQLite (el esquema usa índices únicos parciales y `CHECK` constraints que SQLite no replica fielmente — probar ahí daría falsos positivos justo en las reglas más delicadas). Ver [`apps/api/README.md`](apps/api/README.md#tests).

Ningún PR/cambio a `apps/api` se sube sin correr `uv run pytest` en verde localmente primero.
