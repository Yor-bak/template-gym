-- ============================================================================
-- Template-GYM — Esquema de base de datos (Supabase / Postgres)
-- Ejecutar en el SQL Editor del dashboard de Supabase, en orden, una sola vez.
-- Compartido entre la app móvil (cliente/entrenador) y el dashboard web
-- (staff: admin/recepcionista/admin de plataforma), multi-sucursal.
--
-- Modelo clave: `members` (registro de negocio del cliente, lo crea el staff
-- en recepción) es distinto de `profiles` (identidad de login). Un member
-- puede existir sin login todavía (pending_activation); cuando el cliente
-- activa la app con su código, se crea su `profile` y se linkean.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- gyms: sucursales de la misma marca (multi-tenant)
-- ----------------------------------------------------------------------------
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text,
  phone text,
  email text,
  timezone text not null default 'America/Mexico_City',
  currency text not null default 'MXN' check (currency in ('MXN', 'USD')),
  member_prefix text not null,
  logo_url text,
  primary_color text,
  active boolean not null default true,
  subscription_status text not null default 'trial'
    check (subscription_status in ('active', 'trial', 'suspended', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- profiles: identidad de login (staff, entrenadores, y clientes ya activados)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  gym_id uuid references public.gyms (id) on delete set null,
  role text not null check (role in ('client', 'trainer', 'admin', 'receptionist', 'platform_admin')),
  full_name text not null,
  -- Copia de auth.users.email para poder mostrarla en el dashboard (PostgREST
  -- no puede leer auth.users directamente vía el cliente autenticado normal).
  email text,
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Solo platform_admin puede no pertenecer a una sucursal específica.
  constraint profiles_gym_required check (role = 'platform_admin' or gym_id is not null)
);

-- Helpers usados en las políticas de RLS (evitan repetir el subselect en cada policy).
create function public.my_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.my_gym_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select gym_id from public.profiles where id = auth.uid();
$$;

-- Helpers que resuelven relaciones ENTRE tablas sin re-disparar RLS. Sin ellos,
-- una política de `profiles` que consulta `trainer_clients` (que consulta
-- `members`, que consulta `trainer_clients`...) entra en recursión infinita.
-- Al ser SECURITY DEFINER, estos subselects saltan RLS y rompen el ciclo.
create function public.my_member_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select id from public.members where profile_id = auth.uid();
$$;

create function public.my_trainer_client_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select client_id from public.trainer_clients where trainer_id = auth.uid();
$$;

create function public.my_trainer_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select tc.trainer_id
  from public.trainer_clients tc
  join public.members m on m.id = tc.client_id
  where m.profile_id = auth.uid();
$$;

create function public.member_gym(p_member uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select gym_id from public.members where id = p_member;
$$;

create function public.routine_member(p_routine uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select client_id from public.routines where id = p_routine;
$$;

create function public.routine_trainer(p_routine uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select trainer_id from public.routines where id = p_routine;
$$;

-- ----------------------------------------------------------------------------
-- membership_plans: planes configurables por sucursal (nombre, precio, duración)
-- ----------------------------------------------------------------------------
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null,
  duration int not null,
  duration_unit text not null check (duration_unit in ('days', 'weeks', 'months', 'years')),
  tolerance_days int not null default 0,
  description text,
  active boolean not null default true,
  -- Placeholder para acceso cruzado entre sucursales; la lógica de validación
  -- completa se define después, esto solo deja el dato disponible.
  allows_multi_branch_access boolean not null default false,
  created_at timestamptz not null default now()
);

create index membership_plans_gym_id_idx on public.membership_plans (gym_id);

-- ----------------------------------------------------------------------------
-- members: registro de negocio del cliente. Lo crea el staff en recepción,
-- existe con o sin login todavía (profile_id se linkea al activar la app).
-- ----------------------------------------------------------------------------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  member_number text not null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  birth_date date,
  photo_url text,
  membership_plan_id uuid references public.membership_plans (id) on delete set null,
  status text not null default 'pending_activation' check (status in
    ('active', 'expiring_soon', 'expired', 'blocked', 'temporary_access', 'pending_activation', 'archived')),
  start_date date,
  expiration_date date,
  last_payment_date date,
  blocked_at timestamptz,
  blocked_by uuid references public.profiles (id) on delete set null,
  block_reason text,
  temporary_access_until timestamptz,
  temporary_access_by uuid references public.profiles (id) on delete set null,
  temporary_access_reason text,
  mobile_app_status text not null default 'not_activated' check (mobile_app_status in
    ('not_activated', 'pending', 'activated', 'device_linked', 'suspended')),
  -- Código de 8 caracteres que el staff le da al cliente para activar la app.
  -- Se limpia (null) en cuanto se usa; único mientras esté vigente.
  activation_code text unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  emergency_contact text,
  emergency_phone text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (gym_id, member_number)
);

create index members_gym_id_idx on public.members (gym_id);
create index members_profile_id_idx on public.members (profile_id);
create unique index members_profile_id_unique on public.members (profile_id) where profile_id is not null;

-- ----------------------------------------------------------------------------
-- client_access_codes: el código que se codifica en el QR de acceso.
-- ----------------------------------------------------------------------------
create table public.client_access_codes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  code text not null unique default encode(gen_random_bytes(16), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index client_access_codes_member_id_idx on public.client_access_codes (member_id);
create unique index client_access_codes_one_active_per_member
  on public.client_access_codes (member_id)
  where active;

-- ----------------------------------------------------------------------------
-- trainer_clients: relación entrenador <-> cliente asignado
-- ----------------------------------------------------------------------------
create table public.trainer_clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.members (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (client_id)
);

create index trainer_clients_trainer_id_idx on public.trainer_clients (trainer_id);

-- ----------------------------------------------------------------------------
-- routines / routine_exercises: plantillas genéricas o personalizadas
-- ----------------------------------------------------------------------------
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.profiles (id) on delete set null,
  client_id uuid references public.members (id) on delete cascade,
  title text not null,
  goal text,
  created_at timestamptz not null default now()
);

create index routines_client_id_idx on public.routines (client_id);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  name text not null,
  sets int not null,
  reps text not null,
  rest_seconds int,
  order_index int not null default 0,
  notes text
);

create index routine_exercises_routine_id_idx on public.routine_exercises (routine_id);

-- ----------------------------------------------------------------------------
-- payments: pagos registrados por el staff
-- ----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  membership_plan_id uuid references public.membership_plans (id) on delete set null,
  amount numeric(10, 2) not null,
  method text not null check (method in ('cash', 'card', 'transfer', 'other')),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'corrected', 'pending')),
  payment_date date not null default current_date,
  period_start date not null,
  period_end date not null,
  reference text,
  notes text,
  registered_by uuid references public.profiles (id) on delete set null,
  cancelled_by uuid references public.profiles (id) on delete set null,
  cancel_reason text,
  cancelled_at timestamptz,
  correction_of uuid references public.payments (id) on delete set null,
  created_at timestamptz not null default now()
);

