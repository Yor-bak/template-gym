# Decision Log — template-gym, pre-backend

Fecha: 2026-07-15
Basado en: `docs/QA_AUDIT_REPORT_GYM.md` (3 críticos, 11 altos, 8 medios, 9 bajos + 2 hallazgos de diseño) + `docs/BACKEND_PREPARATION_AUDIT_GYM.md` (arquitectura, reglas duplicadas, entidades, veredicto de `apps/api`).

Este documento resuelve el modelo de roles, el flujo de vinculación entrenador-cliente, el mecanismo de QR de acceso, y los 3 hallazgos críticos de la auditoría de QA — es la fuente de verdad para diseñar la API y el esquema del backend real (FastAPI + PostgreSQL + SQLAlchemy async), evitando que el backend reimplemente las mismas inconsistencias que hoy existen entre el frontend y el prototipo Supabase.

**Convención de estado de cada decisión**:
- **CONFIRMADA** — ya decidida por el usuario, se documenta tal cual, sin margen de reinterpretación.
- **PROPUESTA, PENDIENTE DE CONFIRMACIÓN** — este documento propone una opción concreta siguiendo el mismo criterio ya aplicado en `admin-panel-j2ec` (nunca confiar en el cliente, fuente única de verdad, server-side enforcement), pero no se da por definitiva hasta que el usuario la confirme.

---

## Bloque 1 — Roles y aislamiento multi-tenant

### 1. Modelo de roles de staff → `gym_admin` + `gym_admin_secondary` (máx. 1) + `receptionist` (máx. 2)

**Estado: CONFIRMADA.**

**Decisión**: el límite real de cuentas de staff por gimnasio es **1 `gym_admin_secondary` + 2 `receptionist`** (además del `gym_admin` principal) — no el 1+1 actual del prototipo, ni el 1+3 de la primera versión de `REQUERIMIENTOS_BACKEND_GYM.md §2.1`. Este documento reemplaza esa cifra.

**Implicación**: el enum de roles del backend real debe incluir explícitamente `gym_admin`, `gym_admin_secondary`, `receptionist` (y, aparte, `client`/`trainer`/`platform_admin`, que no cambian). El límite se valida con `COUNT(*)` dentro de la misma transacción de alta, replicando el patrón ya usado en `admin-panel-j2ec-backend`: nunca confiar en que el frontend ya deshabilitó la opción en el `<select>` (hoy `apps/web/app/staff/page.tsx` sí lo hace correctamente para la UI, pero eso no es suficiente — ver Bloque 3, decisión 4).

**Afecta**: tabla `users`/`profiles`, endpoint de alta de staff (reemplaza a `apps/web/app/api/staff/route.ts`), `apps/api/app/modules/users/models.py` (`Role` enum, hoy sin `gym_admin_secondary` — ver Bloque 5).

---

### 2. Corrección estructural de CRIT-01 → `gym_id` siempre derivado del usuario autenticado, nunca aceptado del body

**Estado: PROPUESTA, PENDIENTE DE CONFIRMACIÓN.**

**Contexto**: `CRIT-01` (`docs/QA_AUDIT_REPORT_GYM.md`) es un IDOR de tenant real: `apps/web/app/api/staff/route.ts:66` acepta un `gymId` del body del request sin verificar que el caller (`admin`, no `platform_admin`) tenga permiso sobre ese gimnasio. Es exactamente el tipo de error que `REQUERIMIENTOS_BACKEND_GYM.md §3` ya identificó como riesgo recurrente ("2 IDOR reales en admin-panel-j2ec por olvidar este chequeo").

