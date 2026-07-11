// Punto único de decisión entre modo Supabase y modo demo (datos simulados en
// localStorage). Se activa automáticamente si faltan las credenciales de
// Supabase, o de forma explícita con NEXT_PUBLIC_DEMO_MODE=true.
export function isDemoMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