create index payments_member_id_idx on public.payments (member_id);
create index payments_gym_id_idx on public.payments (gym_id);

-- ----------------------------------------------------------------------------
-- access_logs: cada intento de acceso (QR válido, vencido, bloqueado, etc.)
-- ----------------------------------------------------------------------------
create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid references public.members (id) on delete cascade,
  result text not null check (result in
    ('authorized', 'expiring_soon', 'expired', 'blocked', 'invalid_qr', 'temporary_access', 'manual')),
  reader text not null default 'Entrada principal',
  raw_qr_code text,
  scanned_at timestamptz not null default now()
);

create index access_logs_member_id_idx on public.access_logs (member_id);
create index access_logs_gym_id_idx on public.access_logs (gym_id);

-- ----------------------------------------------------------------------------
-- inventory_items: equipo/stock por sucursal (cardio, fuerza, peso libre, tienda)
-- ----------------------------------------------------------------------------
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  area text not null check (area in ('cardio', 'fuerza', 'peso_libre', 'tienda')),
  name text not null,
  brand text,
  model text,
  serial_number text,
  sku text,
  quantity int not null default 0,
  min_stock int,
  unit_measure text,
  location text,
  status text not null default 'operating' check (status in ('operating', 'maintenance', 'out_of_service')),
  purchase_date date,
  purchase_price numeric(10, 2),
  repair_price numeric(10, 2),
  sale_price numeric(10, 2),
  supplier text,
  last_maintenance date,
  next_maintenance date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inventory_items_gym_id_idx on public.inventory_items (gym_id);
