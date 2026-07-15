# Reporte de Auditoría Funcional (QA) — template-gym

**Fecha**: 2026-07-15
**Rama auditada**: `Cambios-cesar` (actualizada a `origin/Cambios-cesar`)
**Alcance**: dashboard web (`apps/web`), esquema/RLS de Supabase (`supabase/`), app móvil (`apps/mobile`) y backend Fase 1 (`apps/api`)
**Rol del auditor**: QA — intentar romper el sistema, no revisar arquitectura ni estilo de código. No se corrigió nada; solo se reporta.
**Metodología**: no había herramienta de navegador disponible en este entorno. Cada flujo se auditó leyendo el código de extremo a extremo (componente → handler → validación → store → Supabase/RLS), igual que un QA manual pero sin clic real. Cada hallazgo listado abajo está respaldado por archivo y línea concretos — no se reporta nada especulativo.

---

## Aclaración de contexto (léase antes de los hallazgos)

El entorno actual apunta a un **Supabase self-hosted en la Raspberry Pi** (`192.168.0.15:8010`, ver `apps/web/.env.example`) con su propio esquema SQL y políticas RLS (`supabase/schema.sql` + 5 migraciones sueltas). **Esto es un entorno de prueba/desarrollo temporal, no la decisión de stack final.** Según `REQUERIMIENTOS_BACKEND_GYM.md` (raíz del repo), el backend real será **FastAPI + PostgreSQL + SQLAlchemy async**, con aislamiento multi-tenant implementado como filtrado manual por `gym_id` en cada query — no RLS de Postgres/Supabase.

Por eso, en este reporte:
- Todo lo que hoy vive en `supabase/schema.sql` y sus RLS se documenta como **"regla de negocio actualmente vigente en el prototipo"**, útil como referencia de qué datos y qué reglas ya se pensaron — **no** como el diseño a preservar tal cual en el backend real.
- `apps/api` ("Fase 1: auth + members", commit `d54585c9`) es un backend FastAPI **ya iniciado pero completamente desconectado** del frontend actual (`apps/web` no hace ninguna llamada a `apps/api` — se confirmó con grep, cero referencias a `localhost:8000` o rutas de esa API en todo `apps/web`). Su modelo de roles (`apps/api/app/modules/users/models.py`) es un calco del de Supabase (`admin`/`receptionist`/`platform_admin`/`client`/`trainer`) y **tiene la misma brecha** frente al modelo de negocio real (ver Hallazgo D1 más abajo) — no es "aprovechable tal cual", debe rediseñarse el modelo de roles antes de continuarlo.

---

## Resumen ejecutivo

| Categoría | Cantidad |
|---|---|
| Crítica | 3 |
| Alta | 11 |
| Media | 8 |
| Baja | 9 |
| Hallazgos de diseño (a confirmar con negocio, no "bugs") | 2 |

Los tres hallazgos más importantes:

1. **Fuga de aislamiento multi-tenant real**: un admin de un gimnasio puede crear cuentas de staff en **otro** gimnasio con solo enviar su `gymId` en el body del request (`CRIT-01`).
2. **El modelo de roles implementado (frontend y backend Fase 1) no corresponde al modelo de negocio real**: no existe `gym_admin_secondary`, y el límite de recepcionistas es 1, no 3 (`D1`).
3. **La asignación manual "cliente → entrenador" desde el dashboard SÍ existe** y contradice el flujo real (el entrenador debe vincularse escaneando el QR del miembro desde su propia app) — confirmado explícitamente a pedido (`D2`). El QR de acceso propio del entrenador, y la pantalla de escaneo en la app del entrenador, **no existen** — confirmado ausente, no inventado (`D3`).

---

## Hallazgos confirmados explícitamente a pedido

### D1 — El modelo de roles no soporta `gym_admin_secondary` ni "hasta 3 recepcionistas"

**Severidad: Alta** (bloqueante de negocio — no es un bug puntual, es una capacidad inexistente en todo el stack).

**Cómo reproducir:**
1. Modo Supabase, sesión como `admin` de un gimnasio con ya 1 admin y 1 recepcionista activos.
2. Ir a `/staff` → botón "Nuevo personal" desaparece; el único mensaje es "Se alcanzó el límite de cuentas para este gimnasio" (`apps/web/app/staff/page.tsx:105-106`).
3. No existe ningún control, en ningún punto de la UI ni del backend, para dar de alta un segundo administrador (`gym_admin_secondary`) ni un tercer recepcionista.

**Esperado vs. actual:**
- Esperado (`REQUERIMIENTOS_BACKEND_GYM.md` §2.1): `gym_admin` (principal) + `gym_admin_secondary` (máx. 1) + `receptionist` (máx. 3), con el límite validado server-side vía `COUNT(*)` transaccional.
- Actual: el tipo `CreatableRole` en la UI es literalmente `'admin' | 'receptionist'` (`apps/web/app/staff/page.tsx:25`), la tabla de Personal solo tiene una fila por rol (`pickForRole`, líneas 30-37), y el límite server-side en `apps/web/app/api/staff/route.ts:74-88` permite como máximo **1** cuenta activa de `admin` y **1** de `receptionist` por gimnasio — no 1+1+3. El rol `admin_secondary` no existe ni en el enum de Postgres (`supabase/schema.sql:42`) ni en `apps/api/app/modules/users/models.py`.

**Archivos involucrados**: `apps/web/app/staff/page.tsx`, `apps/web/app/api/staff/route.ts`, `apps/web/lib/store.tsx` (función `addStaff`), `apps/web/lib/auth.tsx` (`STAFF_ROLES`), `supabase/schema.sql:42`, `apps/api/app/modules/users/models.py`.

**Propuesta**: no es un fix de este prototipo — es un rediseño de modelo de datos que debe resolverse en el backend real (FastAPI). Documentar como requisito de diseño de `SCHEMA_PROPUESTO.md`/`API_PROPUESTA.md` del nuevo backend: rol `gym_admin_secondary` (máx. 1 activo) + `receptionist` (máx. 3 activos), validado con `COUNT(*)` dentro de la misma transacción de creación, replicando exactamente el patrón que ya usa `admin-panel-j2ec-backend`.

