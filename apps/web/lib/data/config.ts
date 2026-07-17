// Punto único de decisión entre modo API real (apps/api), Supabase y modo
// demo (datos simulados en localStorage). isApiMode() tiene prioridad sobre
// isDemoMode(): si NEXT_PUBLIC_API_URL está configurado, el store y la
// autenticación hablan con el backend FastAPI real en vez de Supabase o del
// mock — ver StoreProvider/AuthProvider en lib/store.tsx y lib/auth.tsx.
export function isApiMode(): boolean {
  return !!process.env.NEXT_PUBLIC_API_URL;
}

// Se activa automáticamente si faltan las credenciales de Supabase (y no hay
// backend real configurado), o de forma explícita con NEXT_PUBLIC_DEMO_MODE=true.
export function isDemoMode(): boolean {
  if (isApiMode()) return false;
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
