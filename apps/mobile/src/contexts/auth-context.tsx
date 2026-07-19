import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { mockDb } from '@/lib/mock-db';
import type { Profile } from '@/types/database';

// Sesión simplificada en modo mock: no hay JWT ni servidor, solo un id de
// perfil guardado localmente. Cuando exista el backend en FastAPI esto vuelve
// a ser una sesión real (token + refresh).
interface MockSession {
  profileId: string;
}

interface AuthContextValue {
  session: MockSession | null;
  profile: Profile | null;
  isLoading: boolean;
  /** true si la recepción/admin le dio una contraseña provisional y todavía
   * no la cambia — la app debe forzar la pantalla de cambio antes de dejarlo
   * entrar a cualquier otra cosa. */
  mustChangePassword: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  changePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<MockSession | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const profile = useMemo<Profile | null>(
    () => (session ? mockDb.findProfile(session.profileId) : null),
    [session]
  );

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isLoading,
      mustChangePassword,
      signIn: async (phone, password) => {
        const { error, profileId, mustChangePassword: needsChange } = mockDb.signIn(phone, password);
        if (error || !profileId) return { error };
        setSession({ profileId });
        setMustChangePassword(!!needsChange);
        return { error: null };
      },
      changePassword: async (newPassword) => {
        if (!session) return { error: 'No hay sesión activa.' };
        const { error } = mockDb.changePassword(session.profileId, newPassword);
        if (!error) setMustChangePassword(false);
        return { error };
      },
      signOut: async () => {
        setSession(null);
        setMustChangePassword(false);
      },
    }),
    [session, profile, isLoading, mustChangePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