**Propuesta**: adoptar tal cual el patrón ya implementado (y ya correcto) en `apps/api/app/auth/dependencies.py` — la clase `AuthzService` con su método `gym_scope()`:
```python
def gym_scope(self) -> uuid.UUID | None:
    """None = sin restricción (solo platform_admin); si no, el gym_id obligatorio."""
    return None if self.is_platform_admin() else self.user.gym_id
```
Todo endpoint de creación/escritura debe resolver el `gym_id` destino exclusivamente a través de esta dependencia — nunca leer un campo `gymId`/`gym_id` del body salvo que el caller sea `platform_admin` administrando explícitamente otra sucursal. Ya se confirmó (`docs/BACKEND_PREPARATION_AUDIT_GYM.md §6`, §8) que `apps/api/app/modules/members/router.py:16-30` **ya sigue este patrón correctamente** (`gym_id=current_user.gym_id`, sin campo `gym_id` en `MemberCreate`) — es la prueba de que la pieza es reutilizable tal cual, no solo una recomendación teórica.

**Implicación**: el futuro endpoint de alta de staff (`POST /staff`, reemplazo de `/api/staff`) debe construirse desde cero sobre `AuthzService.gym_scope()`, igual que `members`. Cualquier módulo nuevo (`payments`, `inventory_items`, `trainer_clients`) debe seguir el mismo patrón sin excepción.

**Afecta**: todos los routers de escritura del backend nuevo; `apps/api/app/auth/dependencies.py` (se conserva y se reutiliza como pieza central, no se reescribe).

---

## Bloque 2 — Vinculación entrenador-cliente y QR de acceso

### 3. Vinculación entrenador↔cliente → 100% vía QR, se elimina la asignación manual del dashboard

**Estado: CONFIRMADA.**

**Decisión**: el único mecanismo válido para vincular a un entrenador con un cliente es que el entrenador escanee el QR del miembro desde su propia app móvil. La UI de "Asignar cliente" del dashboard (`apps/web/app/trainers/page.tsx`, hallazgo D2 de `docs/QA_AUDIT_REPORT_GYM.md`) **se elimina**, no se conserva como respaldo.

**Implicación**:
- Se retira del dashboard web: el botón "Asignar cliente", el modal de asignación, el botón "Desasignar", y las funciones `assignTrainer`/`unassignTrainer` del store (`apps/web/lib/store.tsx:1092-1104`) dejan de tener consumidor en el dashboard.
- El backend expone en su lugar un endpoint que solo el propio `trainer` autenticado puede invocar, análogo a `rotate_my_access_code()`: recibe el código de acceso vigente de un miembro (leído de su QR), resuelve a qué `member` pertenece, y crea/actualiza la fila de vínculo con `trainer_id = current_user.id` — nunca acepta un `trainer_id` ni un `client_id` arbitrario del body salvo el `member_id` resuelto internamente a partir del código escaneado.
- La tabla `trainer_clients` (con su constraint `unique(client_id)` — un cliente, un entrenador a la vez) **se conserva tal cual**; el cambio es solo en la capa de aplicación que la escribe, no en el esquema.
- La app móvil del entrenador (`apps/mobile/src/app/(trainer)/`) necesita una pantalla de escaneo nueva (hoy no existe ninguna, confirmado en la auditoría) que consuma este endpoint.

**Afecta**: `apps/web/app/trainers/page.tsx` (se simplifica, retira el flujo manual), `supabase/schema.sql` RLS de `trainer_clients` (la política `trainer_clients_write_staff`, hoy solo permite escribir a `admin`/`receptionist`, se retira o se reemplaza por la lógica del backend nuevo — este documento no define RLS de Supabase porque el backend real no usa RLS, ver `docs/BACKEND_PREPARATION_AUDIT_GYM.md §0`), `apps/mobile/src/app/(trainer)/` (pantalla de escaneo nueva), nuevo endpoint del backend (`POST /trainer/link-client` o equivalente).

---

### 4. QR de acceso → válido solo por ventana de tiempo (20-30s), sin invalidación de un solo uso

**Estado: CONFIRMADA — con trade-off de seguridad aceptado explícitamente.**

