# Requerimientos y Stack Técnico — Backend template-gym

Fecha: 2026-07-16
Audiencia: equipo que construye el backend que sirve tanto al dashboard web (template-gym) como a la app móvil (miembros y entrenadores).

Este documento es el equivalente, para este proyecto, de lo que ya se hizo para `admin-panel-j2ec-backend` — mismo nivel de rigor, mismo stack, mismas convenciones de arquitectura ya probadas en producción.

---

## 1. Stack técnico (idéntico a admin-panel-j2ec-backend)

| Capa | Elección | Razón |
|---|---|---|
| Lenguaje / framework | **Python + FastAPI** | Consistencia con el resto de la plataforma J2EC |
| Modalidad | **Asíncrono** (`async def`) | Consistencia con admin-panel-j2ec-backend |
| Base de datos | **PostgreSQL, base separada** (ej. `gym_db`) | Aislamiento total respecto a `j2ec_admin` — nunca acceso SQL directo entre servicios (decisión #10 de admin-panel-j2ec) |
| ORM | **SQLAlchemy 2.0 (modo async)** | Soporta transacciones atómicas, `SELECT ... FOR UPDATE` si hace falta |
| Driver de BD | **asyncpg** | Estándar para SQLAlchemy 2.0 async + PostgreSQL |
| Validación de datos | **Pydantic v2** | Con `alias_generator` a camelCase para el JSON de la API (mismo patrón que admin-panel-j2ec) |
| Migraciones | **Alembic** (modo async) | Obligatorio desde el día 1, no opcional |
| Hashing de contraseñas | **passlib[bcrypt]** o **bcrypt** directo | Nunca texto plano ni hashing casero |
| JWT | **python-jose** o **pyjwt** | Token debe llevar solo el ID del usuario, nunca rol/permisos |
| Servidor ASGI | **uvicorn** + **gunicorn** en producción | Mismo patrón que admin-panel-j2ec |
| Contenedores | **Docker Compose**, un contenedor por servicio (backend, Postgres) | Mismo patrón — Postgres nunca expone puerto a internet |

---

## 2. Arquitectura de identidad — 3 tipos de usuario distintos

A diferencia de admin-panel-j2ec (un solo tipo de usuario administrativo), este backend debe modelar **tres identidades completamente distintas**, cada una con su propio flujo de autenticación:

### 2.1 Personal de dashboard (web)
- **Roles**: `gym_admin` (creado automáticamente al aprovisionar el gimnasio), `gym_admin_secondary` (máximo 1, creado por el admin principal), `receptionist` (máximo 3, creado por el admin principal).
- **Login**: teléfono/usuario + contraseña, igual que admin_users en admin-panel-j2ec.
- **Límites de negocio — deben aplicarse en el servidor, no solo en la UI**: un `gym_admin` no puede crear más de 1 admin secundario ni más de 3 recepcionistas. Validar esto en el endpoint de creación, con un `COUNT(*)` dentro de la misma transacción antes de insertar.

### 2.2 Miembros (app móvil)
- Se registran/existen como miembros de un gimnasio específico (multi-tenant — nunca visibles fuera de su gimnasio).
- Generan un **código QR rotativo cada 20 segundos** desde la app móvil.
- El QR se **escanea en el dashboard web** (no en la app), para registrar entrada.

### 2.3 Entrenadores (app móvil)
- Creados por el `gym_admin`/`gym_admin_secondary` desde el dashboard.
- También generan su propio QR de acceso (pendiente de implementar en el frontend — hay un popup faltante, documentarlo como tarea).
- **Flujo real de asignación de clientes**: el entrenador **escanea el QR del miembro** desde su propia app móvil — esto es lo que vincula a ese miembro con ese entrenador, NO una asignación manual desde el dashboard. (Si el frontend actual de template-gym tiene una UI de "asignar cliente a entrenador" manual, es un mock que contradice el flujo real — debe corregirse o eliminarse durante la auditoría de QA).
- Al escanear, el entrenador debe poder ver el histórico/perfil completo de ESE miembro específico (no de toda la base de datos del gimnasio — acotar el alcance real).

---

## 3. Multi-tenancy — aislamiento total, no un simple filtro

Confirmado explícitamente: el aislamiento entre gimnasios es **absoluto** — ningún gimnasio ve nunca datos de otro, ni agregados ni anónimos. Esto es más estricto que el filtro por `businessType` que usamos en admin-panel-j2ec (que era un permiso configurable) — aquí es un límite duro de tenant, sin excepción, ni siquiera para un rol "superadmin" dentro de este sistema.

**Implicación de diseño**: cada tabla con datos de negocio debe tener una columna `gym_id` (o el nombre que se decida) como parte de su clave de acceso, y **cada query** debe filtrar por el `gym_id` del usuario autenticado — sin excepción, sin endpoint que se salte este filtro. Recomendado: un middleware/dependencia de FastAPI que inyecte el `gym_id` del usuario autenticado automáticamente en cada request, para que sea estructuralmente difícil olvidarlo en un endpoint nuevo (aprendizaje directo de los 2 IDOR reales que encontramos en admin-panel-j2ec por olvidar este tipo de chequeo en acciones individuales).

**No hay ningún caso de excepción** — ni siquiera J2EC como superadmin necesita cruzar datos entre gimnasios en este sistema (esa relación comercial se administra por separado, desde admin-panel-j2ec, no desde aquí).

---

## 4. Aprovisionamiento — consumo de la cola ya construida

Este backend es el **consumidor** del mecanismo ya diseñado en `admin-panel-j2ec` (decisión #10, ver `docs/DECISION_LOG_addendum_10.md`):

- Cuando admin-panel-j2ec activa un cliente de tipo `gym`, deja una fila en su tabla `client_provisioning_requests` con `target_system = 'gym'`.
- Este backend debe implementar un proceso (puede ser un endpoint manual disparado, o un job periódico) que:
  1. Llama `GET https://api-admin.j2ec-nodes.com/internal/provisioning-requests?target_system=gym&status=pending` (autenticado con `X-Service-Key`, no JWT humano).
  2. Por cada fila recibida, crea el `gym_admin` correspondiente en `gym_db`, usando los datos del `payload` JSONB (slug, datos de contacto, etc.).
  3. Confirma el consumo: `POST https://api-admin.j2ec-nodes.com/internal/provisioning-requests/{id}/consume`.

**No hay acceso SQL directo entre `j2ec_admin` y `gym_db` en ningún caso** — toda comunicación pasa por esta API.

---

## 5. Código QR rotativo — consideraciones de diseño

La lógica de generación y validación vive en **este backend** (confirmado). Recomendaciones de diseño, a decidir/afinar con el equipo antes de implementar:

- **Token firmado, no un ID de base de datos**: usar HMAC (con una clave secreta del servidor) sobre `{member_id, gym_id, timestamp_window}`, para que el QR sea auto-verificable sin necesitar una consulta a BD por cada rotación generada — solo se consulta BD al momento de escanear/validar.
- **Ventana de validez**: el token debe aceptar una ventana de tiempo pequeña (ej. ±20-30 segundos) para tolerar desfase de reloj entre el móvil y el servidor, sin abrir una ventana de replay demasiado amplia.
- **Nunca reutilizable tras escaneo exitoso**: aunque el token expire solo por tiempo, considerar invalidar explícitamente un token ya usado para entrada, para prevenir que alguien reproduzca el mismo QR (screenshot) dentro de la ventana de validez.
- **El QR debe poder identificar el gimnasio** sin ambigüedad — el `gym_id` debe ir codificado (firmado) dentro del propio token, nunca inferido de otra forma.

---

## 6. Convenciones heredadas de admin-panel-j2ec (no renegociables)

- **CamelCase en el JSON de la API**, snake_case en el código Python interno (mismo patrón de `CamelModel`).
- **Ningún campo calculado server-side aceptado en el body de un request.**
- **Nunca confiar en rol/tenant que venga del cliente** — el JWT solo lleva el ID del usuario; rol, gimnasio, y permisos se resuelven consultando la BD en cada request.
- **`CONTRIBUTING.md` desde el día 1**: ningún cambio se edita directo en el servidor de producción — todo pasa por commit local → push → `git pull` en el servidor.
- **`docs/PORTS.md`** (el archivo compartido a nivel de todo J2EC) debe actualizarse con el puerto asignado a este nuevo backend antes de desplegarlo, para no repetir el incidente de conflicto de puertos que ya tuvimos.
- **Nunca reutilizar contraseñas/secretos de otros entornos** — generar credenciales nuevas y propias para este servicio.

---

## 7. Próximos pasos recomendados (mismo orden que admin-panel-j2ec)

1. Auditoría de QA del frontend `template-gym` tal como existe hoy (mock/mercado actual) — encontrar bugs funcionales y, específicamente, confirmar/corregir el mock de "asignar cliente a entrenador" que contradice el flujo real de escaneo QR.
2. Documento de decisiones de diseño (equivalente a `DECISION_LOG.md`) — cubriendo específicamente: modelo de roles y límites, diseño del token QR, estrategia de aislamiento multi-tenant, y el mecanismo exacto de consumo de aprovisionamiento.
3. Esquema de base de datos (`SCHEMA_PROPUESTO.md` equivalente).
4. Contrato de API (`API_PROPUESTA.md` equivalente) — incluyendo los endpoints que consumirá la app móvil (generación/validación de QR, registro de entrenador, etc.), no solo los del dashboard web.
5. Implementación por fases, con tests y verificación end-to-end en cada paso, igual que se hizo en admin-panel-j2ec-backend.