---

### D2 — Existe una UI de "asignar cliente a entrenador" manual en el dashboard (contradice el flujo real de negocio)

**Severidad: Hallazgo de diseño** (no es un "bug" del código — el código hace lo que su autor quiso, pero contradice el flujo de negocio confirmado).

**Confirmado en**: `apps/web/app/trainers/page.tsx`.
- Botón "Asignar cliente" por cada entrenador (línea 117: `<button onClick={() => openAssign(trainer)} ... title="Asignar cliente">`).
- Modal "Asignar cliente" (líneas 182-206) con un `<select>` de miembros y un botón "Asignar" que llama `assignTrainer(selectedClientId, assignTarget.id)` (línea 80).
- También existe el flujo inverso: "Desasignar" (`unassignTrainer`, línea 214).
- Esto persiste directamente en la tabla `trainer_clients` de Supabase (`apps/web/lib/store.tsx:1092-1104`), la misma tabla que la app móvil del entrenador lee para mostrar "Mis clientes" (`apps/mobile/src/hooks/use-gym-data.ts` vía `useMyClients`).

**Esperado vs. actual**: según `REQUERIMIENTOS_BACKEND_GYM.md` §2.3, el vínculo entrenador↔cliente debe originarse **solo** cuando el entrenador escanea el QR del miembro desde su propia app móvil — nunca desde una asignación manual del dashboard. Actualmente el dashboard ofrece ambas cosas: una UI manual completamente funcional, y **ninguna** funcionalidad de escaneo del lado del entrenador (ver D3) — es decir, hoy la única forma real de vincular a un cliente con un entrenador es la manual, que es exactamente la que el negocio dice que no debería existir.

**Propuesta**: decisión de producto pendiente antes de tocar el backend real: (a) eliminar la asignación manual del dashboard y reemplazarla enteramente por el flujo QR desde la app del entrenador, o (b) si se decide conservarla como mecanismo de respaldo (ej. para cuando el entrenador no tiene el teléfono a mano), documentarlo explícitamente como excepción intencional y no como mock accidental. No se tomó ninguna acción — se deja para decisión de negocio.

---

### D3 — No existe QR de acceso propio del entrenador, ni pantalla de escaneo en la app del entrenador

**Severidad: Ausente / pendiente de implementar** (confirmado, no inventado).

**Verificación realizada**:
- `apps/mobile/src/app/(client)/index.tsx` — el miembro (`client`) sí tiene una pantalla "QR de acceso" completa: `import QRCode from 'react-native-qrcode-svg'` (línea 4), bloqueo de capturas de pantalla (línea 29-35), renderizado del QR (línea 91), y texto "Escanea para entrar" (línea 98).
- `apps/mobile/src/app/(trainer)/(tabs)/index.tsx`, `profile.tsx`, `client/[id].tsx` — se buscó `QR|qr|Camera|Scan` en los tres archivos: **cero coincidencias**. El home del entrenador solo lista "Mis clientes" (leídos de `trainer_clients`, la tabla poblada por la asignación manual de D2) — no hay botón de escaneo, ni pantalla de cámara, ni generación de un código propio.
- No existe ningún componente de cámara/escáner en `apps/mobile` en absoluto (`find apps/mobile/src -iname "*scan*" -o -iname "*camera*"` no arroja resultados; el escaneo con cámara solo existe del lado del dashboard web, en `apps/web/components/camera/`, pensado para que **recepción** escanee el QR del miembro, no para que el entrenador lo haga desde su celular).

**Propuesta**: implementar en la app del entrenador (a) una pantalla de "Mi QR" (acceso del propio entrenador al gimnasio, análoga a la del cliente) y (b) una pantalla de escaneo de cámara que, al leer el QR de un miembro, dispare la vinculación entrenador↔cliente en el backend (reemplazando o complementando D2, según la decisión de producto). Ninguna de las dos existe hoy — no hay código parcial ni placeholder que sugiera un intento previo.

---

## Hallazgos críticos

### CRIT-01 — Un admin puede crear cuentas de staff en OTRO gimnasio enviando un `gymId` arbitrario

**Severidad: Crítica** (fuga real de aislamiento multi-tenant).

**Cómo reproducir:**
1. Autenticarse como `admin` del Gimnasio A (rol `admin`, `gym_id = A`).
2. Llamar `POST /api/staff` con `Authorization: Bearer <token de A>` y body:
   ```json
   { "firstName": "X", "email": "x@x.com", "role": "receptionist", "gymId": "<uuid del Gimnasio B>" }
   ```
3. El endpoint crea la cuenta con `gym_id = B`.

**Esperado vs. actual**: se esperaría que el `gymId` de destino se derive **siempre** del perfil del caller (a menos que el caller sea `platform_admin`, que sí gestiona múltiples gimnasios). En el código actual (`apps/web/app/api/staff/route.ts:66`):
```ts
const targetGymId = gymId ?? callerProfile.gym_id;
```
Esta línea acepta el `gymId` que venga en el body del request **sin verificar que el caller tenga permiso sobre ese gimnasio**, cuando el caller es `admin` (no `platform_admin`). El único chequeo de rol previo (línea 48) es `['admin', 'platform_admin'].includes(callerProfile.role)` — no distingue el caso "admin intentando operar fuera de su propio gimnasio".

**Archivos involucrados**: `apps/web/app/api/staff/route.ts:42-88`.

**Propuesta de solución**: forzar `targetGymId = callerProfile.role === 'platform_admin' ? (gymId ?? callerProfile.gym_id) : callerProfile.gym_id` — es decir, ignorar por completo el `gymId` del body salvo cuando el caller es `platform_admin`. Este es exactamente el tipo de IDOR que `REQUERIMIENTOS_BACKEND_GYM.md` §3 menciona como "aprendizaje directo de los 2 IDOR reales encontrados en admin-panel-j2ec" — reforzar que el backend real use un middleware que inyecte `gym_id` del usuario autenticado automáticamente, sin aceptar nunca ese valor del cliente.

---

### CRIT-02 — Mutaciones "fire-and-forget": ningún formulario espera el resultado real ni muestra errores del backend