create index inventory_items_area_idx on public.inventory_items (area);

-- ============================================================================
-- Lógica en la base de datos
-- ============================================================================

-- handle_new_user: se dispara en cada alta en auth.users.
--
-- - Si trae `activation_code` en user_metadata: busca el `member` pendiente,
--   crea su `profile` (SIEMPRE role='client', sin importar qué diga el
--   metadata del request) y linkea el member. Si el código no es válido o ya
--   se usó, la creación de la cuenta falla completa (rollback).
-- - Si NO trae `activation_code`: no hace nada. Las cuentas de staff/entrenador
--   se crean server-side vía la Admin API (service_role) y ese mismo proceso
--   inserta su `profile` directamente — nunca confiar en el metadata del
--   request público para asignar esos roles.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_code text;
  v_member public.members%rowtype;
begin
  v_code := new.raw_user_meta_data ->> 'activation_code';

  if v_code is null then
    return new;
  end if;

  select * into v_member
  from public.members
  where activation_code = v_code and profile_id is null
  for update;

  if not found then
    raise exception 'Código de activación inválido o ya utilizado';
  end if;

  insert into public.profiles (id, gym_id, role, full_name, email, phone)
  values (new.id, v_member.gym_id, 'client', v_member.first_name || ' ' || v_member.last_name, new.email, v_member.phone);

  update public.members
  set profile_id = new.id,
      mobile_app_status = 'activated',
      activation_code = null
  where id = v_member.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- lookup_activation_code: paso 1 de la activación en la app (antes de pedir
-- correo/contraseña). Callable sin sesión (anon). Solo expone lo mínimo.
create function public.lookup_activation_code(p_code text)
returns table (first_name text, gym_name text)
language sql stable security definer set search_path = public
as $$
  select m.first_name, g.name
  from public.members m
  join public.gyms g on g.id = m.gym_id
  where m.activation_code = p_code and m.profile_id is null;
$$;

grant execute on function public.lookup_activation_code(text) to anon, authenticated;

-- validate_access: usada por el Monitor de Acceso del dashboard al escanear
-- un QR. security invoker a propósito: corre con los permisos del staff que
-- llama, así que respeta las políticas de RLS de abajo tal cual (un cliente
-- que la llamara no podría leer datos de otros miembros).
create function public.validate_access(p_code text, p_reader text default 'Entrada principal')
returns public.access_logs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_member public.members%rowtype;
  v_plan public.membership_plans%rowtype;
  v_result text;
  v_log public.access_logs%rowtype;
  v_days_left int;
  v_caller_gym uuid;
