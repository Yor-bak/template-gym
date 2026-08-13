# BACKEND_PREPARATION_AUDIT_GYM.md

Auditoría final pre-backend de `template-gym`. Documento de solo lectura: describe el sistema **tal como funciona hoy**, sin reinterpretar reglas de negocio. Todo hallazgo se reporta, no se corrige. No se tocó código en esta pasada.

Fecha: 2026-07-15. Rama: `Cambios-cesar`. Se apoya directamente en `docs/QA_AUDIT_REPORT_GYM.md` (auditoría funcional/QA previa, mismo día) y en `REQUERIMIENTOS_BACKEND_GYM.md` (spec de negocio ya confirmada para el backend real).

---

## 0. Aclaración de alcance (léase antes de todo lo demás)

Hoy coexisten **tres piezas** de infraestructura de datos, y ninguna es el backend final:

1. **Supabase self-hosted** (`192.168.0.15:8010`), con su esquema (`supabase/schema.sql` + 4 migraciones sueltas ya incorporadas al esquema base) y sus políticas RLS — es el backend real que usa `apps/web` y `apps/mobile` **hoy**, pero es un **entorno de prueba temporal**, no la decisión de stack.
2. **`apps/api`** — un FastAPI + SQLAlchemy async iniciado por Cesar ("Fase 1: auth + members", commit `d54585c9`), **completamente desconectado** de `apps/web`/`apps/mobile` (cero llamadas HTTP desde el frontend hacia él, confirmado por grep). Solo cubre `auth`, `members`, `gyms`, `membership_plans`, `activation` — no tiene `payments`, `access_logs`, `trainer_clients`, `inventory_items`, ni el módulo de staff.
3. **El backend real por construir**: FastAPI + PostgreSQL + SQLAlchemy async, aislamiento multi-tenant por filtrado manual de `gym_id` (no RLS), según `REQUERIMIENTOS_BACKEND_GYM.md`.

Por tanto, en este documento:
- Todo lo descrito de Supabase (esquema, RLS, funciones) es **"cómo funciona hoy"**, útil como referencia de qué datos y qué reglas ya se pensaron y validaron en un prototipo — **no** es el diseño a preservar tal cual.
- Todo lo descrito de `apps/api` se evalúa explícitamente como **aprovechable o descartable** (sección 8) — no se asume ninguna de las dos cosas por defecto.

---

## 1. Resumen ejecutivo

`apps/web` es una SPA Next.js/React que opera en uno de dos modos, decididos en tiempo de ejecución por `isDemoMode()` (`apps/web/lib/data/config.ts`): **modo demo** (estado en memoria + `localStorage`, sin red) o **modo Supabase** (el real, apuntando al self-host de la Pi). El modelo de datos vive completo en `supabase/schema.sql` (9 tablas + funciones RPC + RLS por tabla); el frontend consume ese esquema casi 1:1 mapeando snake_case→camelCase en `apps/web/lib/store.tsx` (~1780 líneas).

El esquema Supabase implementa correctamente una cantidad razonable de lógica de negocio (activación de miembro por código, QR de acceso rotativo firmado por RLS, aislamiento por `gym_id` consistente en casi todas las políticas), pero:

- **El modelo de roles no corresponde al modelo de negocio real** — falta por completo `gym_admin_secondary`, y el límite de recepcionistas es 1 en vez de 3 (detalle en §4 y §7, hallazgo D1 del QA previo).
- **Existe una fuga real de aislamiento multi-tenant** en la capa de API Route de Next.js (no en Supabase/RLS en sí) — un admin puede crear staff en otro gimnasio pasando un `gymId` arbitrario (§7, CRIT-01).
- **Un patrón transversal de mutaciones sin manejo de error** hace que fallos de RLS/red queden invisibles para el usuario en la mayoría de los formularios (§7, CRIT-02).
- **El flujo de vinculación entrenador↔cliente implementado (asignación manual desde el dashboard) contradice el flujo de negocio confirmado** (QR escaneado por el entrenador desde su propia app) — la tabla `trainer_clients` y su RLS sí están bien diseñadas para soportar cualquiera de los dos flujos; lo que falta es la app del entrenador, que no tiene ninguna pantalla de escaneo ni de QR propio (§9, D2/D3).
- `apps/api` (Fase 1) es una implementación parcial pero **de buena calidad** y **sin el error de CRIT-01** (deriva `gym_id` del usuario autenticado, nunca lo acepta del body) — es parcialmente aprovechable, ver §8.

Nada de esto bloquea el diseño del backend — esta auditoría da la base exacta para decidir, con evidencia, qué preservar del prototipo Supabase, qué preservar de `apps/api`, y qué corregir de raíz en el backend real.

---

## 2. Arquitectura actual

```
supabase/
  schema.sql                — esquema completo consolidado: 9 tablas, RLS por tabla, 4 funciones RPC
  add-access-code-expiry.sql, add-rotate-access-code.sql,
  add-gym-update-policy.sql, add-staff-routine-policies.sql,
  fix-rls-recursion.sql     — migraciones incrementales ya incorporadas al schema.sql consolidado

apps/web/                   — dashboard Next.js (staff: admin/recepcionista/platform_admin)
  lib/auth.tsx               — SupabaseAuthProvider / MockAuthProvider (isDemoMode())
  lib/store.tsx               — SupabaseStoreProvider / MockStoreProvider — TODO el estado de negocio
                                 (~1780 líneas), mapeo snake_case (Supabase) <-> camelCase (UI)
  app/api/staff/route.ts     — único Route Handler server-side; usa supabase-admin (service_role)
                                 para crear cuentas de staff/entrenador vía Supabase Auth Admin API
  app/{members,staff,payments,inventory,memberships,trainers,
       access-monitor,access-history,reports,settings,platform}/page.tsx
                              — 11 páginas de dashboard, sin middleware de rol (ver QA_AUDIT_REPORT_GYM.md, ALTA-01)

apps/mobile/                — Expo/React Native, dos identidades: (client) y (trainer)
  src/app/(client)/          — home con QR de acceso rotativo (react-native-qrcode-svg), rutina, perfil
  src/app/(trainer)/         — solo "Mis clientes" (lectura de trainer_clients) + perfil; SIN escaneo ni QR propio

apps/api/                   — FastAPI + SQLAlchemy async, "Fase 1", desconectado del frontend
  app/modules/{gyms,members,membership_plans,users,activation}/
                              — models.py, schemas.py, repository.py, service.py, router.py por módulo
  app/auth/                  — get_current_user, require_role, AuthzService (gym_scope())
  alembic/                   — 1 migración (0001_phase1_auth_members)
  tests/modules/             — test_auth.py, test_members.py, test_activation.py
```

