import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { isDemoMode } from './data/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cliente de navegador: usa el anon key, respeta RLS según el usuario logueado.
// Nunca importar el service_role key aquí — eso vive solo en supabase-admin.ts.
// En modo demo (o si faltan las credenciales) no se inicializa: todo el código
// que lo consume vive detrás de un `isDemoMode()` que nunca llega a usar `null`.
export const supabase: SupabaseClient | null =
  isDemoMode() || !supabaseUrl || !supabaseAnonKey
    ? null
    : createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
