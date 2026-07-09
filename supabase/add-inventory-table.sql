-- Migración: agrega inventory_items (tabla + RLS). No borra datos existentes.
-- Ejecutar en el Pi:  docker exec -i gym-db psql -U postgres -d postgres < add-inventory-table.sql

create table if not exists public.inventory_items (
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

create index if not exists inventory_items_gym_id_idx on public.inventory_items (gym_id);
create index if not exists inventory_items_area_idx on public.inventory_items (area);

alter table public.inventory_items enable row level security;

drop policy if exists "inventory_select_staff" on public.inventory_items;
create policy "inventory_select_staff" on public.inventory_items
  for select using (
    public.my_role() in ('admin', 'receptionist', 'platform_admin')
    and (gym_id = public.my_gym_id() or public.my_role() = 'platform_admin')
  );

drop policy if exists "inventory_insert_staff" on public.inventory_items;
create policy "inventory_insert_staff" on public.inventory_items
  for insert with check (public.my_role() in ('admin', 'receptionist') and gym_id = public.my_gym_id());

drop policy if exists "inventory_update_staff" on public.inventory_items;
create policy "inventory_update_staff" on public.inventory_items
  for update using (public.my_role() in ('admin', 'receptionist') and gym_id = public.my_gym_id());

drop policy if exists "inventory_delete_admin" on public.inventory_items;
create policy "inventory_delete_admin" on public.inventory_items
  for delete using (public.my_role() = 'admin' and gym_id = public.my_gym_id());