No hay capa de API propia entre `apps/web` y Supabase — el cliente de Supabase (`@supabase/supabase-js`) se usa directamente desde componentes de cliente (`'use client'`), con RLS como única barrera de autorización del lado de datos. La única excepción es `app/api/staff/route.ts`, el único punto donde `apps/web` sí pasa por un servidor propio (Next.js Route Handler) antes de tocar Supabase — y es justo ahí donde vive CRIT-01 (§7).

---

## 3. Flujos principales (evidencia con archivo:línea)

### 3.1 Identidad y roles

**Tres tipos de identidad, un solo esquema `profiles`** (`supabase/schema.sql:39-53`): `role text check (role in ('client', 'trainer', 'admin', 'receptionist', 'platform_admin'))`. No existe `gym_admin_secondary` ni `super_admin` en este CHECK — el segundo es referenciado por el frontend (`apps/web/lib/store.tsx:652-679`, `apps/web/app/staff/page.tsx`) como concepto de "titular del contrato", pero **no puede persistirse** en este esquema: es aspiracional/muerto en el estado actual del prototipo.

**Login del dashboard** (`apps/web/lib/auth.tsx:11,40-119`): `STAFF_ROLES = ['admin', 'receptionist', 'platform_admin']`; el login valida `role` y `active` del `profile` tras autenticar contra Supabase Auth, y rechaza explícitamente `client`/`trainer` (esos roles solo existen para la app móvil).

**Alta de staff** (`apps/web/app/api/staff/route.ts`): único camino legítimo para crear `admin`/`receptionist`/`trainer` — usa `service_role` server-side, nunca expuesto al navegador. `super_admin` deliberadamente no está en `CREATABLE_ROLES` (línea 10) porque "no existe todavía un flujo de alta contractual de gimnasio nuevo" (comentario explícito en el código, líneas 5-9).

**Activación de miembro** (`supabase/schema.sql:330-361`, función `handle_new_user`, trigger en `auth.users`): si el signup trae `activation_code` en metadata, busca el `member` pendiente por ese código (`for update`, con lock de fila), crea su `profile` con `role` **forzado a `'client'`** (nunca confía en el metadata del request para asignar rol), lo linkea, y limpia el código. Si el código no es válido, la transacción entera falla (rollback) — bien diseñado.

### 3.2 Miembros y ciclo de vida

`members` (`supabase/schema.sql:144-177`) es el registro de negocio, distinto de `profiles` (identidad de login) — un miembro puede existir sin cuenta móvil todavía (`status: 'pending_activation'`). Estados: `active | expiring_soon | expired | blocked | temporary_access | pending_activation | archived`.

**Cálculo de estado por acceso** vive en `validate_access` (`supabase/schema.sql`, función RPC, `security invoker`): compara `expiration_date` contra `current_date` y `tolerance_days` del plan; si `days_left <= 5` marca `expiring_soon`, si excede la tolerancia marca `expired` — y **efectúa el side-effect de persistir ese nuevo status en `members`** en el mismo request de validación de acceso (`if v_result in ('expired','expiring_soon') and v_member.status = 'active' then update members set status = v_result`). Es decir: el estado del miembro se recalcula únicamente cuando alguien escanea su QR — no hay ningún job/cron que lo actualice de forma proactiva. Un miembro que nunca vuelve a intentar entrar queda con su último `status` conocido indefinidamente, aunque ya esté vencido.

**Creación de miembro desde el dashboard** (`apps/web/lib/store.tsx:700-750`): genera `member_number` como `prefix + max(existente)+1`, calculado **en el cliente** escaneando el arreglo ya cargado — mismo patrón de riesgo de concurrencia que documentó `admin-panel-j2ec` en su propia auditoría (dos altas simultáneas podrían colisionar en el mismo número si Supabase no tuviera el índice único `(gym_id, member_number)` de respaldo, `schema.sql:178`, que sí existe y evitaría la colisión silenciosa a costa de un error 409 no manejado — ver QA_AUDIT_REPORT_GYM.md CRIT-02/ALTA-07).

### 3.3 QR de acceso (miembro)

`client_access_codes` (`supabase/schema.sql:187-200`): un código de 16 bytes hex por miembro, con índice único parcial `where active` que garantiza **como máximo un código activo por miembro** a nivel de base de datos (`members_client_access_codes_one_active_per_member`, línea 199-200). `rotate_my_access_code()` (función RPC `security definer`) desactiva el código anterior e inserta uno nuevo, **siempre acotado al `member` del propio caller vía `auth.uid()`** — nunca confía en un id recibido del cliente (comentario explícito en el código). La app móvil del cliente la invoca cada 20 segundos mientras la pantalla de QR está abierta (`apps/mobile/src/app/(client)/index.tsx`).

`validate_access(code, reader)` (función RPC `security invoker`, `supabase/add-access-code-expiry.sql`, ya consolidada en `schema.sql`): un código "activo" con más de 60 segundos de antigüedad se trata como inválido — ventana de validez corta, coherente con la recomendación de `REQUERIMIENTOS_BACKEND_GYM.md §5` para el token firmado del backend real (aunque aquí el mecanismo es un valor aleatorio persistido en tabla, no un HMAC autoverificable — el backend real deberá decidir si migra a JWT/HMAC firmado o mantiene el patrón de tabla + rotación, ver §7 recomendación de diseño).

### 3.4 Entrenador ↔ cliente

