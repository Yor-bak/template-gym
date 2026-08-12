import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { authApi, getToken } from '@/lib/api-client';
import type { User } from '@/types/database';

interface AuthContextValue {
  session: { userId: string } | null;
  profile: User | null;
  isLoading: boolean;
  /** true si la recepción/admin le dio una contraseña provisional y todavía
   * no la cambia — la app debe forzar la pantalla de cambio antes de dejarlo
   * entrar a cualquier otra cosa. Viene directo del backend (must_change_password). */
  mustChangePassword: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al abrir la app, si ya hay un token guardado (SecureStore) se intenta
  // reanudar la sesión pidiendo el usuario actual — evita pedir login cada
  // vez que se reabre la app mientras el JWT siga vigente.
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        setProfile(me);
      } catch {
        await authApi.signOut();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session: profile ? { userId: profile.id } : null,
      profile,
      isLoading,
      mustChangePassword: profile?.mustChangePassword ?? false,
      signIn: async (phone, password) => {
        const { error, user } = await authApi.login(phone, password);
        if (error || !user) return { error };
        setProfile(user);
        return { error: null };
      },
      changePassword: async (currentPassword, newPassword) => {
        const { error } = await authApi.changePassword(currentPassword, newPassword);
        if (!error && profile) setProfile({ ...profile, mustChangePassword: false });
        return { error };
      },
      signOut: async () => {
        await authApi.signOut();
        setProfile(null);
      },
      refreshProfile: async () => {
        try {
          const me = await authApi.me();
          setProfile(me);
        } catch {
          // Token inválido/expirado — se resuelve solo cuando el usuario
          // vuelva a intentar una acción y reciba 401 en otra pantalla.
        }
      },
    }),
    [profile, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