begin
  select m.* into v_member
  from public.members m
  join public.client_access_codes c on c.member_id = m.id
  where c.code = p_code and c.active;

  if not found then
    select gym_id into v_caller_gym from public.profiles where id = auth.uid();
    insert into public.access_logs (gym_id, member_id, result, reader, raw_qr_code)
    values (v_caller_gym, null, 'invalid_qr', p_reader, p_code)
    returning * into v_log;
    return v_log;
  end if;

  select * into v_plan from public.membership_plans where id = v_member.membership_plan_id;

  if v_member.status = 'blocked' then
    v_result := 'blocked';
  elsif v_member.status = 'temporary_access'
    and (v_member.temporary_access_until is null or v_member.temporary_access_until > now()) then
    v_result := 'temporary_access';
  elsif v_member.expiration_date is null then
    v_result := 'expired';
  else
    v_days_left := v_member.expiration_date - current_date;
    if v_days_left < -coalesce(v_plan.tolerance_days, 0) then
      v_result := 'expired';
    elsif v_days_left <= 5 then
      v_result := 'expiring_soon';
    else
      v_result := 'authorized';
    end if;
  end if;

  insert into public.access_logs (gym_id, member_id, result, reader)
  values (v_member.gym_id, v_member.id, v_result, p_reader)
  returning * into v_log;

  -- Mantiene el status del member razonablemente sincronizado para los
  -- listados del dashboard (no afecta la decisión de acceso ya tomada arriba).
  if v_result in ('expired', 'expiring_soon') and v_member.status = 'active' then
    update public.members set status = v_result where id = v_member.id;
  end if;

  return v_log;
end;
$$;

grant execute on function public.validate_access(text, text) to authenticated;

-- Al confirmarse un pago, sincroniza automáticamente el status/vigencia del
-- member — así nunca queda desalineado entre lo que se cobró y lo que dice
-- el semáforo de acceso.
create function public.sync_member_on_payment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'confirmed' then
    update public.members
    set status = 'active',
        last_payment_date = new.payment_date,
        expiration_date = new.period_end,
        start_date = coalesce(start_date, new.period_start)
    where id = new.member_id;

    -- Genera el código QR de acceso si el miembro todavía no tiene uno activo
    -- (primer pago) — así siempre hay algo que escanear en cuanto está activo.
    insert into public.client_access_codes (member_id)
    values (new.member_id)
    on conflict (member_id) where active do nothing;
  end if;
  return new;
end;
$$;

create trigger on_payment_confirmed
  after insert on public.payments
  for each row execute procedure public.sync_member_on_payment();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.gyms enable row level security;
alter table public.profiles enable row level security;
alter table public.membership_plans enable row level security;
alter table public.members enable row level security;
alter table public.client_access_codes enable row level security;
alter table public.trainer_clients enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.payments enable row level security;
alter table public.access_logs enable row level security;
alter table public.inventory_items enable row level security;

-- gyms: cualquiera ve la suya, platform_admin ve todas. Solo platform_admin escribe.
create policy "gyms_select" on public.gyms
  for select using (id = public.my_gym_id() or public.my_role() = 'platform_admin');

create policy "gyms_write_platform_admin" on public.gyms
  for all using (public.my_role() = 'platform_admin')
  with check (public.my_role() = 'platform_admin');

