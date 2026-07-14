'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isDemoMode } from '@/lib/data/config';
import { DEMO_AUTH_USERS } from '@/lib/data/mock/authUsers';

const DEMO_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  receptionist: 'Recepcionista',
  platform_admin: 'Admin. de plataforma',
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const demoMode = isDemoMode();

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError('');
    const { error: loginError } = await login(loginEmail, loginPassword);
    if (!loginError) {
      router.push('/dashboard');
    } else {
      setError(loginError);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#141311] via-[#1c1a17] to-[#0e0d0b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--primary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-9 h-9 text-[#141311]" />
          </div>
          <h1 className="text-2xl font-bold text-[#f3f1ea] font-heading uppercase tracking-wide">American Fitness</h1>
          <p className="text-gray-400 text-sm mt-1">Sistema de gestión</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="correo@gimnasio.mx"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2.5 btn-primary rounded-lg font-medium text-sm disabled:opacity-60 transition-colors">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          {demoMode && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Modo demo — acceso rápido</p>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_AUTH_USERS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={loading}
                    onClick={() => doLogin(u.email, 'demo')}
                    className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60 flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-800">{DEMO_ROLE_LABELS[u.role] ?? u.role}</span>
                    <span className="text-xs text-gray-400">{u.email}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">No se valida contraseña real en modo demo.</p>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-gray-500 mt-4">Template Gym v1.0 — American Fitness</p>
      </div>
    </div>
  );
}
