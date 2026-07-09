-- Migración: un código de acceso "activo" pero con más de 60s de antigüedad
-- se trata como inválido (evita que quede vigente para siempre si el
-- cliente cierra la app antes de que rote el QR).
-- Ejecutar en el Pi: docker exec -i gym-db psql -U postgres -d postgres < add-access-code-expiry.sql

create or replace function public.validate_access(p_code text, p_reader text default 'Entrada principal')
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
  where c.code = p_code and c.active and c.created_at > now() - interval '60 seconds';

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

  if v_result in ('expired', 'expiring_soon') and v_member.status = 'active' then
    update public.members set status = v_result where id = v_member.id;
  end if;

  return v_log;
end;
$$;

grant execute on function public.validate_access(text, text) to authenticated;