`trainer_clients` (`supabase/schema.sql:203-213`): relación con `unique(client_id)` — **un miembro solo puede tener un entrenador asignado a la vez** (constraint a nivel de base de datos, correcto independientemente de cuál sea el mecanismo de asignación). RLS de escritura (`fix-rls-recursion.sql`, consolidada): solo `admin`/`receptionist` del mismo gimnasio pueden insertar/actualizar/borrar filas — es decir, **la base de datos ya está diseñada para que la asignación la haga el staff desde el dashboard**, no hay ninguna función RPC equivalente a `rotate_my_access_code()` que un `trainer` pueda invocar para autoasignarse un cliente escaneando su QR. Ese mecanismo (RPC callable por `trainer`, acotado por `auth.uid()`, que reciba un código de acceso de miembro y cree la fila `trainer_clients`) **no existe hoy en ninguna capa** — ni en Supabase, ni en `apps/web`, ni en `apps/api`. Ver D2/D3 en §9.

El dashboard (`apps/web/app/trainers/page.tsx`) sí implementa el flujo manual completo: asignar (líneas 68-80, 182-206) y desasignar (línea 214), ambos llamando directamente `assignTrainer`/`unassignTrainer` (`apps/web/lib/store.tsx:1092-1104`), que hacen `upsert`/`delete` sobre `trainer_clients` sin pasar por ninguna capa adicional.

### 3.5 Pagos

`payments` (`supabase/schema.sql:243-266`): `status: confirmed | cancelled | corrected | pending`, con `correction_of` autoreferenciado (para correcciones) y `cancelled_by`/`cancel_reason`/`cancelled_at`. La creación (`apps/web/lib/store.tsx:775-816`) siempre inserta con `status: 'confirmed'` directamente — el estado `'pending'` existe en el CHECK constraint pero **ninguna función del frontend lo produce** (mismo patrón de "estado vestigial sin productor" que `activation_error` en la auditoría de `admin-panel-j2ec`). `status: 'corrected'` tampoco tiene ningún productor confirmado — `correction_of` existe como columna pero no hay ninguna función `correctPayment`/similar en el store.

**Actualización de vigencia del miembro tras un pago** no es atómica con el insert del pago: `PaymentModal` hace dos llamadas independientes (`addPayment` y luego `updateMember`, `apps/web/components/payments/PaymentModal.tsx:62-88`) — si la segunda falla tras la primera tener éxito, el pago queda registrado pero la fecha de vencimiento del miembro no se actualiza, sin ninguna transacción que las agrupe ni ningún mecanismo de reintento/reconciliación. Ver también QA_AUDIT_REPORT_GYM.md ALTA-08 (el `status` final se fuerza a `'active'` sin comparar contra la fecha real).

**Actualización 2026-07-19 — resuelto en el backend real.** `apps/api/app/modules/member_payments/` implementa `POST/GET /members/{id}/payments`: `covers_until` se calcula server-side desde `membership_plan` del miembro (`app/core/dates.py:add_duration`, aritmética de calendario real, no `dias*30`), con override manual opcional (`coversUntil` en el body) para el caso "el negocio lo requiere". El insert del pago y la actualización de `member.expiration_date`/`status` viven en la **misma transacción** (`member_payments/service.py:register_payment`) — ya no son dos llamadas independientes desde el cliente, así que el escenario "el pago quedó huérfano" de arriba ya no puede ocurrir en el backend real. La vigencia (`active`/`expiring_soon`/`expired`) dejó de tener dos escritores: ahora la calcula una sola función (`app/modules/members/vigency.py:compute_effective_status`), reutilizada por el registro de pago, `GET /members` (status ya no es la columna cruda, se recalcula en vivo en cada lectura) y `POST /access/scan` — antes esa lógica vivía solo, inline, dentro del escaneo. `payments.status`/`correction_of` (vestigiales, sin productor, señalados arriba) **no se replicaron** en `member_payments` — no se pidieron y ninguna función los habría alcanzado, mismo criterio que evitó el gap original. Cobertura: `apps/api/tests/modules/test_member_payments.py` (9 tests).

### 3.6 Inventario

`inventory_items` (`supabase/schema.sql:287-311`): equipo y stock de tienda en una sola tabla, distinguidos por `area` (`cardio | fuerza | peso_libre | tienda`). **No existe ninguna tabla de ventas de tienda** (`inventory_sales`/`sales` no aparece en el esquema) — las ventas viven **solo como estado local del provider de React** (`apps/web/lib/store.tsx:596`, comentario explícito: "no existe todavía una tabla real... vive como estado local del provider (se pierde al recargar)"). El descuento de stock que sí persiste (`updateInventoryItem`) se hace con una serie de `update`s independientes por línea, no una transacción — confirmado en el propio comentario del código (`store.tsx:1071-1075`): "no existe todavía una función RPC/transacción de backend que agrupe esto en una sola operación atómica".

### 3.7 Rutinas

`routines`/`routine_exercises` (`supabase/schema.sql:216-240`): soportan tanto rutinas genéricas (`client_id is null`, gestionadas por `admin` desde el dashboard) como personalizadas por cliente (`client_id` no nulo, exclusivas del `trainer_id` asignado). RLS ya distingue ambos casos correctamente (`add-staff-routine-policies.sql`, consolidada).

---

## 4. Reglas de negocio — fuente única vs. duplicada