**Severidad: Crítica** (en modo Supabase real, cualquier fallo de red/RLS/constraint queda invisible para el usuario — incluye formularios que registran dinero).

**Cómo reproducir** (ejemplo con registro de pago): con una sesión cuyo RLS deniegue el insert en `payments`, o simplemente cortando la red al enviar, registrar un pago desde `PaymentModal`. El modal muestra "Registrando..." brevemente y se cierra como si hubiera tenido éxito. El pago nunca se guardó y no hay ningún indicio visual del fallo.

**Esperado vs. actual**: se esperaría `await` + `try/catch` + estado de error visible en cada mutación, tal como sí ocurre en `CheckoutModal.tsx` e `InventorySaleModal.tsx` (que sí implementan el patrón correctamente, sirviendo de contraejemplo positivo). En la práctica, no se implementó de forma consistente:

| Archivo | Línea(s) | Función afectada |
|---|---|---|
| `apps/web/components/payments/PaymentModal.tsx` | 62-88 | `addPayment` / `updateMember` sin `await` ni `catch` |
| `apps/web/app/members/page.tsx` | 77-97 | `handleBlock`, `handleUnblock`, `handleArchive`, `handleTempAccess` |
| `apps/web/app/members/[id]/page.tsx` | 45-75 | mismas acciones, mismo patrón |
| `apps/web/app/inventory/page.tsx` | 136-166 | `handleSave` → `addInventoryItem`/`updateInventoryItem`, que internamente hacen `throw` dentro de un `.then()` no capturado (`apps/web/lib/store.tsx:952-1015`) — un unhandled promise rejection silencioso |
| `apps/web/app/memberships/page.tsx` | 44-59 | `addMembership` / `updateMembership` |
| `apps/web/app/payments/page.tsx` | 194-206 | `handleCancelPayment` / `handleCancelSale` |
| `apps/web/components/shared/ConfirmationDialog.tsx` | 31 | cierra síncronamente en `onConfirm`, sin loading ni manejo de error — confirma el patrón a nivel de componente compartido |

**Propuesta de solución**: estandarizar el patrón que ya existe en `CheckoutModal`/`InventorySaleModal` (await + try/catch + estado de error visible + botón deshabilitado durante el envío) en los siete puntos listados arriba. Es un cambio mecánico, no de diseño, y debería hacerse antes de conectar el backend real, para no arrastrar el mismo patrón.

---

### CRIT-03 — Membresías se pueden crear con precio negativo o duración cero/vacía, y eso se propaga a pagos y vencimientos

**Severidad: Crítica** (impacta directamente ingresos reportados y el ciclo de vida de cualquier miembro que use el plan).

**Cómo reproducir (precio negativo):**
1. `/memberships` → "Nueva membresía" → nombre "Promo", precio `-500`, guardar.
2. El modal no está envuelto en un `<form>` (`apps/web/app/memberships/page.tsx:116-159`), así que los atributos `min="0"` de los inputs (líneas 128, 132, 136) nunca se validan (esa validación HTML5 solo se dispara en el evento `submit` de un `<form>` real).
3. `handleSave` (líneas 44-59) solo hace `if (!form.name || !form.price) return;` — `form.price` es un string y `"-500"` es truthy, así que pasa.
4. El plan se crea con `price: -500`. Al asignarlo a un miembro (`MemberForm.tsx:47`, autocompleta `paymentAmount: ms.price`) o al registrar un pago con ese plan (`PaymentModal.tsx:40-42`, `setAmount(String(selectedMembership.price))`), el pago se registra con monto negativo y resta de los totales de ingresos en `/payments`.

**Cómo reproducir (duración cero):** crear una membresía con "Duración" vacío o `0`. `Number('') === 0`; al asignarla a un miembro nuevo, `calcExpiration` (`MemberForm.tsx:19`, `addMonths(base, 0)`) devuelve la misma fecha de inicio — el miembro queda vencido el mismo día que se da de alta, sin ningún aviso.

**Archivos involucrados**: `apps/web/app/memberships/page.tsx` (líneas 44-59, 116-159), `apps/web/components/members/MemberForm.tsx:19,47`, `apps/web/components/payments/PaymentModal.tsx:40-42`.

**Propuesta de solución**: validar en `handleSave` que `Number(form.price) > 0` y `Number(form.duration) > 0` antes de permitir guardar, con mensaje de error visible (mismo patrón de validación que ya usa `MemberForm.validate()` para campos requeridos). Esta validación debe replicarse también server-side en el backend real — nunca confiar solo en el formulario.

---

## Hallazgos altos

### ALTA-01 — El control de acceso por rol en el dashboard es solo "ocultar el link del menú", no un guard real

**Severidad: Alta** (causa raíz de ALTA-02 y ALTA-03).

No existe `middleware.ts` en todo el repo (confirmado con `find`). El único guard compartido por todas las páginas es `if (!user) return null;` en `apps/web/components/layout/AppShell.tsx:46` — verifica sesión, nunca rol. En `apps/web/components/layout/Sidebar.tsx:27-28,45`, `/staff` y `/settings` llevan una bandera `adminOnly: true` que solo filtra qué `<Link>` se pinta en el menú (`visibleItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin')`) — no hay ningún redirect ni bloqueo de contenido asociado a esa bandera en ningún otro lugar.

**Esperado vs. actual**: un guard centralizado (middleware o wrapper de layout) que bloquee el render/fetch de datos según rol antes de montar la página. En la práctica, cada página decide por su cuenta si se protege, y la mayoría no lo hace (ver ALTA-02).

**Archivos**: ausencia de `middleware.ts`; `apps/web/components/layout/AppShell.tsx:46`; `apps/web/components/layout/Sidebar.tsx:27-28,45`.

**Propuesta**: implementar un guard de rol centralizado (middleware de Next.js o un wrapper de layout que reciba los roles permitidos por ruta) en vez de depender de que cada página implemente su propio chequeo — especialmente relevante para el rediseño con el backend real, donde además el guard del cliente debe respaldarse siempre con autorización server-side.

---

