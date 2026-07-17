# Punto 1 — QR de entrenador + escaneo para asignar cliente + rediseño vista entrenador

## Pedido original
- QR para cada entrenador (también sirve para acceso físico al gym, igual que
  los miembros — reutiliza el sistema de código rotativo existente).
- Apartado en la vista de entrenador para escanear al cliente (el mismo QR de
  acceso rotativo que ya usa el cliente para entrar), y que eso lo asigne
  como su entrenador.
- Rediseño de la vista de entrenador acorde a la estética ya aplicada en
  cliente/login (oscuro premium, `Colors.dark`, sin `ThemedText`/`Card`
  genéricos).
- **Pausa después de esto** — no tocar todavía GIFs de ejercicios (siguiente punto).

## Decisiones ya tomadas con el usuario
1. El QR del entrenador reutiliza el mismo sistema de código rotativo
   (`ClientAccessCode` → generalizado a `AccessCode` con `owner_role`).
2. El entrenador escanea el QR de acceso rotativo existente del cliente (no
   se agrega un QR nuevo y estable aparte).

## Alcance técnico (solo `apps/mobile`, modo mock — el backend FastAPI
todavía no tiene módulo de trainers/asignaciones, Fase 1 solo cubre
auth+members+gyms+users+membership_plans)

1. `types/database.ts`: renombrar `ClientAccessCode` → `AccessCode`, agregar
   `owner_role: 'client' | 'trainer'`.
2. `lib/mock-db.ts`: generalizar `rotateAccessCode(ownerId, ownerRole)`;
   agregar `resolveAccessCode(code)` (lookup inverso para el escaneo) y
   `assignTrainer(trainerId, clientId)`.
3. `hooks/use-gym-data.ts`: generalizar `useRotatingAccessCode`; nuevo
   `useAssignClientToTrainer()`.
4. Nueva dependencia: `expo-camera` (no existía capacidad de escaneo, solo
   de mostrar QR con `react-native-qrcode-svg`).
5. Nueva pantalla `(trainer)/scan-client.tsx` — cámara + lectura QR.
6. Rediseño `(trainer)/(tabs)/profile.tsx` — perfil propio del entrenador +
   su QR rotativo (patrón calcado del de `(client)/index.tsx`).
7. Rediseño `(trainer)/(tabs)/index.tsx` — lista de clientes + botón
   "Escanear cliente".
8. Rediseño de chrome de `(trainer)/client/[id].tsx` (editor de rutina) —
   solo estética, sin tocar la lógica de ejercicios todavía.

## Estado
- [x] Investigación de infraestructura existente
- [x] Implementación
- [x] Verificación (`tsc --noEmit` limpio + preview visual en http://localhost:8081)
- **Pausa acordada tras esto para: GIFs en ejercicios del entrenador**

## Archivos tocados
- `types/database.ts` — `ClientAccessCode` → `AccessCode` (+ `owner_role`)
- `lib/mock-db.ts` — `rotateAccessCode` generalizado, + `resolveAccessCode`,
  `assignTrainer`, `findMemberById`
- `hooks/use-gym-data.ts` — `useRotatingAccessCode` generalizado, +
  `useAssignClientFromScan`, `useMember`
- `app/(client)/index.tsx` — actualizado el call site (`'client'`)
- `app/(trainer)/(tabs)/profile.tsx` — reescrito: perfil propio + QR rotativo
- `app/(trainer)/(tabs)/index.tsx` — reescrito: lista rediseñada + botón "Escanear cliente"
- `app/(trainer)/client/[id].tsx` — reescrito: mismo look oscuro, nombre del
  cliente en header, botón de regreso (lógica de ejercicios intacta)
- `app/(trainer)/scan-client.tsx` — nuevo: pantalla de cámara + lectura QR
- `app/(trainer)/_layout.tsx` — registra `scan-client` como modal, quita header claro de `client/[id]`
- `app.json` — plugin `expo-camera` con permiso en español
- `package.json` — nueva dependencia `expo-camera` (vía `expo install`)

## Verificación realizada
- `npx tsc --noEmit` en `apps/mobile`: **0 errores**
- Preview web (`expo start --web`, puerto 8081):
  - Login entrenador (`entrenador@test.com` / `123456`) → lista de clientes
    rediseñada con botón "Escanear cliente" ✅
  - Tab Perfil: nombre, badge "ENTRENADOR", contador de clientes, **QR
    rotativo con countdown en vivo funcionando** ✅
  - "Escanear cliente" → pantalla de permiso de cámara renderiza sin
    errores (mensaje correcto, sin crash) ✅
  - Editor de rutina de un cliente: nombre del cliente, botón de regreso,
    mismo estilo oscuro, formulario funcional ✅
  - Regresión: QR del cliente (`cliente@test.com`) sigue funcionando
    igual tras el rename del tipo ✅

## Limitación conocida
No se pudo probar el escaneo real de cámara de punta a punta (requiere
hardware físico, igual que el escáner de `apps/web`). La lógica de
`resolveAccessCode`/`assignTrainer` se revisó a mano con cuidado y el
formato del código coincide exactamente con el que genera `rotateAccessCode`.