| Regla | ¿Fuente única? | Detalle |
|---|---|---|
| Aislamiento por `gym_id` en lectura de datos (members, payments, access_logs, inventory, routines, membership_plans) | ✅ Sí, hoy | Aplicado consistentemente vía RLS en `supabase/schema.sql` — el cliente (`store.tsx`) no filtra por `gym_id` en ningún `select`, confía enteramente en RLS. **No es la fuente única que tendrá el backend real** — ahí será filtrado manual explícito por `gym_id`, no RLS (ver §0). |
| Aislamiento por `gym_id` en escritura vía Route Handler propio | ❌ No | RLS protege todo lo que pasa por el cliente Supabase directo, pero `app/api/staff/route.ts` usa `service_role` (que **se salta RLS por diseño**) y su propia validación de pertenencia a gimnasio tiene el bug de CRIT-01 — es la única escritura de todo el sistema que no pasa por RLS y por eso es también la única con esta fuga. |
| Estado de vigencia del miembro (`active`/`expiring_soon`/`expired`) | ⚠️ Parcial | Se recalcula y persiste **solo** dentro de `validate_access()` al escanear — no hay ningún job que lo actualice de forma proactiva para miembros que no intentan entrar. `PaymentModal` en el frontend también escribe `status` directamente tras un pago (`'active'` incondicional, ALTA-08) — dos escritores distintos del mismo campo, sin un único punto de verdad. |
| Modelo de roles de staff | ❌ No, y además incompleto | `supabase/schema.sql:42` (fuente real) vs. `apps/web/lib/store.tsx:652-679` (referencia código-muerto a `super_admin`, que no puede persistir) vs. `REQUERIMIENTOS_BACKEND_GYM.md §2.1` (la especificación real: `gym_admin`/`gym_admin_secondary`/`receptionist` × 3) — tres versiones divergentes del mismo concepto, ninguna es la definitiva. |
| Límite de cuentas de staff por gimnasio | ⚠️ Duplicada, pero al menos consistente entre sí | Implementada tanto en `apps/web/app/staff/page.tsx` (UI, deshabilita opciones ya ocupadas) como en `apps/web/app/api/staff/route.ts:74-88` (server-side, defensa en profundidad) — **ambas coinciden** en el límite (1+1), lo cual es correcto como patrón de duplicación intencional (UI + server), pero el límite mismo está mal (debería ser 1+1+3, ver D1). |
| Vinculación entrenador↔cliente | ❌ No aplica hoy — solo existe un camino (el que no debería ser el principal) | La base de datos (`trainer_clients` + RLS) soporta el flujo manual solamente; el flujo QR (D2/D3) no tiene ninguna implementación, ni parcial, en ninguna capa — no hay "dos reglas divergentes", hay una regla implementada que contradice la especificación. |
| Validez del código QR de acceso (ventana de 60s) | ✅ Sí | Solo en `validate_access()` (`supabase/schema.sql`), ejecutada exclusivamente server-side vía RPC — el frontend nunca calcula esto por su cuenta. |
| Formato de `member_number` / folio | ✅ Sí (pero client-side) | Un único patrón (`prefix-00001`, max+1) replicado idénticamente en `SupabaseStoreProvider.addMember` y `MockStoreProvider.addMember` (`apps/web/lib/store.tsx:703-707` y `:1320-1323`) — mismo código, no diverge, pero **ambas copias** calculan en el cliente (riesgo de concurrencia ya discutido en §3.2). |

---

## 5. Inventario de entidades

| Entidad | Existe hoy (Supabase) | Existe en `apps/api` (Fase 1) | Debe existir en BD final |
|---|---|---|---|
| Gimnasio (`gyms`) | Sí — `schema.sql:18-33` | Sí — `gyms/models.py`, campos idénticos | Sí |
| Identidad de login (`profiles` / `users`) | Sí — `schema.sql:39-53` | Sí — `users/models.py`, mismo shape salvo el gap de roles (§4) | Sí — con el modelo de roles corregido (D1) |
| Plan de membresía (`membership_plans`) | Sí — `schema.sql:122-136` | Sí — `membership_plans/models.py`, campos idénticos incluido `allows_multi_branch_access` (placeholder sin lógica todavía en ninguna capa) | Sí |
| Miembro (`members`) | Sí — `schema.sql:144-177` | Sí — `members/models.py`, prácticamente 1:1 (usa `user_id` en vez de `profile_id`, semánticamente igual) | Sí |
| Código de acceso QR (`client_access_codes`) | Sí — `schema.sql:187-200` | **No** — Fase 1 no llegó a este módulo | Sí — decidir mecanismo (tabla + rotación, como hoy, vs. HMAC autoverificable sin tabla, ver §3.3 y `REQUERIMIENTOS_BACKEND_GYM.md §5`) |
| Vínculo entrenador↔cliente (`trainer_clients`) | Sí — `schema.sql:203-213` | **No** | Sí — con el mecanismo de alta corregido (D2/D3, no solo el manual) |
| Rutina / ejercicio (`routines`, `routine_exercises`) | Sí — `schema.sql:216-240` | **No** | Sí |
| Pago (`payments`) | Sí — `schema.sql:243-266` | **No** | Sí — con estados `pending`/`corrected` implementados de verdad si se van a usar, o eliminados del CHECK si no (hoy son vestigiales) |
| Log de acceso (`access_logs`) | Sí — `schema.sql:270-284` | **No** | Sí |
| Artículo de inventario (`inventory_items`) | Sí — `schema.sql:287-311` | **No** | Sí |
| Venta de tienda (`inventory_sales`) | **No** — solo estado local de React, se pierde al recargar (§3.6) | **No** | Sí — no existe todavía en ninguna capa persistente; es la brecha de datos más grande de todo el inventario de entidades |
| Cuenta de staff / recepcionista / admin secundario | Parcial — mismo `profiles`, sin distinguir `admin`/`admin_secondary` | Parcial — mismo gap | Sí, con el rol nuevo (D1) |

---

## 6. Backend Fase 1 (Cesar) — qué es aprovechable, qué descartar

### Aprovechable (patrón correcto, se puede continuar sobre esta base)