**Decisión**: el QR de acceso (de miembro y, a partir de esta auditoría, también el del entrenador — ver `docs/BACKEND_PREPARATION_AUDIT_GYM.md §9`, D3) es válido únicamente dentro de una ventana de tiempo corta (20-30 segundos, igual que el mecanismo ya implementado en `supabase/add-access-code-expiry.sql`/`add-rotate-access-code.sql`). **No se implementa invalidación por uso único** — un código que aún esté dentro de su ventana de validez puede, en teoría, usarse más de una vez (por ejemplo, si alguien capturó una foto del QR durante los ~20-30 segundos en que estuvo vigente).

**Nota de trade-off de seguridad aceptado (documentada explícitamente, tal como se pidió)**: esto es una decisión de producto, no un descuido — invalidar por uso único añadiría una escritura síncrona adicional en cada validación de acceso (marcar el código como consumido) y complejidad de manejo de condiciones de carrera (dos escaneos casi simultáneos del mismo código). Se acepta el riesgo residual de que una foto del QR tomada durante la ventana de validez pueda reutilizarse dentro de esos 20-30 segundos, a cambio de un diseño más simple. Si en el futuro se detecta abuso real de este vector, la mitigación es reducir la ventana de validez, no necesariamente agregar invalidación de un solo uso.

**Implicación**: el backend real conserva el mecanismo de "código + ventana de tiempo" ya validado en el prototipo (`validate_access()`, `supabase/schema.sql`) en vez de migrar a un token HMAC/JWT autoverificable sin tabla (que sí eliminaría la necesidad de una consulta a BD por validación, pero no es requisito para esta decisión — queda como posible optimización futura, no bloqueante). El mismo mecanismo se extiende al QR de acceso propio del entrenador (D3).

**Afecta**: diseño de `client_access_codes` (o su equivalente en el backend nuevo — probablemente unificado en una sola tabla `access_codes` con `owner_type: 'member' | 'trainer'` para no duplicar el mecanismo), endpoint de validación de acceso, pantalla de QR en la app móvil del entrenador (nueva, D3).

---

## Bloque 3 — Manejo de errores y validación de negocio

### 5. Manejo de errores (CRIT-02) → manejador global de excepciones + contrato de error uniforme

**Estado: PROPUESTA, PENDIENTE DE CONFIRMACIÓN.**

**Contexto**: `CRIT-02` documenta un patrón transversal en el frontend actual — la mayoría de las mutaciones (`PaymentModal`, alta/baja de miembros, inventario, membresías, cancelación de pagos/ventas) no esperan la promesa ni capturan errores, así que cualquier fallo de red o de la capa de datos queda invisible para el usuario. Esto no se corrige solo del lado del frontend nuevo — necesita que el backend primero exponga errores consistentes y capturables.

**Propuesta**: replicar el patrón ya usado en `admin-panel-j2ec-backend` — un manejador global de excepciones FastAPI (`app/core/exceptions.py`, que **ya existe** en `apps/api` con esa función, confirmado en `docs/BACKEND_PREPARATION_AUDIT_GYM.md §7`) que traduzca cada tipo de error de negocio a un código HTTP correcto (400 validación, 401/403 auth, 404 no encontrado, 409 conflicto — p. ej. el índice único `(gym_id, member_number)` o el límite de staff del Bloque 1) y un cuerpo de respuesta uniforme, por ejemplo `{ "error": "mensaje legible", "code": "STAFF_LIMIT_REACHED" }`. Ningún endpoint debe devolver un error 500 genérico para condiciones de negocio esperables (límite alcanzado, dato duplicado, validación fallida).

Del lado del frontend nuevo que consuma este backend (fuera del alcance de este documento, pero como criterio de aceptación): toda mutación debe hacer `await` + `try/catch` sobre este contrato, mostrando el mensaje de error al usuario — mismo patrón que ya existe correctamente en `CheckoutModal.tsx`/`InventorySaleModal.tsx` del prototipo actual (contraejemplos positivos citados en la auditoría de QA), generalizado a todos los formularios.

**Implicación**: bloqueante de diseño temprano — el contrato de error debe definirse **antes** de escribir el primer endpoint nuevo, no ajustarse después, para no tener que retrofit-earlo en módulos ya construidos.

