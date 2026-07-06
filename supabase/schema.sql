-- ============================================================================
-- Template-GYM — Esquema de base de datos (Supabase / Postgres)
-- Ejecutar en el SQL Editor del dashboard de Supabase, en orden, una sola vez.
-- Compartido entre la app móvil (cliente/entrenador) y el dashboard web del gym.
-- ============================================================================

-- Extensión necesaria para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: 1 fila por usuario de auth.users, con su rol
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('client', 'trainer')),
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Crea automáticamente el profile cuando alguien se registra en auth.users.
-- El rol y el nombre se leen de user_metadata, enviados desde la app al hacer signUp().
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- subscriptions: historial/estado de suscripción de cada cliente
-- ----------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('active', 'cancelled')) default 'active',
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now()
);

create index subscriptions_client_id_idx on public.subscriptions (client_id);

-- ----------------------------------------------------------------------------
-- client_access_codes: el código que se codifica en el QR de acceso.
-- Al cancelar la suscripción se marca active=false; al renovar se inserta
-- una fila nueva con un código nuevo (nunca se reutiliza uno viejo).
-- ----------------------------------------------------------------------------
create table public.client_access_codes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  code text not null unique default encode(gen_random_bytes(16), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index client_access_codes_client_id_idx on public.client_access_codes (client_id);
-- Solo puede haber un código activo por cliente a la vez
create unique index client_access_codes_one_active_per_client
  on public.client_access_codes (client_id)
  where active;

-- ----------------------------------------------------------------------------
-- trainer_clients: relación entrenador <-> cliente asignado
-- ----------------------------------------------------------------------------
create table public.trainer_clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (client_id) -- un cliente solo tiene un entrenador activo a la vez
);

create index trainer_clients_trainer_id_idx on public.trainer_clients (trainer_id);

-- ----------------------------------------------------------------------------
-- routines: plantillas genéricas (client_id null) o personalizadas por entrenador
-- ----------------------------------------------------------------------------
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.profiles (id) on delete set null,
  client_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  goal text, -- ej. 'perdida_grasa', 'ganancia_muscular', 'resistencia'
  created_at timestamptz not null default now()
);

create index routines_client_id_idx on public.routines (client_id);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  name text not null,
  sets int not null,
  reps text not null, -- texto para permitir rangos ej. '8-12'
  rest_seconds int,
  order_index int not null default 0,
  notes text
);

create index routine_exercises_routine_id_idx on public.routine_exercises (routine_id);

-- ----------------------------------------------------------------------------
-- access_logs: registro de cada vez que se escanea el QR en la entrada del gym
-- (lo escribe el lector/tablet del gym, lo lee principalmente el dashboard)
-- ----------------------------------------------------------------------------
create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  scanned_at timestamptz not null default now()
);

create index access_logs_client_id_idx on public.access_logs (client_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.client_access_codes enable row level security;
alter table public.trainer_clients enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.access_logs enable row level security;

-- profiles: cada quien ve/edita su propio perfil; además, un cliente puede leer
-- el perfil de su entrenador asignado, y un entrenador el de sus clientes.
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_related" on public.profiles
  for select using (
    id in (
      select trainer_id from public.trainer_clients where client_id = auth.uid()
      union
      select client_id from public.trainer_clients where trainer_id = auth.uid()
    )
  );

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- subscriptions: el cliente ve solo la suya
create policy "subscriptions_select_own" on public.subscriptions
  for select using (client_id = auth.uid());

-- client_access_codes: el cliente ve solo el suyo
create policy "access_codes_select_own" on public.client_access_codes
  for select using (client_id = auth.uid());

-- trainer_clients: cliente ve su propia asignación, entrenador ve las suyas
create policy "trainer_clients_select_client" on public.trainer_clients
  for select using (client_id = auth.uid());

create policy "trainer_clients_select_trainer" on public.trainer_clients
  for select using (trainer_id = auth.uid());

-- routines: cliente ve las suyas + las genéricas (client_id is null);
-- entrenador ve/edita las que él creó
create policy "routines_select_client" on public.routines
  for select using (client_id = auth.uid() or client_id is null);

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
    routine_id in (
      select id from public.routines
      where client_id = auth.uid() or client_id is null or trainer_id = auth.uid()
    )
  );

create policy "routine_exercises_insert_trainer" on public.routine_exercises
  for insert with check (
    routine_id in (select id from public.routines where trainer_id = auth.uid())
  );

create policy "routine_exercises_update_trainer" on public.routine_exercises
  for update using (
    routine_id in (select id from public.routines where trainer_id = auth.uid())
  );

create policy "routine_exercises_delete_trainer" on public.routine_exercises
  for delete using (
    routine_id in (select id from public.routines where trainer_id = auth.uid())
  );

-- access_logs: el cliente puede ver su propio historial de accesos
create policy "access_logs_select_own" on public.access_logs
  for select using (client_id = auth.uid());