### ALTA-02 — `/staff` y `/settings` son accesibles por URL directa para `receptionist`, pese a estar marcadas `adminOnly`

**Severidad: Alta.**

**Cómo reproducir:**
1. Login con una cuenta `receptionist` (demo: `recepcion@americanfitness.demo`, ver `apps/web/data/staff.ts:34-39`).
2. Navegar directamente a `/staff` o `/settings` (sin pasar por el Sidebar, que oculta esos enlaces).
3. Ambas páginas renderizan por completo.

**Esperado vs. actual**:
- `apps/web/app/staff/page.tsx:50` — `const canEdit = user?.role === 'admin';` solo controla si se muestran botones de editar/desactivar y la columna "Opciones" (líneas 104-115, 127, 256-269). La tabla completa —incluyendo el Super Admin y su correo, y el Admin/Recepcionista con correo y último acceso (líneas 130-179)— se renderiza sin importar el rol de quien mira.
- `apps/web/app/settings/page.tsx:104` — mismo patrón: `canEdit` solo agrega `disabled={!canEdit}` a los inputs (líneas 173, 180, 187, 213, 226, 253, 266, 365). Un recepcionista puede ver en modo lectura toda la configuración: datos del gimnasio, configuración de acceso, métodos de pago habilitados y cámara/lectores.

**Archivos**: `apps/web/app/staff/page.tsx:50,104-115,127,130-179,256-269`; `apps/web/app/settings/page.tsx:104,173,180,187,213,226,253,266,365`.

**Propuesta**: agregar un guard temprano en ambos componentes (`if (user?.role !== 'admin') { router.push('/dashboard'); return null; }`), y resolverlo definitivamente con el guard centralizado de ALTA-01.

---

### ALTA-03 — `/platform`: guard 100% cliente + datos de todos los gimnasios incluidos en el chunk JS de la ruta

**Severidad: Alta** (patrón de exposición de datos multi-tenant, aunque hoy son datos mock/demo, no reales).

`apps/web/app/platform/page.tsx:7-9,25-29` importa `import { gyms } from '@/data/gyms'` de forma estática e incondicional (no depende de `isDemoMode()`, no hace ningún `fetch`/`supabase.from(...)`). El único guard es un `useEffect` (líneas 25-27) que redirige si `user.role !== 'platform_admin'`, con un `return null` mientras tanto (línea 29) — protección solo en cliente, después del mount, sin control server-side.

`apps/web/data/gyms.ts:1-56` contiene nombre, dirección, teléfono, correo, `subscriptionStatus` y `memberCount` de los 3 gimnasios de la plataforma. Al ser un import estático de nivel de módulo, Next.js lo incluye en el chunk JS compilado de `/platform` (confirmado: aparece literalmente en `.next/dev/static/chunks/_13jsru1._.js`), y ese chunk se sirve sin verificación de sesión ni rol — comportamiento estándar de CSR. El guard de rol solo decide qué se pinta en el DOM, no qué JS se descarga.

Adicional (bug funcional, no de seguridad): el botón "Suspender/Activar" (`apps/web/app/platform/page.tsx:108-112`) no tiene `onClick` — es decorativo.

**Archivos**: `apps/web/app/platform/page.tsx:7-9,25-29,108-112`; `apps/web/data/gyms.ts:1-56`.

**Propuesta**: en el backend real, el listado de gimnasios de plataforma debe obtenerse vía una consulta autorizada solo alcanzable por `platform_admin` (nunca empaquetada estáticamente en el bundle), con guard server-side. Corregir también el botón sin acción.

---

### ALTA-04 — El botón "Simular desconexión" del Monitor de Acceso es puramente cosmético — el escáner sigue funcionando

**Severidad: Alta** (induce a error a recepción sobre el estado real del sistema).

**Cómo reproducir:** en `/access-monitor`, hacer clic en "Simular desconexión" (`apps/web/app/access-monitor/page.tsx:45-47`). Aparece el banner "Sistema sin conexión. Los escaneos no están disponibles en este momento." (líneas 70-74). Sin embargo, escanear un código (cámara o entrada manual) sigue funcionando con normalidad: ni `ScannerViewport` ni `ScannerMiniPanel` reciben la prop `connected` — se confirmó con grep que ninguno de los dos componentes acepta `connected`/`disabled` derivado de ese estado (`apps/web/components/camera/ScannerViewport.tsx`, `apps/web/components/camera/ScannerMiniPanel.tsx`).

**Esperado vs. actual**: se esperaría que, mientras el banner de "sin conexión" esté activo, el escáner quede deshabilitado (coherente con el mensaje). En la práctica, es un estado puramente visual que no afecta ninguna funcionalidad real.

**Archivos**: `apps/web/app/access-monitor/page.tsx:18-19,45-47,70-83`.

**Propuesta**: pasar el estado `connected` a `ScannerViewport`/`ScannerMiniPanel` y deshabilitar la validación mientras esté en `false`, o (más simple) eliminar el botón si es solo un remanente de pruebas visuales sin intención de deshabilitar nada.

---

### ALTA-05 — Fecha de "mes actual" hardcodeada en el contador de accesos del perfil de miembro

**Severidad: Alta** (bug de fecha fija, silencioso, se activa solo a partir de agosto 2026).

`apps/web/app/members/[id]/page.tsx:179`:
```ts
{ label: 'Accesos este mes', value: memberAccesses.filter(a => a.timestamp.startsWith('2026-07')).length }
```
El string `'2026-07'` está hardcodeado en vez de derivarse de `new Date()`. Hoy (2026-07-15) el dato es correcto por coincidencia; el 1 de agosto de 2026 este contador mostrará siempre `0` para todos los miembros, de forma permanente, hasta que se corrija.

**Cómo reproducir**: abrir el perfil de cualquier miembro con accesos después del 31/07/2026 → pestaña "Resumen" → "Accesos este mes" muestra 0 aunque haya accesos ese mismo mes.

**Propuesta**: reemplazar por `new Date().toISOString().slice(0, 7)` (o equivalente) calculado en cada render.

---

### ALTA-06 — Gimnasio sin membresías activas: se puede crear un miembro con `membershipId: ''` y vencido desde el día 0

