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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Solo para clientes: requiere un código de activación válido dado por el gym. */
  activateAccount: (params: {
    email: string;
    password: string;
    activationCode: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<MockSession | null>(null);
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
      signIn: async (email, password) => {
        const { error, profileId } = mockDb.signIn(email, password);
        if (error || !profileId) return { error };
        setSession({ profileId });
        return { error: null };
      },
      activateAccount: async ({ email, password, activationCode }) => {
        // No inicia sesión automáticamente: el registro original navegaba de
        // vuelta al login para que el cliente entre con su nueva contraseña.
        const { error } = mockDb.activateAccount(email, password, activationCode);
        return { error };
      },
      signOut: async () => {
        setSession(null);
      },
    }),
    [session, profile, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
