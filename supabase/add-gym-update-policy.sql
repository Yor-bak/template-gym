-- Migración: permite al admin de una sucursal editar los datos de SU propia
-- sucursal (Configuración > Gimnasio/Apariencia). Crear/borrar sucursales
-- sigue siendo exclusivo de platform_admin.
-- Ejecutar en el Pi: docker exec -i gym-db psql -U postgres -d postgres < add-gym-update-policy.sql

drop policy if exists "gyms_update_own_admin" on public.gyms;
create policy "gyms_update_own_admin" on public.gyms
  for update using (id = public.my_gym_id() and public.my_role() = 'admin')
  with check (id = public.my_gym_id() and public.my_role() = 'admin');