- **Estructura por módulo** (`models.py`/`schemas.py`/`repository.py`/`service.py`/`router.py`), separación clara de capas, consistente con el patrón ya usado en `admin-panel-j2ec-backend` — arquitectura correcta, seguir replicándola para los módulos que faltan (`payments`, `access_logs`, `trainer_clients`, `inventory_items`, `staff`).
- **`AuthzService`** (`apps/api/app/auth/dependencies.py:46-88`) — patrón explícito "equivalente Python de `my_role()`/`my_gym_id()`" de las RLS de Supabase, con `gym_scope()` centralizando la regla "None solo si `platform_admin`, si no el `gym_id` del usuario". Es exactamente el tipo de capa que evita el bug de CRIT-01: en `create_member` (`apps/api/app/modules/members/router.py:16-30`) el `gym_id` **se deriva siempre** de `current_user.gym_id`, nunca del payload — `MemberCreate` (`schemas.py`) ni siquiera tiene un campo `gym_id`. Confirmado: este módulo **no repite el error** que sí tiene `apps/web/app/api/staff/route.ts`.
- **Activación de cuenta** (`apps/api/app/modules/activation/service.py`) — replica correctamente la transacción atómica de `handle_new_user()` de Supabase (buscar member por código → crear user → linkear → limpiar código), dentro de un `async with db.begin()` explícito.
- **Generación de `activation_code`** (`apps/api/app/modules/members/models.py:10-14`) — usa `secrets.choice` (criptográficamente seguro) sobre un alfabeto sin caracteres ambiguos (sin `0/O/1/I`), mejor que el equivalente de Supabase (`upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))`, que si bien también es aleatorio, no filtra caracteres ambiguos para lectura humana).
- **Tests** (`apps/api/tests/modules/test_auth.py`, `test_members.py`, `test_activation.py`) — existen y corren contra Postgres real (no SQLite), buena práctica a mantener.

### Descartar o rediseñar antes de continuar

- **Modelo de roles** (`apps/api/app/modules/users/models.py:12-19`) — calco exacto del `CHECK` de Supabase (`client`/`trainer`/`admin`/`receptionist`/`platform_admin`), con el mismo gap que D1: no existe `gym_admin_secondary`, y el naming (`admin` en vez de `gym_admin`) tampoco corresponde al vocabulario de `REQUERIMIENTOS_BACKEND_GYM.md §2.1`. **No continuar Fase 2 sobre este enum sin corregirlo primero** — cualquier módulo nuevo que se apoye en `STAFF_ROLES`/`Role` heredará el mismo problema.
- **Límite de cuentas por rol** — no implementado todavía en `apps/api` (no hay módulo de alta de staff), pero si se continúa el patrón de `apps/web/app/api/staff/route.ts` sin corregirlo primero, se heredaría tanto el límite incorrecto (1+1 en vez de 1+1+3) como, potencialmente, el mismo tipo de bug de CRIT-01 si no se es cuidadoso — el `AuthzService.gym_scope()` ya existente es la herramienta correcta para evitarlo, solo falta usarla también en el futuro endpoint de alta de staff.
- **Ningún módulo de `trainer_clients`/QR/pagos/inventario existe todavía** — no hay nada que "descartar" ahí porque no se llegó a escribir, pero tampoco hay nada que acelere esas fases; deben diseñarse desde cero considerando D2/D3 (§9), no asumiendo que el flujo manual de Supabase es el objetivo.
- **Doble backend sin decisión formal**: hoy nadie ha decidido explícitamente si `apps/api` continúa como el backend real o se reinicia — se recomienda una decisión explícita (documentada, no implícita) antes de invertir más tiempo en Fase 2, dado que gran parte de la arquitectura (auth, members, activation) ya está bien encaminada y descartarla sería costoso sin una razón concreta.

---

## 7. Hallazgos de QA traducidos a requisitos del backend real

Referencia completa con reproducción y archivo:línea en `docs/QA_AUDIT_REPORT_GYM.md`. Aquí solo la traducción a "qué debe garantizar el backend nuevo para que esto no vuelva a pasar".

### Críticos

| Hallazgo QA | Causa raíz hoy | Requisito para el backend real |
|---|---|---|
| **CRIT-01** — un admin crea staff en otro gimnasio pasando `gymId` en el body | `apps/web/app/api/staff/route.ts:66`: `targetGymId = gymId ?? callerProfile.gym_id` acepta el valor del cliente sin verificar pertenencia cuando el caller no es `platform_admin` | **Todo endpoint de creación/escritura debe derivar el `gym_id` exclusivamente del usuario autenticado** (vía una dependencia/middleware equivalente a `AuthzService.gym_scope()`, que ya existe en `apps/api` y ya se usa correctamente en `members/router.py`) — nunca aceptar `gymId`/`gym_id` en el body salvo, explícitamente, cuando el caller es `platform_admin` administrando multi-sucursal. Aplicar este patrón sistemáticamente a todos los módulos nuevos, no solo a `members`. |
| **CRIT-02** — mutaciones sin `await`/`try-catch`, fallos de Supabase invisibles para el usuario | Patrón de implementación en el frontend (`apps/web/lib/store.tsx`, múltiples handlers de página) | No es un requisito de backend en sí — pero el backend real debe devolver **códigos de error HTTP claros y consistentes** (400/403/409/422 según el caso) para que el frontend que lo consuma tenga algo real que capturar; hoy varios errores de Supabase/RLS se manifiestan como excepciones genéricas que el frontend ni siquiera intenta capturar. Recomendación: definir un contrato de error uniforme (`{ error: string, code: string }`) desde el primer endpoint, siguiendo el patrón ya usado en `apps/api/app/core/exceptions.py`. |
| **CRIT-03** — membresías con precio negativo o duración cero se propagan a pagos e ingresos | Validación solo en UI (`apps/web/app/memberships/page.tsx`), sin `<form>` ni chequeo server-side | El backend debe validar `price > 0` y `duration > 0` (y similares: `quantity >= 0`, `salePrice >= 0` en inventario) a nivel de schema/servicio, **nunca confiar en que el frontend ya validó** — mismo principio que `REQUERIMIENTOS_BACKEND_GYM.md §6`: "ningún campo calculado server-side aceptado en el body", extendido aquí a "ningún valor de negocio sin rango válido aceptado sin validar". |

### Altos (resumen — detalle completo en QA_AUDIT_REPORT_GYM.md)