**Severidad: Alta.**

- `apps/web/components/members/MemberForm.tsx:151` — el `<select>` de membresía solo lista `memberships.filter(m => m.active)`; si no hay ninguna activa, el select queda vacío pero `form.membershipId` conserva su valor inicial (`memberships[0]?.id ?? ''`, línea 32) → `''`.
- `apps/web/components/members/MemberForm.tsx:15-17` (`calcExpiration`): si no encuentra el plan, retorna `startDate` tal cual → la fecha de vencimiento es igual a la fecha de inicio.
- `validate()` (líneas 54-61) no valida `membershipId` en absoluto.

**Cómo reproducir**: desactivar todas las membresías desde `/memberships`, luego `/members` → "Nuevo miembro" → llenar nombre/apellido/teléfono → guardar. El miembro se crea con `membershipId: ''` y vencido desde el día 0, sin ningún error.

**Propuesta**: agregar `membershipId` a `validate()` como campo requerido, y bloquear la creación de miembros (con mensaje claro) si el gimnasio no tiene ninguna membresía activa.

---

### ALTA-07 — `MemberForm` no maneja errores del backend — el modal se queda sin explicación si falla el guardado

**Severidad: Alta.**

`apps/web/components/members/MemberForm.tsx:63-103` — el `try { ... } finally { setLoading(false); }` no tiene bloque `catch`. Si `addMember`/`addPayment` lanzan (RLS, red, constraint), la promesa se rechaza, el botón se reactiva, pero no hay ningún mensaje visible — el modal permanece abierto sin ninguna pista.

**Propuesta**: agregar `catch` con estado de error visible, mismo patrón que se pide estandarizar en CRIT-02.

---

### ALTA-08 — `PaymentModal` fuerza `status: 'active'` sin comprobar si la nueva fecha de vencimiento sigue en el pasado

**Severidad: Alta.**

- `apps/web/components/payments/PaymentModal.tsx:18-24` (`calcNewExpiration`): para un miembro **bloqueado**, el checkbox "Iniciar vigencia desde hoy" ni siquiera se muestra (línea 130 solo lo hace visible si `member.status === 'expired'`), así que `startFromToday` permanece en `false` y la base del cálculo es `member.expirationDate`, que puede ser muy antigua.
- `apps/web/components/payments/PaymentModal.tsx:80-85` — tras registrar el pago, `updateMember(member.id, { ..., status: 'active' })` se fija incondicionalmente, sin comparar `newExpiration` contra hoy.

**Cómo reproducir**: bloquear a un miembro con `expirationDate` de hace 90 días. Sin poder marcar "iniciar desde hoy" (no existe esa opción para bloqueados), registrar un pago de 30 días. Resultado: `expirationDate` queda 60 días en el pasado, pero `status` se fuerza a `'active'`. En `/members` el badge mostrará "Activo" mientras la columna de días muestra "−60" en rojo — estado inconsistente, y el miembro recupera acceso real sin que su vigencia lo justifique.

**Propuesta**: calcular `status` final comparando `newExpiration` contra la fecha actual (`active` solo si `newExpiration >= hoy`), en vez de fijarlo siempre a `'active'`.

---

### ALTA-09 — El modal de Inventario no usa `<form>`: `min`/`type="number"` son cosméticos, se pueden guardar cantidades y precios negativos

**Severidad: Alta.**

El modal de Agregar/Editar artículo (`apps/web/app/inventory/page.tsx:397-461`) no está envuelto en `<form>` — el botón "Agregar"/"Guardar" (línea 457) es `onClick`, no `onSubmit`. La validación HTML5 `min="0"` (cantidad, línea 433) y `min="0" step="0.01"` (precios, líneas 446-448) solo se aplica al disparar `submit` de un `<form>` real; al no existir, nunca se valida. `handleSave` (líneas 136-166) solo valida `if (!form.name.trim()) return;`.

**Cómo reproducir**: Inventario → Tiendita → Agregar → nombre "Test", precio de venta `-50`, stock `-3` → Guardar. Se crea sin ningún error.

**Propuesta**: envolver el modal en `<form onSubmit>` o replicar la validación en `handleSave` explícitamente (`Number(form.quantity) >= 0`, `Number(form.salePrice ?? 0) >= 0`, etc.).

---

### ALTA-10 — Precio de venta negativo (de ALTA-09) se puede vender, generando ingresos negativos en reportes

**Severidad: Alta**, consecuencia directa de ALTA-09.

`completeInventorySale` (`apps/web/lib/store.tsx:1028-1078`) solo valida `item.salePrice === undefined` (línea 1041), nunca `< 0`. Un `salePrice` negativo se vende con normalidad desde `InventorySaleModal`, generando un `InventorySale.total` negativo que se suma tal cual a los totales de `/payments` (líneas 154-160: `membershipTotal`, `inventoryTotal`, `cashTotal`, etc.), distorsionando silenciosamente los reportes de ingresos.

**Propuesta**: validar `item.salePrice > 0` en `completeInventorySale`, además de corregir ALTA-09 en el origen.

---

### ALTA-11 — `MemberAvatar` nunca muestra la foto real del miembro (`photoUrl` desconectado de la UI)

**Severidad: Alta** (funcionalidad aparentemente soportada por el modelo de datos pero invisible en toda la UI).

`Member.photoUrl` existe como campo (`apps/web/lib/store.tsx:479`, mapeado desde `photo_url` de Supabase), pero `MemberAvatar` (`apps/web/components/members/MemberAvatar.tsx:16-21`) solo recibe `firstName`/`lastName`/`size`/`className` — nunca pinta ninguna foto, siempre iniciales con color por hash de nombre. Se confirmó con grep en todo `app/` y `components/` que `photoUrl` no se consume en ningún otro lugar de la capa web. Si existe algún flujo de captura de foto (cámara/upload) en otra parte, está completamente desconectado del componente visible en tabla de miembros y perfil.

**Propuesta**: si el negocio espera mostrar fotos, conectar `photoUrl` a `MemberAvatar` (renderizar `<img>` cuando exista, fallback a iniciales cuando no); si no es una funcionalidad planeada, retirar el campo del modelo para no generar falsas expectativas al construir el backend real.

