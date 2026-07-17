# Punto 2 — Temporizador de rutina + solo ejercicios asignados por el entrenador

## Pedido original
- Vista de cliente, pantalla de Rutina: agregar temporizador que arranque al
  tocar "Iniciar rutina".
- El % de avance está bien (no tocar esa parte).
- Que solo aparezcan los ejercicios que el entrenador asignó (sin fallback a
  una rutina genérica).
- GIFs de ejercicios se deja aparte por ahora (investigación de licencias
  documentada por separado, sin decisión tomada todavía).

## Cambios aplicados (`apps/mobile`, modo mock)
1. `lib/mock-db.ts` — se eliminó `findRoutineForClientOrGeneric` (y la
   rutina sembrada sin dueño `rt_generic_1`); la rutina sembrada de ejemplo
   ahora es personalizada (`client_id: 'mem_001'`, asignada por
   `profile_trainer_1`, coherente con el `trainerClients` ya sembrado).
2. `hooks/use-gym-data.ts` — `useMyRoutine` ahora llama directo a
   `mockDb.findPersonalizedRoutine` (ya existía, se usaba para la vista del
   entrenador). Sin rutina asignada, el cliente ve un estado vacío.
3. `app/(client)/routine.tsx` — reescrita con 3 estados:
   - **Sin rutina asignada**: mensaje explicando que su entrenador aún no
     le asigna una (ya no menciona "rutinas genéricas").
   - **Antes de iniciar**: tarjeta con título/objetivo/número de ejercicios
     + botón "Iniciar rutina".
   - **En curso**: el checklist de siempre (con el % intacto) + un
     temporizador (mm:ss) que arranca al iniciar, corre en vivo, y se
     congela en cuanto se marcan todos los ejercicios (muestra "¡Terminada!").
   - "Reiniciar rutina" ahora regresa a la pantalla de "Iniciar rutina"
     (arranca una sesión nueva de cero, no solo limpia las marcas).

## Verificación
- `npx tsc --noEmit` en `apps/mobile`: 0 errores.
- Preview web: probado el flujo completo como cliente (`cliente@test.com`) —
  pantalla previa muestra solo la rutina asignada (3 ejercicios), el
  temporizador corre en vivo (00:14 → 00:35), se congela y marca
  "¡Terminada!" al 100%, y "Reiniciar rutina" regresa limpio al inicio.

## Estado
- [x] Implementado y verificado
