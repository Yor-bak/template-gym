import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Revisa apps/mobile/.env (copia .env.example).'
  );
}

// Durante el renderizado del lado servidor de Expo Router para la plataforma web
// (por ejemplo, cuando Expo Go pide metadata del proyecto) este módulo se ejecuta
// en Node.js, donde no existe `window`. El adaptador web de AsyncStorage sí lo
// necesita, así que solo lo usamos cuando de verdad hay un `window` disponible
// (dispositivo nativo o navegador real); si no, cae a almacenamiento en memoria.
const authStorage = typeof window === 'undefined' ? undefined : AsyncStorage;

// Nota: el cliente no usa el genérico Database<> de supabase-js (requiere una forma
// exacta de esquema); en su lugar, los hooks en src/hooks/use-gym-data.ts castean
// los resultados a los tipos de src/types/database.ts.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: typeof window !== 'undefined',
    persistSession: typeof window !== 'undefined',
    detectSessionInUrl: false,
  },
});
