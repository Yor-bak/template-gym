# Pendientes

## 1. Módulo de pagos de miembros (member_payments)
Estado: en progreso, no terminado.
Falta implementar: POST/GET /members/{id}/payments, cálculo de covers_until a partir del plan de membresía asociado, transacción atómica con guardas de multi-tenancy (gym_scope).

## 2. PATCH /members (editar/bloquear miembro)
Estado: no construido.
Debe respetar el mismo aislamiento estricto de multi-tenancy (AuthzService.gym_scope()) usado en el resto de endpoints de este servicio.

## 3. apps/mobile sigue en mock-db.ts
Estado: no conectado al backend real. Decisión deliberada del equipo de priorizar el dashboard web primero (no es un descuido). La pantalla de escaneo QR del entrenador (src/app/(trainer)/scan-client.tsx) ya tiene la lógica de cámara/permisos real construida pero llama a useAssignClientFromScan, que sigue apuntando a datos simulados en vez del backend real.

## 4. IDOR crítico sin corregir en admin-panel-j2ec
Archivo: apps/web/app/api/staff/route.ts, línea 66.
Un admin puede crear personal en un giro/negocio ajeno pasando un gymId/giroId arbitrario en el body. Ya está corregido en el backend real (apps/api vía AuthzService.gym_scope()) pero esta ruta legacy de Next.js (época Supabase) no tiene backend real detrás y sigue expuesta.
Pendiente decidir: ¿se parcha esta ruta ahora con una guarda mínima, o se espera a la reconstrucción completa de /staff con backend real?

## 5. /staff y /settings en template-gym siguen mock-backed
Solo tienen una guardia de redirección en el cliente (frontend) como parche temporal, sin backend real detrás todavía.

## 6. GET /gyms/me
Endpoint faltante — necesario para que el dashboard obtenga los datos del gimnasio del usuario autenticado sin depender de IDs hardcodeados o pasados por el cliente.

## 7. Rotar SYNC_SERVICE_KEY
Este secreto quedó expuesto en una conversación de chat (igual que pasó antes con INTERNAL_SERVICE_KEY, que ya se rotó). Vive en /etc/sync-gym-provisioning.env en el servidor de producción (forge02) y debe coincidir con el valor correspondiente en apps/api/.env del backend de template-gym. Al rotarla, actualizar AMBOS lugares manualmente — no hay sincronización automática (ver pendiente 8).

## 8. Documentar en docs/PORTS.md que SYNC_SERVICE_KEY no se sincroniza automáticamente
Agregar una nota explícita en docs/PORTS.md (dentro del repo de template-gym) advirtiendo que SYNC_SERVICE_KEY vive en dos lugares distintos (apps/api/.env y /etc/sync-gym-provisioning.env en el servidor) y que actualizar uno sin el otro rompe el timer de aprovisionamiento automático sin dar ningún error visible en el dashboard.