---

## Hallazgos medios

| ID | Título | Archivo(s) | Resumen |
|---|---|---|---|
| MED-01 | Doble clic no protegido en Bloquear/Archivar/Desbloquear | `apps/web/app/members/page.tsx:193-199` | Los botones de acción no se deshabilitan durante la operación async; combinado con CRIT-02, un doble clic dispara dos mutaciones idénticas. No corrompe datos pero genera round-trips duplicados y, si el primero falla, el usuario no se entera. |
| MED-02 | Silencioso no-op si la membresía del miembro fue eliminada/desactivada | `apps/web/components/payments/PaymentModal.tsx:29,38,57,112-116` | Si el plan del miembro ya no existe entre las membresías activas, el `<select>` muestra visualmente la primera opción disponible pero el estado interno sigue apuntando al valor inválido. Al enviar, `if (!selectedMembership) return;` hace que "Registrar pago" no haga nada, sin ningún mensaje de error. |
| MED-03 | Sin advertencia proactiva si el producto no tiene precio configurado en venta manual | `apps/web/components/payments/InventorySaleModal.tsx:33,144-147,173` | El resumen muestra "$0.00 × 3 = $0.00" sin alerta visual (a diferencia de las alertas de stock, que sí están en rojo/naranja). El botón "Registrar venta" no se deshabilita por esto — el único bloqueo real es un error genérico tras enviar, capturado del backend (`apps/web/lib/store.tsx:1041`). Contrasta con el flujo de escaneo (`InventoryCartContext.tsx:53-56`), que sí bloquea proactivamente con `type: 'no_price'`. |
| MED-04 | SKU duplicado entre dos artículos de "Tiendita" hace que el segundo nunca sea escaneable | `apps/web/app/inventory/page.tsx:136-166`, `apps/web/lib/cart/InventoryCartContext.tsx:47` | No hay validación de unicidad de `sku`. El escaneo resuelve siempre con `inventory.find(...)`, que devuelve el primer match — un segundo producto con el mismo SKU jamás se puede agregar al carrito por escaneo, sin mensaje que explique la colisión. |
| MED-05 | Cambiar el "Área" de un artículo en edición no limpia campos que ya no aplican | `apps/web/app/inventory/page.tsx:139-162,404-407` | Editar un producto de "Tiendita" (con `sku`/`salePrice`/`minStock`) y cambiarlo a "Cardio" oculta esos campos del formulario pero los conserva en el estado y los guarda igual — queda un artículo de equipo con datos residuales de tienda. |
| MED-06 | Formato de teléfono y fecha de nacimiento sin validar en alta de miembro | `apps/web/components/members/MemberForm.tsx:54-61,139-140` | Se puede guardar `phone: "asdf"` sin error. `birthDate` no valida que sea una fecha pasada — se puede registrar una fecha de nacimiento futura sin advertencia. |
| MED-07 | `handleCopyCode` muestra "Copiado" aunque `navigator.clipboard` no exista | `apps/web/app/members/[id]/page.tsx:69-75` | En contexto no seguro (HTTP) o navegador viejo, `navigator.clipboard` es `undefined`; el optional chaining evita el crash pero `setCopied(true)` se ejecuta igual — falsa confirmación al usuario. |
| MED-08 | `maxStock` del carrito de inventario no se refresca si el stock cambia en otra terminal | `apps/web/lib/cart/InventoryCartContext.tsx:65,72`; `apps/web/components/camera/InventoryCartItem.tsx:14` | Requiere concurrencia multi-terminal para manifestarse. El límite de incremento del carrito usa el `maxStock` capturado al agregar, no el stock real vigente; el chequeo real ocurre recién al confirmar la venta (`completeInventorySale`), así que no se puede vender de más, pero la UI puede permitir incrementar de más hasta ese punto. |

---

## Hallazgos bajos

| ID | Título | Archivo(s) |
|---|---|---|
| BAJA-01 | Búsqueda de miembros por teléfono no aporta coincidencias si el término no tiene dígitos (comportamiento esperable, sin indicador en UI) | `apps/web/app/members/page.tsx:42,48` |
| BAJA-02 | Sin validación de miembro duplicado (mismo teléfono/nombre) | `apps/web/components/members/MemberForm.tsx` (`handleSubmit`) |
| BAJA-03 | `gymId: 'gym_001'` hardcodeado en el payload de `PaymentModal` (inofensivo hoy — el store en modo Supabase ignora ese campo) | `apps/web/components/payments/PaymentModal.tsx:64` |
| BAJA-04 | `gymId: 'gym_001'` hardcodeado al crear artículo de inventario (mismo patrón, mismo motivo de inocuidad actual) | `apps/web/app/inventory/page.tsx:141` |
| BAJA-05 | Sin validación de nombre duplicado en membresías; `openDuplicate` incluso fomenta guardar sin cambiar el nombre | `apps/web/app/memberships/page.tsx:38-42` |
| BAJA-06 | Botón "Simular desconexión" no tiene relación real con ningún estado de red — es un simple toggle de UI, sin telemetría real | `apps/web/app/access-monitor/page.tsx:19,45-47` (mismo hallazgo base que ALTA-04, listado aquí solo como nota de que tampoco refleja un estado de red real, aunque el impacto principal ya está en ALTA-04) |
| BAJA-07 | Selector de "sucursal" en `PeakHoursReport` está deshabilitado (placeholder visual preparado a futuro, no es un vector real de fuga — verificado con el propio comentario del código) | `apps/web/components/reports/PeakHoursReport.tsx:160-162` |
| BAJA-08 | Backend Fase 1 (`apps/api`) sin ninguna llamada desde `apps/web` — dos backends candidatos coexistiendo sin decisión formalizada de cuál continúa | `apps/api/`, confirmado por ausencia total de referencias en `apps/web` |
| BAJA-09 | El rol `super_admin` referenciado en el frontend (`apps/web/lib/store.tsx`, `apps/web/app/staff/page.tsx`) no existe en el enum de Postgres (`supabase/schema.sql:42` solo admite `client/trainer/admin/receptionist/platform_admin`) — código muerto/aspiracional que nunca podrá poblarse en este esquema | `apps/web/lib/store.tsx:652-655`, `supabase/schema.sql:42` |