**Afecta**: `apps/api/app/core/exceptions.py` (se conserva y se usa como base, ver Bloque 5), todos los routers nuevos, especificación de `API_PROPUESTA.md` (pendiente, fuera de este log).

---

### 6. Validación de negocio (CRIT-03) → Pydantic con restricciones de rango, server-side, en cada schema de entrada

**Estado: PROPUESTA, PENDIENTE DE CONFIRMACIÓN.**

**Contexto**: `CRIT-03` documenta que hoy se pueden crear membresías con `price` negativo o `duration` cero/vacía (`apps/web/app/memberships/page.tsx`, sin `<form>` real ni validación server-side), y por extensión (`ALTA-09`/`ALTA-10`) artículos de inventario con `quantity`/`salePrice` negativos — ambos casos se propagan silenciosamente a pagos e ingresos reportados.

**Propuesta**: cada schema Pydantic de entrada (`MembershipPlanCreate`, `InventoryItemCreate`, etc., siguiendo el patrón ya usado en `apps/api/app/modules/members/schemas.py`) debe declarar las restricciones de rango directamente en el tipo, usando `Field` con `gt=0`/`ge=0` según corresponda — nunca dejar la validación como un `if` disperso en un service:
```python
class MembershipPlanCreate(BaseModel):
    name: str
    price: float = Field(gt=0)
    duration: int = Field(gt=0)
    duration_unit: Literal["days", "weeks", "months", "years"]
    tolerance_days: int = Field(ge=0, default=0)
```
```python
class InventoryItemCreate(BaseModel):
    ...
    quantity: int = Field(ge=0)
    sale_price: float | None = Field(default=None, gt=0)
    min_stock: int | None = Field(default=None, ge=0)
```
Esto hace que un request con `price: -500` o `duration: 0` sea rechazado con `422` **antes** de que el service/repository lo toque — no depende de que cada función de negocio recuerde validar, es estructural (mismo criterio que `admin-panel-j2ec` aplicó al mover las guardas de UI a validación server-side, Bloque 2 decisión 6 de su propio `DECISION_LOG.md`).

**Implicación**: define el estándar para todos los schemas `*Create`/`*Update` del backend nuevo, no solo membresías/inventario — cualquier campo numérico de negocio (montos, cantidades, duraciones) debe declarar su rango válido en el propio schema.

**Afecta**: `membership_plans`, `inventory_items` (y su futura tabla `inventory_sales`, Bloque 4), `payments` (monto > 0), diseño de `SCHEMA_PROPUESTO.md`/`API_PROPUESTA.md` (pendiente, fuera de este log).

---

## Bloque 4 — Inventario y ventas de tienda

### 7. Ventas de tienda → tabla persistente nueva, transacción atómica de venta

**Estado: PROPUESTA, PENDIENTE DE CONFIRMACIÓN.**

**Contexto**: `docs/BACKEND_PREPARATION_AUDIT_GYM.md §5/§8` confirma que **no existe ninguna tabla de ventas de tienda** hoy — `completeInventorySale` (`apps/web/lib/store.tsx:1028-1078`) procesa la venta completa en memoria del cliente (React state), sin ninguna persistencia; se pierde al recargar la página. El descuento de stock que sí persiste se hace con una serie de `update`s independientes por línea, sin agrupar en una transacción (comentario explícito en el propio código confirmándolo).

**Propuesta**: dos tablas nuevas —
```
inventory_sales
  id (PK)
  gym_id (FK -> gyms)
  member_id (FK -> members, nullable — venta sin cliente específico es válida, igual que en el prototipo)
  subtotal, total
  method (cash | card | transfer | other)
  status (confirmed | cancelled)
  notes
  registered_by (FK -> users)
  cancelled_by, cancel_reason, cancelled_at
  sold_at, created_at

inventory_sale_items
  id (PK)
  sale_id (FK -> inventory_sales)
  item_id (FK -> inventory_items)
  quantity
  unit_price, subtotal
```
Un único endpoint transaccional (`POST /inventory/sales`) que, dentro de una sola transacción de base de datos: (1) valida disponibilidad de **todas** las líneas del carrito (mismo criterio "todo o nada" que ya implementa correctamente `completeInventorySale` hoy, solo que en memoria), (2) descuenta stock de cada línea, (3) inserta la venta y sus líneas — las tres cosas atómicas, no una serie de llamadas independientes. Reutiliza el criterio de validación de precio > 0 del Bloque 3, decisión 6.

