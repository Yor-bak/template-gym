-- Migración: rompe la recursión infinita en las políticas de RLS.
-- El ciclo era profiles -> trainer_clients -> members -> trainer_clients -> ...
-- Solución: los subselects cruzados pasan a funciones SECURITY DEFINER que
-- saltan RLS. Aplica sobre la base existente sin borrar datos.
--
-- Ejecutar en el Pi:  docker exec -i gym-db psql -U postgres -d postgres < fix-rls-recursion.sql

-- ── Funciones helper (SECURITY DEFINER: no re-disparan RLS) ──────────────────
create or replace function public.my_member_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.members where profile_id = auth.uid();
$$;

create or replace function public.my_trainer_client_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select client_id from public.trainer_clients where trainer_id = auth.uid();
$$;

create or replace function public.my_trainer_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select tc.trainer_id
  from public.trainer_clients tc
  join public.members m on m.id = tc.client_id
  where m.profile_id = auth.uid();
$$;

create or replace function public.member_gym(p_member uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select gym_id from public.members where id = p_member;
$$;

create or replace function public.routine_member(p_routine uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.routines where id = p_routine;
$$;

create or replace function public.routine_trainer(p_routine uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select trainer_id from public.routines where id = p_routine;
$$;

-- ── profiles ─────────────────────────────────────────────────────────────────
drop policy if exists "profiles_select_related" on public.profiles;
create policy "profiles_select_related" on public.profiles
  for select using (id in (select public.my_trainer_ids()));

-- ── members ──────────────────────────────────────────────────────────────────
drop policy if exists "members_select_trainer" on public.members;
create policy "members_select_trainer" on public.members
  for select using (id in (select public.my_trainer_client_ids()));

-- ── client_access_codes ──────────────────────────────────────────────────────
drop policy if exists "access_codes_select_own" on public.client_access_codes;
create policy "access_codes_select_own" on public.client_access_codes
  for select using (member_id in (select public.my_member_ids()));

drop policy if exists "access_codes_select_staff" on public.client_access_codes;
create policy "access_codes_select_staff" on public.client_access_codes
  for select using (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (public.member_gym(member_id) = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

drop policy if exists "access_codes_write_staff" on public.client_access_codes;
create policy "access_codes_write_staff" on public.client_access_codes
  for all using (
    public.my_role() in ('admin', 'receptionist') and public.member_gym(member_id) = public.my_gym_id()
  )
  with check (
    public.my_role() in ('admin', 'receptionist') and public.member_gym(member_id) = public.my_gym_id()
  );

-- ── trainer_clients ──────────────────────────────────────────────────────────
drop policy if exists "trainer_clients_select_client" on public.trainer_clients;
create policy "trainer_clients_select_client" on public.trainer_clients
  for select using (client_id in (select public.my_member_ids()));

drop policy if exists "trainer_clients_write_staff" on public.trainer_clients;
create policy "trainer_clients_write_staff" on public.trainer_clients
  for all using (
    public.my_role() in ('admin', 'receptionist') and public.member_gym(client_id) = public.my_gym_id()
  )
  with check (
    public.my_role() in ('admin', 'receptionist') and public.member_gym(client_id) = public.my_gym_id()
  );

-- ── routines ─────────────────────────────────────────────────────────────────
drop policy if exists "routines_select_client" on public.routines;
create policy "routines_select_client" on public.routines
  for select using (client_id in (select public.my_member_ids()) or client_id is null);

-- ── routine_exercises ────────────────────────────────────────────────────────
drop policy if exists "routine_exercises_select" on public.routine_exercises;
create policy "routine_exercises_select" on public.routine_exercises
  for select using (
    public.routine_member(routine_id) in (select public.my_member_ids())
    or public.routine_member(routine_id) is null
    or public.routine_trainer(routine_id) = auth.uid()
  );

drop policy if exists "routine_exercises_insert_trainer" on public.routine_exercises;
create policy "routine_exercises_insert_trainer" on public.routine_exercises
  for insert with check (public.routine_trainer(routine_id) = auth.uid());

drop policy if exists "routine_exercises_update_trainer" on public.routine_exercises;
create policy "routine_exercises_update_trainer" on public.routine_exercises
  for update using (public.routine_trainer(routine_id) = auth.uid());

drop policy if exists "routine_exercises_delete_trainer" on public.routine_exercises;
create policy "routine_exercises_delete_trainer" on public.routine_exercises
  for delete using (public.routine_trainer(routine_id) = auth.uid());

-- ── payments ─────────────────────────────────────────────────────────────────
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (member_id in (select public.my_member_ids()));

-- ── access_logs ──────────────────────────────────────────────────────────────
drop policy if exists "access_logs_select_own" on public.access_logs;
create policy "access_logs_select_own" on public.access_logs
  for select using (member_id in (select public.my_member_ids()));