---

## Verificaciones que resultaron limpias (documentado para no re-auditar)

- **`access-monitor`/`access-history`/`reports`**: no tienen selector de sucursal/gimnasio real ni parámetro que permita elegir otro tenant. Los datos dependen de RLS (`gym_id = my_gym_id()`), verificado coherente en `supabase/schema.sql` para `access_logs`, `payments`, `inventory_items`, `trainer_clients`, `routines`, `membership_plans`. (Recordatorio: esto es válido solo para el prototipo Supabase — el backend real deberá reimplementar el mismo aislamiento por su cuenta, con filtrado manual por `gym_id`, según se aclaró al inicio de este reporte.)
- **`settings/page.tsx` / `CustomerSupportSection.tsx`**: sin IDs de otro gimnasio hardcodeados ni selects sin filtrar; los datos de "Atención al cliente" están atados al `gym` del store, no a un ID arbitrario.
- **UI del límite de cuentas en `/staff`**: comunica correctamente el límite actual (1+1) — mensaje inline, opción deshabilitada en el `<select>`, botón "Guardar" deshabilitado en ese caso. El dropdown no ofrece ningún rol que el backend vaya a rechazar. (El problema no es esta UI en sí, sino que el límite que implementa —1+1— no es el correcto: ver D1.)
- **`InventoryCartPanel`/`InventoryCartItem`/`InventoryCartContext`** (flujo de escaneo): bien construidos — decremento remueve la línea al llegar a 0, incremento respeta `maxStock` con feedback, el total se recalcula correctamente en cada render, y bloquea proactivamente productos sin `salePrice` o fuera de servicio antes de añadirlos al carrito (a diferencia del flujo manual de venta, ver MED-03).
- **`CheckoutModal.tsx` / `InventorySaleModal.tsx`**: sí implementan `await` + `try/catch` + estado de error visible — contraejemplo positivo frente a CRIT-02.

---

## Seguimiento de los 11 hallazgos altos (actualizado 2026-07-15)

Clasificación y estado real tras la sesión de corrección. "Verificado" significa
que se reprodujo el bug con evidencia real (navegador headless o request HTTP
real) antes del fix, y se volvió a probar el mismo camino después.

| ID | Categoría | Estado | Nota |
|---|---|---|---|
| ALTA-01 | Bug de seguridad/permisos | Parcial — ver abajo | Causa raíz de ALTA-02/03; el guard centralizado (middleware) sigue sin existir, solo se remendaron los tres síntomas puntuales. |
| ALTA-02 | Bug de seguridad/permisos | **Corregido (temporal)** — verificado | Guard client-side (`useEffect` + redirect) agregado a `/staff` y `/settings`. Reproducido con Playwright: recepcionista autenticada → URL directa a `/staff` y `/settings` → antes del fix ambas renderizaban completo; después del fix, ambas redirigen a `/dashboard` sin mostrar contenido. **Es un parche, no el fix definitivo**: estas páginas no tienen backend real detrás todavía (`useStore()` es mock), así que no hay nada que un servidor pueda rechazar hoy. El fix definitivo llega cuando `/staff` y `/settings` se conecten a endpoints reales de `apps/api` con `AuthzService`/`require_role`. |
| ALTA-03 | Bug de seguridad/permisos | Documentado, no corregido | El guard client-side de `/platform` ya existía. El problema real (datos de todos los gimnasios en el chunk JS, por el `import` estático de `data/gyms.ts`) es estructural de Next.js CSR con datos mock — no se resuelve con más guards, solo desaparece cuando `/platform` haga `fetch` a `GET /gyms` (que en `apps/api` ya es `platform_admin`-only, verificado). Botón "Suspender/Activar" sin `onClick` (bug funcional menor) tampoco se tocó — bajo impacto, se pospone junto con la migración de la página. |
| ALTA-04 | Bug funcional | **Corregido** — verificado | El botón "Simular desconexión" y su banner eran cosméticos (no deshabilitaban el escáner real). Se optó por la propuesta simple del propio audit: eliminar el botón en vez de cablear un estado `connected` a través de `ScannerViewport`/`ScannerMiniPanel`/`ScannerContext` (hubiera sido una abstención nueva para un caso que nadie usa). Verificado con Playwright: `/access-monitor` ya no contiene el texto "Simular desconexión" ni el banner de "sin conexión". |
| ALTA-05 | Bug funcional | **Corregido** — verificado por lectura (fix determinístico de una línea) | `'2026-07'` hardcodeado → `new Date().toISOString().slice(0, 7)`. No requiere prueba de navegador: es un cálculo puro sin rama condicional. |
| ALTA-06 | Bug funcional / validación faltante | **Corregido** — verificado | `MemberForm`: `membershipId` ahora es requerido en `validate()`, el `<select>` tiene placeholder vacío en vez de defaultear a `''` silenciosamente, y el botón "Guardar" se deshabilita si no hay ninguna membresía activa. Reproducido con Playwright: se desactivaron las 6 membresías demo desde `/memberships`, se abrió "Nuevo miembro" → el select mostró "Selecciona una membresía" (sin preseleccionar nada) y el botón de guardar quedó `disabled=true`. |
| ALTA-07 | Bug funcional | **Corregido** — mismo patrón que `CheckoutModal` | `MemberForm` no tenía `catch`; ahora captura el error y muestra un banner visible (mismo componente/estilo que `CheckoutModal.tsx`, citado en el propio audit como contraejemplo positivo). No se verificó con un fallo real inducido (requeriría mockear `addMember` para lanzar) — el patrón replicado es idéntico al ya probado en `CheckoutModal`. |
| ALTA-08 | Bug funcional | **Corregido** — verificado por lectura | `PaymentModal` ya no fuerza `status: 'active'` incondicionalmente; ahora compara `newExpiration >= today`. Cambio puntual y determinístico, mismo nivel de riesgo que ALTA-05. |
| ALTA-09 | Bug funcional / validación faltante | **Corregido** — verificado | El modal de inventario ahora valida `quantity >= 0` y todos los precios `>= 0` en `handleSave`, con mensaje de error visible y sin cerrar el modal. Reproducido con Playwright: Inventario → Tienda → Agregar → cantidad `-3` → clic en "Agregar" → antes del fix se guardaba sin error; después, aparece "La cantidad y el stock mínimo no pueden ser negativos." y el modal permanece abierto. |
| ALTA-10 | Bug funcional, consecuencia de ALTA-09 | **Corregido** — verificado por lectura | `completeInventorySale` (ambas implementaciones, demo y Supabase, en `lib/store.tsx`) ahora rechaza `item.salePrice <= 0`, no solo `undefined`. |
| ALTA-11 | Deuda de UX / decisión de producto | **Pendiente, sin corregir a propósito** | Conectar `photoUrl` a `MemberAvatar` es una feature nueva (requiere decidir si existe o se planea un flujo de captura/carga de foto), no un bug de una línea — está fuera del alcance de una sesión de corrección de bugs. Queda documentado para que negocio decida si se construye o se retira el campo del modelo, como ya proponía el hallazgo original. |