**Implicación**: es la brecha de datos más grande de todo el sistema actual — hoy recepción vende productos todos los días y ese historial no sobrevive ni un refresh de página. Prioridad alta de diseño, no una mejora incremental.

**Afecta**: `inventory_items` (se mantiene igual), nuevas tablas `inventory_sales`/`inventory_sale_items`, reportes de ingresos (`apps/web/app/payments/page.tsx`, que hoy suma `inventorySales` desde el estado en memoria — pasaría a consultar la tabla real).

---

## Bloque 5 — Veredicto sobre el backend Fase 1 de Cesar (`apps/api`)

### 8. Qué se reutiliza vs. qué se reconstruye

**Estado: PROPUESTA, PENDIENTE DE CONFIRMACIÓN** (es un veredicto técnico, no una decisión de negocio — se marca igual como pendiente porque implica decidir cuánto esfuerzo ya invertido se conserva).

**Se reutiliza tal cual** (ya evaluado en detalle en `docs/BACKEND_PREPARATION_AUDIT_GYM.md §6`, confirmado con evidencia de código, no solo intención):

| Pieza | Ubicación | Por qué se conserva |
|---|---|---|
| `AuthzService` + `gym_scope()` | `apps/api/app/auth/dependencies.py:46-88` | Ya resuelve correctamente el problema central de CRIT-01 (Bloque 1, decisión 2) — confirmado en uso real en `members/router.py`, no solo declarado. |
| Estructura por módulo (`models/schemas/repository/service/router`) | `apps/api/app/modules/*` | Mismo patrón ya probado en `admin-panel-j2ec-backend`; separar `service.py` de `router.py` es lo que permite testear reglas de negocio sin HTTP. |
| Activación transaccional (`activation/service.py`) | `apps/api/app/modules/activation/service.py` | Replica correctamente el `handle_new_user()` de Supabase dentro de `async with db.begin()` explícito — ya es atómica. |
| Generación de `activation_code` con `secrets.choice` | `apps/api/app/modules/members/models.py:10-14` | Criptográficamente segura y sin caracteres ambiguos — mejor que el equivalente actual de Supabase, no hay razón para regresar a algo peor. |
| Manejador de excepciones (`app/core/exceptions.py`) | `apps/api/app/core/` | Base para el contrato de error del Bloque 3, decisión 5 — ya existe, solo falta ampliarlo con los códigos de error de negocio nuevos (límite de staff, validaciones de rango, etc.). |
| Tests contra Postgres real (no SQLite) | `apps/api/tests/` | Buena práctica ya establecida, se mantiene como estándar para los módulos nuevos. |

**Se reconstruye / corrige antes de continuar**:

| Pieza | Ubicación | Por qué no se hereda tal cual |
|---|---|---|
| Enum de roles (`Role`) | `apps/api/app/modules/users/models.py:12-19` | No tiene `gym_admin_secondary` ni el naming correcto (`admin` en vez de `gym_admin`) — debe corregirse **antes** de que cualquier módulo nuevo dependa de `STAFF_ROLES`, para no propagar el error (Bloque 1, decisión 1). |
| Endpoint de alta de staff | No existe todavía en `apps/api` | Se construye desde cero directamente con el límite correcto (1 `gym_admin_secondary` + 2 `receptionist`) y sobre `AuthzService.gym_scope()` — no hay nada que corregir porque nunca se llegó a escribir, pero tampoco se debe copiar el patrón de `apps/web/app/api/staff/route.ts` (que sí tiene el bug de CRIT-01). |
| Módulos de `trainer_clients`, `payments`, `access_logs`, `inventory_items`, `inventory_sales` | No existen todavía en `apps/api` | Se construyen desde cero, considerando ya las decisiones de este log (QR-only para entrenador-cliente, tabla real de ventas) — no hay versión previa que evaluar. |

