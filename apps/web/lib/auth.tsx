'use client';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { api, ApiError, getToken, onUnauthorized, setToken } from './api/client';
import { isApiMode, isDemoMode } from './data/config';
import { DEMO_AUTH_USERS } from './data/mock/authUsers';
import { supabase } from './supabase';

// Roles que pueden entrar al dashboard. client/trainer solo existen para la
// app móvil — si alguien con esas credenciales intenta entrar aquí, se rechaza.
const STAFF_ROLES = ['admin', 'receptionist', 'platform_admin'] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

export interface AuthUser {
  id: string;
  gymId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  role: StaffRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  // true si el backend exige cambiar la contraseña antes de cualquier otra
  // cosa (aprovisionamiento — ver apps/api/app/auth/dependencies.py). Solo
  // aplica en modo API real; Supabase/demo siempre lo dejan en false.
  mustChangePassword: boolean;
  login: (identifier: string, password: string) => Promise<{ error: string | null }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

function splitName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(' ');
  return { firstName: firstName ?? '', lastName: rest.join(' ') };
}

// ----------------------------------------------------------------------------
// Modo Supabase: lógica original, sin cambios de comportamiento.
// ----------------------------------------------------------------------------
function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase!.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase!.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setUser(null);
      return;
    }

    let cancelled = false;

    supabase!
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (cancelled || !data || !STAFF_ROLES.includes(data.role) || !data.active) return;
        const { firstName, lastName } = splitName(data.full_name);
        setUser({
          id: data.id,
          gymId: data.gym_id,
          firstName,
          lastName,
          email: session.user.email ?? '',
          role: data.role,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return { error: error?.message ?? 'No se pudo iniciar sesión.' };
    }

    const { data: profile } = await supabase!
      .from('profiles')
      .select('role, active')
      .eq('id', data.session.user.id)
      .single();

    if (!profile || !STAFF_ROLES.includes(profile.role)) {
      await supabase!.auth.signOut();
      return { error: 'Esta cuenta no tiene acceso al panel de administración.' };
    }

    if (!profile.active) {
      await supabase!.auth.signOut();
      return { error: 'Esta cuenta está desactivada. Contacta a un administrador.' };
    }

    return { error: null };
  };

  const logout = () => {
    supabase!.auth.signOut();
  };

  // Cambio de contraseña obligatorio (must_change_password) es una
  // funcionalidad exclusiva del modo API real — Supabase no lo implementa.
  const changePassword = async (): Promise<{ error: string | null }> => (
    { error: 'Cambio de contraseña no disponible en modo Supabase.' }
  );

  return (
    <AuthCtx.Provider value={{ user, isLoading, mustChangePassword: false, login, changePassword, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ----------------------------------------------------------------------------
// Modo demo: login simulado contra una lista fija de usuarios (ver
// lib/data/mock/authUsers.ts). Cualquier contraseña es aceptada. La sesión se
// guarda en localStorage para sobrevivir un refresh de la página.
// ----------------------------------------------------------------------------
const DEMO_USER_STORAGE_KEY = 'demo_auth_user';

function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string): Promise<{ error: string | null }> => {
    const match = DEMO_AUTH_USERS.find((u) => (u.email ?? '').toLowerCase() === email.trim().toLowerCase());
    if (!match) {
      return { error: 'No existe un usuario demo con ese correo. Usa uno de los accesos rápidos.' };
    }
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(match));
    setUser(match);
    return { error: null };
  };

  const logout = () => {
    window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    setUser(null);
  };

  const changePassword = async (): Promise<{ error: string | null }> => (
    { error: 'Cambio de contraseña no disponible en modo demo.' }
  );

  return (
    <AuthCtx.Provider value={{ user, isLoading, mustChangePassword: false, login, changePassword, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ----------------------------------------------------------------------------
// Modo API real: login contra apps/api (POST /auth/login). El backend usa
// roles más finos que el dashboard (gym_admin/gym_admin_secondary), que aquí
// se colapsan a 'admin' — mismo tratamiento que ADMIN_ROLES en el backend
// (ver apps/api/app/modules/users/models.py). trainer/client se rechazan
// igual que en los otros dos modos: son roles de la app móvil, no del panel.
// ----------------------------------------------------------------------------
interface ApiUserPublic {
  id: string;
  role: string;
  gym_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  must_change_password: boolean;
}

function mapApiRole(role: string): StaffRole | null {
  if (role === 'gym_admin' || role === 'gym_admin_secondary') return 'admin';
  if (role === 'receptionist' || role === 'platform_admin') return role;
  return null;
}

function mapApiUser(u: ApiUserPublic): AuthUser | null {
  const role = mapApiRole(u.role);
  if (!role) return null;
  const { firstName, lastName } = splitName(u.full_name);
  return { id: u.id, gymId: u.gym_id, firstName, lastName, email: u.email, role };
}

function ApiAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Separado de `user`: el backend bloquea GET /users/me con 403 mientras
  // must_change_password sea true (ver app/auth/dependencies.py), así que
  // no siempre hay un perfil completo disponible para poblar `user` — pero
  // sí necesitamos saber que hay una sesión válida pendiente de cambio de
  // contraseña, para no expulsar a /login por error en un refresh.
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const clearSession = () => {
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
  };

  useEffect(() => {
    onUnauthorized(clearSession);
    return () => onUnauthorized(null);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    // Revalida contra /users/me en vez de confiar en un usuario cacheado —
    // si la cuenta se desactivó o el token expiró, se descubre aquí.
    api.get<ApiUserPublic>('/users/me')
      .then((u) => {
        setUser(mapApiUser(u));
        setMustChangePassword(u.must_change_password);
      })
      .catch((err) => {
        // 403 aquí significa "token válido, pero must_change_password
        // bloquea /users/me" — no es una sesión inválida, no hay que
        // cerrarla. El guard (AppShell) manda a /change-password con esto.
        if (err instanceof ApiError && err.status === 403) {
          setMustChangePassword(true);
        } else {
          clearSession();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (phone: string, password: string): Promise<{ error: string | null }> => {
    try {
      const res = await api.post<{ access_token: string; user: ApiUserPublic }>('/auth/login', { phone, password });
      setToken(res.access_token);
      if (res.user.must_change_password) {
        // No hay UserPublic completo utilizable aún si el rol no debiera
        // tener acceso al panel — pero en la práctica solo gym_admin sale
        // de este flujo (aprovisionamiento), así que sí mapea.
        setMustChangePassword(true);
        setUser(null);
        return { error: null };
      }
      const mapped = mapApiUser(res.user);
      if (!mapped) {
        setToken(null);
        return { error: 'Esta cuenta no tiene acceso al panel de administración.' };
      }
      setUser(mapped);
      setMustChangePassword(false);
      return { error: null };
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.' };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ error: string | null }> => {
    try {
      const updated = await api.post<ApiUserPublic>('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMustChangePassword(false);
      const mapped = mapApiUser(updated);
      if (mapped) setUser(mapped);
      return { error: null };
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña.' };
    }
  };

  const logout = () => clearSession();

  return (
    <AuthCtx.Provider value={{ user, isLoading, mustChangePassword, login, changePassword, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (isApiMode()) return <ApiAuthProvider>{children}</ApiAuthProvider>;
  return isDemoMode() ? (
    <MockAuthProvider>{children}</MockAuthProvider>
  ) : (
    <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