### Hallazgos adicionales de seguridad encontrados al auditar `apps/api` (no estaban en la lista original de 11)

Al pedido explícito de blindar los endpoints reales ya existentes con el mismo
rigor que ALTA-02/03, se auditaron todos los routers de `apps/api` comparando
cada `GET` de listado contra el rol de quien lo llama. Se encontraron y
corrigieron tres endpoints que solo comprobaban `current_user.gym_id is not None`
sin restringir por rol — cualquier `CLIENT` o `TRAINER` autenticado (que sí
tiene `gym_id`) podía alcanzarlos:

| Endpoint | Antes | Filtración | Después | Verificado con |
|---|---|---|---|---|
| `GET /access/logs` | Sin `require_role` | Un miembro (CLIENT) podía ver los horarios de entrada/salida de **todos** los miembros del gimnasio, no solo los suyos | `require_role(*STAFF_ROLES)` | `test_client_cannot_list_gym_access_logs` (403) y `test_receptionist_can_list_gym_access_logs` (200) en `tests/modules/test_access.py` |
| `GET /inventory/sales` | Sin `require_role` | Cualquier CLIENT/TRAINER podía listar el historial completo de ventas e ingresos del gimnasio | `require_role(*ADMIN_ROLES, RECEPTIONIST)` | `test_client_cannot_list_inventory_sales` (403) y `test_receptionist_can_list_inventory_sales` (200) en `tests/modules/test_inventory_sales.py` |
| `GET /inventory/items` | Sin `require_role` | Cualquier CLIENT/TRAINER podía listar el inventario completo del gimnasio | `require_role(*ADMIN_ROLES, RECEPTIONIST)` | `test_client_cannot_list_inventory_items` (403) y `test_receptionist_can_list_inventory_items` (200) en `tests/modules/test_inventory_sales.py` |

`GET /membership-plans` se revisó y se dejó **sin restringir por rol a propósito**:
es un catálogo de precios, no datos personales ni financieros de terceros — un
CLIENT/TRAINER viendo los planes disponibles no es una filtración.

Además se cerraron los dos pendientes de la sesión anterior marcados como
"PROPUESTA, PENDIENTE DE CONFIRMACIÓN" en `DECISION_LOG_GYM.md`:
- **CRIT-02** (manejador global de excepciones): agregado `unhandled_exception_handler`
  en `app/core/exceptions.py` — cualquier excepción no capturada ahora responde
  `500 {"detail": "Error interno del servidor"}` en vez de un 500 sin cuerpo JSON.
  Verificado con `test_unhandled_exception_returns_uniform_500_contract`.
- **CRIT-03** (validación de rango en `MembershipPlanCreate`): `price`/`duration`
  ahora usan `Field(gt=0)` y `duration_unit` es un `Literal` cerrado, igual que
  ya hacía `InventoryItemCreate`. Verificado con `tests/modules/test_membership_plans.py`.

---

## Tabla resumen de severidad

| Severidad | Cantidad | IDs |
|---|---|---|
| Crítica | 3 | CRIT-01, CRIT-02, CRIT-03 |
| Alta | 11 | ALTA-01 a ALTA-11, más D1 (bloqueante de negocio) |
| Media | 8 | MED-01 a MED-08 |
| Baja | 9 | BAJA-01 a BAJA-09 |
| Diseño (a decidir con negocio, no bugs) | 2 | D2, D3 |

---

## Recomendaciones priorizadas

1. **Antes de cualquier otra cosa**: corregir CRIT-01 (bypass de `gymId` en `/api/staff`) — es explotable hoy mismo en el entorno de prueba actual y es exactamente el tipo de error que el equipo ya identificó como riesgo recurrente (`REQUERIMIENTOS_BACKEND_GYM.md` §3, "2 IDOR reales en admin-panel-j2ec").
2. **Decisión de producto urgente, antes de diseñar el backend real**: resolver D1 (modelo de roles) y D2 (asignación manual vs. QR) — ambos afectan directamente el `SCHEMA_PROPUESTO.md`/`API_PROPUESTA.md` del backend FastAPI que se va a construir. No tiene sentido corregir el prototipo Supabase para esto; se debe diseñar bien desde cero en el backend real.
3. **Estandarizar el patrón CRIT-02** (await + try/catch + error visible) en los siete puntos listados, usando `CheckoutModal`/`InventorySaleModal` como referencia — es mecánico y de bajo riesgo.
4. **Validaciones de negocio faltantes** (CRIT-03, ALTA-06, ALTA-09, ALTA-10): agregar validación de precio/duración/cantidad no negativos en membresías e inventario, y bloquear alta de miembros sin membresía activa disponible.
5. **Guard de rol centralizado** (ALTA-01/02/03): implementar antes de que crezca más el número de páginas — hoy cada página decide por su cuenta, lo cual ya produjo dos rutas expuestas.
6. Implementar D3 (QR del entrenador + pantalla de escaneo) como parte del mismo trabajo que resuelva D2, ya que ambos hallazgos están relacionados con el mismo flujo de negocio.