**Implicación**: se recomienda continuar Fase 2 de `apps/api` sobre la base ya construida, no reiniciar desde cero — la mayor parte de lo evaluable (auth, members, activation) ya sigue el criterio correcto. La única corrección obligatoria antes de seguir es el enum de roles.

**Afecta**: decide directamente el punto de partida de `SCHEMA_PROPUESTO.md`/`API_PROPUESTA.md` (pendientes, fuera de este log) — si se confirma esta propuesta, esos documentos parten de `apps/api` con las correcciones ya listadas, no de una hoja en blanco.

---

## Resumen para diseño de backend

| # | Decisión | Estado | Prioridad de diseño |
|---|---|---|---|
| 1 | Roles: `gym_admin` + `gym_admin_secondary` (máx. 1) + `receptionist` (máx. 2) | Confirmada | Alta — cambia el esquema de `users`/`profiles` y el endpoint de alta de staff |
| 2 | `gym_id` siempre derivado del usuario autenticado (`AuthzService.gym_scope()`) | Propuesta | Alta — bloqueante de seguridad, aplica a todo endpoint de escritura desde el día 1 |
| 3 | Vinculación entrenador-cliente 100% vía QR, se elimina asignación manual | Confirmada | Alta — afecta dashboard web, app móvil del entrenador (pantalla nueva) y RLS/backend de `trainer_clients` |
| 4 | QR de acceso: ventana de tiempo, sin invalidación de un solo uso (trade-off aceptado) | Confirmada | Media — mecanismo ya validado en el prototipo, se conserva y se extiende al entrenador |
| 5 | Manejador global de excepciones + contrato de error uniforme | Propuesta | Alta — bloqueante temprano, debe definirse antes del primer endpoint nuevo |
| 6 | Validación de rango con Pydantic (`Field(gt=0)` etc.) en todo schema de entrada | Propuesta | Alta — previene que CRIT-03 se repita en cualquier módulo nuevo |
| 7 | Tabla de ventas de tienda (`inventory_sales`/`inventory_sale_items`) + transacción atómica | Propuesta | Alta — es la única entidad de negocio activa sin ninguna persistencia real hoy |
| 8 | Continuar `apps/api` Fase 2 sobre la base actual, corrigiendo el enum de roles primero | Propuesta | Alta — determina si el trabajo ya hecho en `apps/api` se aprovecha o se descarta |

## Pendientes fuera de este log

- **D3 (`docs/BACKEND_PREPARATION_AUDIT_GYM.md §9`), parte 2**: la pantalla de escaneo del entrenador en `apps/mobile` depende del endpoint de la decisión 3 — su diseño de UI/UX no se cubre en este documento (es implementación, no decisión de arquitectura de backend).
- **Mecanismo de QR autoverificable (HMAC/JWT) sin tabla**: mencionado como posible optimización futura en el Bloque 2, decisión 4 — explícitamente no bloqueante, no se decide aquí.
- **`ALTA-11`** (`photoUrl` de miembro desconectado de la UI, `docs/QA_AUDIT_REPORT_GYM.md`): pendiente de confirmar con negocio si la funcionalidad de foto de miembro se retoma — si se confirma, se agrega como decisión de diseño en una revisión posterior de este log.
- **Estados vestigiales sin productor** (`payments.status = 'pending'`/`'corrected'`, riesgo #7 de `docs/BACKEND_PREPARATION_AUDIT_GYM.md §10`): no se decide aquí si se implementan de verdad o se retiran del modelo — requiere confirmar con negocio si "pago pendiente de confirmar" y "pago corregido" son flujos reales a soportar.
- **Formato exacto de `SCHEMA_PROPUESTO.md`/`API_PROPUESTA.md`**: siguiente paso una vez confirmadas las decisiones de este log, fuera de su alcance.