| Hallazgo QA | Requisito para el backend real |
|---|---|
| ALTA-01/02/03 — control de acceso por rol es solo "ocultar UI", `/staff` y `/settings` accesibles por URL directa, `/platform` expone datos de todos los gimnasios en el bundle JS | Toda autorización debe resolverse **server-side en cada request**, nunca confiar en que el frontend oculta un botón o un link — exactamente el principio ya declarado en `REQUERIMIENTOS_BACKEND_GYM.md §6` ("nunca confiar en rol/tenant que venga del cliente"). El listado de gimnasios de plataforma debe ser un endpoint autorizado (`platform_admin` únicamente), nunca datos empaquetados estáticamente en el frontend. |
| ALTA-04 — "Simular desconexión" no deshabilita el escáner real | No es un requisito de backend — nota para la implementación del frontend nuevo: si se conserva un modo de simulación, debe propagarse realmente al componente de escaneo. |
| ALTA-05 — fecha "2026-07" hardcodeada en un contador | No es un requisito de backend — si el backend expone un endpoint de agregados por miembro (ej. "accesos este mes"), debe calcular el rango de fecha en el servidor con la fecha actual real, nunca aceptar o hardcodear el mes. |
| ALTA-06 — miembro creable con `membershipId` vacío si no hay planes activos | El backend debe rechazar la creación de un miembro sin un plan de membresía válido y activo (400), en vez de aceptar un `membership_plan_id` nulo/inválido silenciosamente. |
| ALTA-07 — sin manejo de error visible en alta de miembro | Igual que CRIT-02: contrato de error consistente y códigos HTTP correctos. |
| ALTA-08 — pago fuerza `status: 'active'` sin comparar la nueva fecha de vencimiento contra hoy | La lógica de "estado resultante tras un pago" debe vivir **en el servidor** (servicio de pagos), calculando `status` a partir de la fecha de vencimiento resultante, nunca fijándolo incondicionalmente — y debe ejecutarse en la **misma transacción** que el insert del pago (hoy son dos llamadas independientes desde el cliente, §3.5). |
| ALTA-09/ALTA-10 — inventario sin validación de cantidad/precio negativos, se propaga a ventas | Mismo principio que CRIT-03: validar rangos en el servidor, en el módulo de inventario. |
| ALTA-11 — `photoUrl` de miembro nunca se usa en la UI | No es un requisito de backend — confirmar con negocio si la funcionalidad de foto de miembro se retoma (y entonces sí exponerla en el contrato de API) o se retira del modelo de datos para no arrastrar un campo sin consumidor real. |

---

## 8. Reglas que deben migrar/reforzarse en el backend (formato ficha, igual que la auditoría de referencia)

```
Archivo: apps/web/app/api/staff/route.ts:66-88
Función: POST /api/staff — cálculo de targetGymId y límite de cuentas activas
Qué hace: Deriva el gimnasio destino del body si viene, valida el límite de 1 admin + 1 recepcionista activos.
Por qué no debe vivir así en el backend real: gymId del body sin validar contra el caller es un IDOR de tenant (CRIT-01); el límite mismo está mal (falta admin_secondary y 3 recepcionistas, D1).
Propuesta backend: endpoint de alta de staff que (a) derive gym_id de authz.gym_scope() salvo platform_admin explícito, (b) valide el límite real (1 gym_admin + hasta 1 gym_admin_secondary + hasta 3 receptionist) con COUNT(*) dentro de la misma transacción de inserción.
Endpoint sugerido: POST /staff (o /gyms/{gym_id}/staff si se prefiere anidado).
Tablas involucradas: users (o profiles), gyms.
```

```
Archivo: supabase/schema.sql (función validate_access) + apps/web/lib/store.tsx:1160-1239
Función: validate_access(code, reader) — validación de QR + recálculo de status del miembro como side-effect
Qué hace: Valida el código, inserta el log de acceso, y solo entonces actualiza members.status si detecta expiración.
Por qué conviene revisar el diseño antes de portarlo: el status del miembro queda desactualizado indefinidamente si nadie escanea su QR — puede ser aceptable (el negocio decide si "vencido pero no detectado" importa fuera del control de acceso, p. ej. en reportes) pero debe ser una decisión explícita, no un efecto secundario incidental de la función de acceso.
Propuesta backend: decidir si el estado de vigencia se recalcula (a) solo al validar acceso (como hoy), (b) también en un job periódico, o (c) siempre derivado en el momento de la lectura (GET) sin persistirlo — evaluar impacto en reportes/consultas que hoy leen members.status directamente.
Endpoint sugerido: POST /access/validate (equivalente a validate_access); decidir si se agrega un job GET /internal/recalculate-member-statuses o se deriva en cada GET /members.
Tablas involucradas: members, access_logs, membership_plans (tolerance_days).
```

```
Archivo: apps/web/lib/store.tsx:1028-1078 (completeInventorySale) + inexistencia de tabla inventory_sales
Función: Venta de tienda
Qué hace: Se procesa completamente en memoria del cliente (React state), sin ninguna tabla persistente ni transacción real — el descuento de stock sí persiste (updateInventoryItem por línea, sin agrupar), pero la venta en sí se pierde al recargar la página.
Por qué no debe vivir así en el backend real: es la brecha de datos más grande del sistema — no hay ningún historial real de ventas de tienda, y el descuento de stock no es atómico con el registro de la venta.
Propuesta backend: tabla inventory_sales + inventory_sale_items, y un único endpoint transaccional que valide disponibilidad de TODAS las líneas, descuente stock y registre la venta en una sola transacción de base de datos.
Endpoint sugerido: POST /inventory/sales.
Tablas involucradas: inventory_items, inventory_sales, inventory_sale_items.
```

