'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { staff as staffSeed } from '@/data';

// Roles que pueden entrar al dashboard. client/trainer solo existen para la
// app móvil — si alguien con esas credenciales intenta entrar aquí, se rechaza.
const STAFF_ROLES = ['admin', 'receptionist', 'platform_admin'] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

export interface AuthUser {
  id: string;
  gymId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'gym-mock-session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_KEY) : null;
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    const match = staffSeed.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());

    if (!match || match.password !== password) {
      return { error: 'Correo o contraseña incorrectos.' };
    }
    if (!STAFF_ROLES.includes(match.role)) {
      return { error: 'Esta cuenta no tiene acceso al panel de administración.' };
    }
    if (!match.active) {
      return { error: 'Esta cuenta está desactivada. Contacta a un administrador.' };
    }

    const nextUser: AuthUser = {
      id: match.id,
      gymId: match.gymId ?? null,
      firstName: match.firstName,
      lastName: match.lastName,
      email: match.email,
      role: match.role,
    };
    setUser(nextUser);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    return { error: null };
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem(SESSION_KEY);
  };

  return <AuthCtx.Provider value={{ user, isLoading, login, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
