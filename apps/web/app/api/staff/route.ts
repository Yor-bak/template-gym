import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';

const CREATABLE_ROLES = ['admin', 'receptionist', 'trainer'];

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Crea cuentas de staff/entrenador vía la Admin API de Supabase. Solo
// server-side: usa el service_role key, nunca expuesto al navegador. El
// signup público (activation_code) nunca puede crear estos roles — este es
// el único camino legítimo.
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const {
    data: { user: caller },
    error: callerError,
  } = await supabaseAdmin.auth.getUser(token);
  if (callerError || !caller) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role, gym_id, active')
    .eq('id', caller.id)
    .single();

  if (!callerProfile || !callerProfile.active || !['admin', 'platform_admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'No tienes permiso para crear cuentas de staff' }, { status: 403 });
  }

  const body = await request.json();
  const { firstName, lastName, email, role, gymId } = body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    gymId?: string;
  };

  if (!firstName || !email || !role || !CREATABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Datos incompletos o rol inválido' }, { status: 400 });
  }

  const targetGymId = gymId ?? callerProfile.gym_id;
  if (!targetGymId) {
    return NextResponse.json({ error: 'Falta indicar la sucursal (gymId)' }, { status: 400 });
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? 'No se pudo crear la cuenta' }, { status: 400 });
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: created.user.id,
    gym_id: targetGymId,
    role,
    full_name: `${firstName} ${lastName ?? ''}`.trim(),
    email,
  });

  if (profileError) {
    // Evita dejar una cuenta de auth huérfana sin profile si el insert falla.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ tempPassword });
}