```
Archivo: apps/web/app/trainers/page.tsx (assignTrainer/unassignTrainer) vs. inexistencia de mecanismo QR
Función: Vinculación entrenador↔cliente
Qué hace: Solo existe el camino manual (staff asigna desde el dashboard); no existe ningún RPC/endpoint que un trainer autenticado pueda invocar para autoasignarse un cliente escaneando su QR.
Por qué no debe portarse tal cual: contradice el flujo de negocio confirmado (REQUERIMIENTOS_BACKEND_GYM.md §2.3) — ver D2 en §9, decisión de producto pendiente.
Propuesta backend: si se confirma el flujo QR, un endpoint equivalente a rotate_my_access_code() pero para el lado del entrenador: POST /trainer/link-client { access_code } que (a) resuelva el member dueño de ese código de acceso vigente, (b) cree/actualice la fila de vínculo con trainer_id = current_user.id, (c) respete el unique(client_id) (un cliente, un entrenador a la vez). Decidir si el camino manual del dashboard se retira o se conserva como respaldo explícito.
Endpoint sugerido: POST /trainer/link-client (nuevo); decidir si POST /trainers/{id}/clients (manual) se conserva o se elimina.
Tablas involucradas: trainer_clients, client_access_codes, members.
```

---

## 9. Gaps estructurales — decisiones de diseño pendientes (no código a preservar)

### D1 — Modelo de roles de staff incompleto

Ya detallado en §4 y §6. Bloqueante para diseñar `users`/`profiles` del backend real. Ver `REQUERIMIENTOS_BACKEND_GYM.md §2.1` para la especificación de negocio ya confirmada (`gym_admin`, `gym_admin_secondary` máx. 1, `receptionist` máx. 3, límites validados server-side con `COUNT(*)` transaccional).

### D2 — Asignación entrenador↔cliente: manual (implementada) vs. QR (especificada)

El dashboard implementa y persiste completamente el flujo manual (`apps/web/app/trainers/page.tsx`, tabla `trainer_clients` con RLS que solo permite escritura a `admin`/`receptionist`). El flujo QR especificado en `REQUERIMIENTOS_BACKEND_GYM.md §2.3` no tiene ninguna pieza construida — ni RPC en Supabase, ni endpoint en `apps/api`, ni pantalla en `apps/mobile/src/app/(trainer)/`. **Decisión pendiente de negocio** (no tomada en esta auditoría, documentada tal cual el pedido original): ¿se elimina el flujo manual y se reemplaza enteramente por QR, o coexisten (QR como principal, manual como respaldo explícito para cuando el entrenador no tiene el teléfono a mano)? Cualquiera que sea la decisión, la tabla `trainer_clients` actual (con su `unique(client_id)`) sirve para ambos casos sin cambios de esquema — el gap está en la capa de aplicación, no en el modelo de datos.

### D3 — QR de acceso propio del entrenador + pantalla de escaneo, ausentes

Confirmado ausente en `apps/mobile/src/app/(trainer)/` (cero referencias a `QR`/`Camera`/`Scan` en los tres archivos de esa carpeta) y en el resto del repo (no existe ningún componente de cámara/escáner fuera de `apps/web/components/camera/`, que es exclusivamente para uso de recepción en el dashboard, no para el entrenador desde su celular). Dos piezas pendientes, relacionadas con D2 pero distintas entre sí:
1. **QR de acceso propio del entrenador** al gimnasio (análogo al de `apps/mobile/src/app/(client)/index.tsx`) — no depende de la decisión D2, es un requisito independiente ya confirmado en `REQUERIMIENTOS_BACKEND_GYM.md §2.3` ("también generan su propio QR de acceso... hay un popup faltante").
2. **Pantalla de escaneo del lado del entrenador** — depende directamente de cómo se resuelva D2 (si el flujo QR se implementa, esta pantalla es la que lo consume).

---

## 10. Riesgos consolidados

1. **CRIT-01** — IDOR de tenant en `POST /api/staff` (gymId aceptado del body).
2. **Modelo de roles no soporta el negocio real** (D1) — bloqueante de producto, no solo de código.
3. **Estado de vigencia del miembro (`status`) con más de un escritor** (`validate_access()` en Supabase, `PaymentModal` en el frontend) sin una única fuente de verdad ni transacción que los una.
4. **Ventas de tienda sin persistencia real** — se pierden al recargar la página; el módulo de inventario más usado del día a día (recepción vendiendo productos) no tiene ningún historial durable hoy.
5. **Autorización por rol resuelta solo en el cliente** en la mayoría de las páginas del dashboard (ALTA-01/02/03) — ningún guard server-side, todo depende de RLS de Supabase para los datos y de nada para el contenido de la página en sí.
6. **`super_admin` referenciado en el frontend sin poder persistir** en el esquema actual — código aspiracional/muerto que puede confundir a quien lea `apps/web/lib/store.tsx`/`staff/page.tsx` pensando que ese rol ya funciona.
7. **Estados vestigiales sin productor**: `payments.status = 'pending'`/`'corrected'` existen en el CHECK constraint pero ninguna función los alcanza — mismo patrón de gap que `admin-panel-j2ec` documentó como riesgo #6 en su propia auditoría (`activation_error` sin productor).
8. **Doble backend sin decisión formal** (`apps/api` vs. reinicio completo) — cuanto más tiempo pase sin decidir, más costoso será descartar o continuar Fase 1.
9. **Mecanismo de QR de acceso no es autoverificable** — depende de una tabla + rotación cada 20s, no de un token firmado (HMAC/JWT) como sugiere `REQUERIMIENTOS_BACKEND_GYM.md §5`; funciona hoy pero implica una consulta a BD en cada validación, sin posibilidad de verificar el token sin tocar la base de datos.
10. **Generación de IDs/números de negocio en el cliente** (`member_number`) — mismo patrón de riesgo de concurrencia ya documentado como riesgo #1 en la auditoría de `admin-panel-j2ec`; aquí mitigado parcialmente por el índice único `(gym_id, member_number)`, pero sin manejo de ese error 409 en el frontend (se sumaría a CRIT-02).

---

## 11. Recomendaciones antes de iniciar backend

