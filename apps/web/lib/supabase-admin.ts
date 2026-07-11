import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente de servidor con el service_role key: bypassa RLS por completo.
// SOLO se importa desde Route Handlers / Server Actions — el import 'server-only'
// hace que el build truene si algo del cliente intenta incluirlo en su bundle.
// En modo demo no hay service_role key: queda en null y la ruta que lo usa
// responde con un error controlado en vez de tronar al importar el módulo.
export const supabaseAdmin: SupabaseClient | null =
  !supabaseUrl || !serviceRoleKey
    ? null
    : createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