-- profiles
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_staff_gym" on public.profiles
  for select using (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

create policy "profiles_select_related" on public.profiles
  for select using (id in (select public.my_trainer_ids()));

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_update_staff" on public.profiles
  for update using (
    public.my_role() in ('admin', 'platform_admin')
    and (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

-- membership_plans
create policy "membership_plans_select" on public.membership_plans
  for select using (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin');

create policy "membership_plans_write_admin" on public.membership_plans
  for all using (
    public.my_role() in ('admin', 'platform_admin')
    and (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin')
  )
  with check (
    public.my_role() in ('admin', 'platform_admin')
    and (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

-- members
create policy "members_select_own" on public.members
  for select using (profile_id = auth.uid());

create policy "members_select_staff" on public.members
  for select using (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

create policy "members_select_trainer" on public.members
  for select using (id in (select public.my_trainer_client_ids()));

create policy "members_insert_staff" on public.members
  for insert with check (public.my_role() in ('admin', 'receptionist') and gym_id = public.my_gym_id());

create policy "members_update_staff" on public.members
  for update using (public.my_role() in ('admin', 'receptionist') and gym_id = public.my_gym_id());

-- client_access_codes
create policy "access_codes_select_own" on public.client_access_codes
  for select using (member_id in (select public.my_member_ids()));

create policy "access_codes_select_staff" on public.client_access_codes
  for select using (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (public.member_gym(member_id) = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

create policy "access_codes_write_staff" on public.client_access_codes
  for all using (
    public.my_role() in ('admin', 'receptionist') and public.member_gym(member_id) = public.my_gym_id()
  )
  with check (
    public.my_role() in ('admin', 'receptionist') and public.member_gym(member_id) = public.my_gym_id()
  );

-- trainer_clients
create policy "trainer_clients_select_client" on public.trainer_clients
  for select using (client_id in (select public.my_member_ids()));

create policy "trainer_clients_select_trainer" on public.trainer_clients
  for select using (trainer_id = auth.uid());

create policy "trainer_clients_write_staff" on public.trainer_clients
  for all using (
    public.my_role() in ('admin', 'receptionist') and public.member_gym(client_id) = public.my_gym_id()
  )
  with check (
    public.my_role() in ('admin', 'receptionist') and public.member_gym(client_id) = public.my_gym_id()
  );

-- routines
create policy "routines_select_client" on public.routines
  for select using (client_id in (select public.my_member_ids()) or client_id is null);

create policy "routines_select_trainer" on public.routines
  for select using (trainer_id = auth.uid());

create policy "routines_insert_trainer" on public.routines
  for insert with check (trainer_id = auth.uid());

create policy "routines_update_trainer" on public.routines
  for update using (trainer_id = auth.uid());

create policy "routines_delete_trainer" on public.routines
  for delete using (trainer_id = auth.uid());

-- routine_exercises: heredan visibilidad de su routine
create policy "routine_exercises_select" on public.routine_exercises
  for select using (
    public.routine_member(routine_id) in (select public.my_member_ids())
    or public.routine_member(routine_id) is null
    or public.routine_trainer(routine_id) = auth.uid()
  );

create policy "routine_exercises_insert_trainer" on public.routine_exercises
  for insert with check (public.routine_trainer(routine_id) = auth.uid());

create policy "routine_exercises_update_trainer" on public.routine_exercises
  for update using (public.routine_trainer(routine_id) = auth.uid());

create policy "routine_exercises_delete_trainer" on public.routine_exercises
  for delete using (public.routine_trainer(routine_id) = auth.uid());

-- payments
create policy "payments_select_own" on public.payments
  for select using (member_id in (select public.my_member_ids()));

create policy "payments_select_staff" on public.payments
  for select using (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

create policy "payments_insert_staff" on public.payments
  for insert with check (public.my_role() in ('admin', 'receptionist') and gym_id = public.my_gym_id());

create policy "payments_update_staff" on public.payments
  for update using (public.my_role() in ('admin', 'receptionist') and gym_id = public.my_gym_id());

-- access_logs
create policy "access_logs_select_own" on public.access_logs
  for select using (member_id in (select public.my_member_ids()));

create policy "access_logs_select_staff" on public.access_logs
  for select using (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

create policy "access_logs_insert_staff" on public.access_logs
  for insert with check (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

-- inventory_items: admin CRUD completo; receptionist ve/agrega/edita pero no
-- elimina. Ocultar precios a receptionist queda solo del lado del front
-- (Postgres no distingue columnas por rol sin una vista aparte).
create policy "inventory_select_staff" on public.inventory_items
  for select using (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

create policy "inventory_insert_staff" on public.inventory_items
  for insert with check (public.my_role() in ('admin', 'receptionist') and gym_id = public.my_gym_id());

create policy "inventory_update_staff" on public.inventory_items
  for update using (public.my_role() in ('admin', 'receptionist') and gym_id = public.my_gym_id());

create policy "inventory_delete_admin" on public.inventory_items
  for delete using (public.my_role() = 'admin' and gym_id = public.my_gym_id());
