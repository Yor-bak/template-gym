-- Migración: agrega rotate_my_access_code (QR rotativo, cada 20s desde la app).
-- Ejecutar en el Pi:  docker exec -i gym-db psql -U postgres -d postgres < add-rotate-access-code.sql

create or replace function public.rotate_my_access_code()
returns public.client_access_codes
language plpgsql
security definer set search_path = public
as $$
declare
  v_member_id uuid;
  v_new public.client_access_codes%rowtype;
begin
  select id into v_member_id from public.members where profile_id = auth.uid();

  if v_member_id is null then
    raise exception 'No se encontró un member ligado a esta cuenta';
  end if;

  update public.client_access_codes set active = false where member_id = v_member_id and active;

  insert into public.client_access_codes (member_id)
  values (v_member_id)
  returning * into v_new;

  return v_new;
end;
$$;

grant execute on function public.rotate_my_access_code() to authenticated;