1. **Decidir D1 y D2 con negocio antes de tocar el esquema** — son las dos únicas decisiones que cambian la forma de las tablas `users`/`profiles` y `trainer_clients`/vínculo entrenador-cliente; todo lo demás del esquema actual de Supabase es un buen punto de partida tal cual.
2. **Formalizar qué pasa con `apps/api`**: continuar Fase 2 sobre la base ya construida (recomendado dado que `AuthzService`, `members`, `activation` ya están bien resueltos y sin el bug de CRIT-01), o reiniciar — pero decidirlo explícitamente, no dejarlo en ambigüedad mientras crece.
3. **Diseñar la tabla de ventas de tienda (`inventory_sales`) desde cero** — es la única entidad de negocio activa hoy que no tiene ninguna persistencia real, ni siquiera parcial.
4. **Replicar el patrón `AuthzService.gym_scope()` de `apps/api` a todo endpoint de escritura nuevo**, incluyendo el que reemplace a `/api/staff` — es la pieza concreta que evita que CRIT-01 se repita.
5. **Definir el contrato de error de la API** (código HTTP + payload consistente) antes de escribir el primer endpoint nuevo — el frontend actual demuestra qué pasa cuando no hay ningún error que capturar (CRIT-02): todo se silencia.
6. **Decidir el mecanismo del QR de acceso** (mantener tabla + rotación vs. migrar a HMAC/JWT autoverificable) antes de implementar D3 — afecta directamente cómo se diseña el endpoint de escaneo del entrenador.
7. Con lo anterior resuelto, proceder con: `SCHEMA_PROPUESTO.md` (equivalente al de `admin-panel-j2ec`), `API_PROPUESTA.md`, y la implementación por fases con tests, siguiendo el mismo patrón ya usado en `admin-panel-j2ec-backend` y ya iniciado (correctamente, en su mayor parte) en `apps/api`.

---

## 12. Gaps de backend encontrados al conectar apps/web a apps/api (2026-07-15)

Al conectar el dashboard real (`apps/web`) a `apps/api` por primera vez (login, miembros,
membresías, inventario/ventas, control de acceso QR), se hizo evidente que varias
mutaciones que el dashboard actual da por sentadas **no tienen endpoint todavía**.
Se decidió (con el usuario) no inventar ese comportamiento en el frontend ni construir
los endpoints hoy — solo conectar lo que existe, deshabilitar el resto con un mensaje
honesto, y dejar la lista exacta aquí para la siguiente fase de construcción del backend:

| Falta en `apps/api` | Se necesita para | Tratamiento hoy en `apps/web` |
|---|---|---|
| `PATCH /members/{id}` | Bloquear, desbloquear, archivar, editar, dar acceso temporal a un miembro | `updateMember` muestra alert honesto y rechaza — el botón "Bloquear" en `/members` y `/members/[id]` sigue visible pero no completa la acción. "Registrar pago" **ya no depende de esto** (ver fila resuelta abajo) — tiene su propio endpoint. |
| ~~Módulo `payments` completo (no existe ningún router)~~ **Resuelto 2026-07-19** | Registrar pago al dar de alta un miembro, cobrar renovaciones, cancelar pagos, reportes de ingresos por membresía | `POST/GET /members/{id}/payments` implementados (`apps/api/app/modules/member_payments/`) — ver §3.5. Renovaciones (registrar un pago a un miembro existente) funcionan de punta a punta. **Sigue pendiente**: cobrar el pago inicial al dar de alta un miembro (`MemberForm` sigue ocultando ese checkbox), cancelar/corregir pagos (`cancelPayment` sigue siendo stub — no se pidió en esta fase), y reportes de ingresos. |
| `members.service.create_member` no calcula `status`/`start_date`/`expiration_date` a partir de `membership_plan_id` | Que un miembro recién creado quede con una vigencia real en vez de fechas nulas | Documentado — depende del módulo de pagos de arriba, no es un fix aislado de members |
| `GET /gyms/me` (o equivalente) — hoy `GET /gyms` es `platform_admin`-only | Que un `gym_admin` pueda leer los datos de su propio gimnasio (nombre, dirección, prefijo, moneda) | `gym` queda `null` en modo API real; `Sidebar`/`PeakHoursReport`/`customer-support` ya degradan con `gym?.name ?? 'Cargando...'` (no crashean) pero nunca dejan de mostrar el placeholder |
| `MemberRead` no expone `membership_plan_id` ni `created_by` | Mostrar el nombre del plan de un miembro en listados/perfil, y quién lo dio de alta | `Member.membershipId`/`createdBy` quedan `''`; la UI ya tenía fallback `membership?.name ?? '—'` en la mayoría de los sitios |
| `InventorySaleRead` no expone `registered_by` | Mostrar quién registró una venta | `InventorySale.registeredBy` queda `''` |
| `AccessLogRead` no expone `member_number`/`member_name` | Mostrar el nombre del miembro directamente en el log de acceso | Se resuelve en el cliente cruzando `member_id` contra la lista de miembros ya cargada (`lib/api/mappers.ts:mapAccessLog`) — no requiere cambio de backend si no se quiere, es solo menos eficiente que traerlo ya resuelto |
| Ningún módulo de staff (`/staff`, `/settings`, `/platform` sin backend) | Gestión de personal, configuración del gimnasio, panel de plataforma | Fuera de alcance de esta conexión — ver ALTA-01/02/03 en `QA_AUDIT_REPORT_GYM.md` |

**Efecto secundario a tener en cuenta**: el store (`lib/store.tsx`) es un único contexto
global — no hay un provider distinto por ruta. Esto significa que, aunque `/staff` y
`/settings` no se conectaron a propósito, sí dejaron de recibir los datos **mock**
que mostraban antes (`staff`, `gym` ahora llegan vacíos/`null` en modo API real, en vez
del set de datos demo). No crashean (verificado), pero muestran tablas vacías en vez del
contenido de ejemplo — es un costo aceptado de mantener una sola fuente de verdad para el
store en vez de un provider condicional por ruta, documentado aquí para que no se lea como
un bug nuevo si alguien lo nota.

**Lo que sí quedó 100% conectado y verificado con requests reales** (ver sesión del
2026-07-15): login (`POST /auth/login`), listar/crear miembros, listar/crear membresías,
listar/crear inventario, crear venta de inventario (`POST /inventory/sales`, con
descuento de stock verificado en Postgres), generar y escanear QR de acceso real
(`POST /access/my-qr-token` + `POST /access/scan`, con aislamiento cross-gym verificado
en la UI conectada, no solo en el backend).
