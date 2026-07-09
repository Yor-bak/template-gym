import 'server-only';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Revisa apps/web/.env.local (copia .env.example).'
  );
}

// Cliente de servidor con el service_role key: bypassa RLS por completo.
// SOLO se importa desde Route Handlers / Server Actions — el import 'server-only'
// hace que el build truene si algo del cliente intenta incluirlo en su bundle.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
