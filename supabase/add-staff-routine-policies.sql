-- Migración: permite al staff leer rutinas de su sucursal, y al admin
-- gestionar (crear/editar/borrar) rutinas GENÉRICAS (client_id is null).
-- Las rutinas personalizadas de un cliente siguen siendo solo del entrenador.
-- Ejecutar en el Pi: docker exec -i gym-db psql -U postgres -d postgres < add-staff-routine-policies.sql

drop policy if exists "routines_select_staff" on public.routines;
create policy "routines_select_staff" on public.routines
  for select using (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (
      client_id is null
      or public.member_gym(client_id) = public.my_gym_id()
      or public.my_role() = 'platform_admin'
    )
  );

drop policy if exists "routines_write_admin_generic" on public.routines;
create policy "routines_write_admin_generic" on public.routines
  for all using (client_id is null and public.my_role() in ('admin', 'platform_admin'))
  with check (client_id is null and public.my_role() in ('admin', 'platform_admin'));

drop policy if exists "routine_exercises_select_staff" on public.routine_exercises;
create policy "routine_exercises_select_staff" on public.routine_exercises
  for select using (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (
      public.routine_member(routine_id) is null
      or public.member_gym(public.routine_member(routine_id)) = public.my_gym_id()
      or public.my_role() = 'platform_admin'
    )
  );

drop policy if exists "routine_exercises_write_admin_generic" on public.routine_exercises;
create policy "routine_exercises_write_admin_generic" on public.routine_exercises
  for all using (public.routine_member(routine_id) is null and public.my_role() in ('admin', 'platform_admin'))
  with check (public.routine_member(routine_id) is null and public.my_role() in ('admin', 'platform_admin'));
