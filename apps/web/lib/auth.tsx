'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Staff } from '@/types';
import { staff } from '@/data/staff';

const SESSION_KEY = 'tg_user_id';

interface AuthContext {
  user: Staff | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthCtx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Staff | null>(() => {
    if (typeof window === 'undefined') return null;
    const id = sessionStorage.getItem(SESSION_KEY);
    return id ? (staff.find(s => s.id === id) ?? null) : null;
  });

  const login = (email: string, password: string): boolean => {
    const found = staff.find(s => s.email === email && s.password === password && s.active);
    if (found) {
      sessionStorage.setItem(SESSION_KEY, found.id);
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
