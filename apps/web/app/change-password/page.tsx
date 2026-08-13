'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

// Pantalla obligatoria cuando el backend marca must_change_password=true
// (aprovisionamiento — ver apps/api/app/auth/dependencies.py). AppShell es
// el único que redirige aquí; esta página no decide nada de routing salvo
// mandar a /dashboard cuando el cambio ya se hizo, ni de /login cuando no
// hay sesión en absoluto.
export default function ChangePasswordPage() {
  const { changePassword, mustChangePassword, user, isLoading } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    // Ni sesión pendiente de cambio ni usuario normal: no debería estar aquí.
    if (!mustChangePassword && !user) {
      router.push('/login');
    }
  }, [isLoading, mustChangePassword, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: changeError } = await changePassword(currentPassword, newPassword);
    if (!changeError) {
      router.push('/dashboard');
    } else {
      setError(changeError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#141311] via-[#1c1a17] to-[#0e0d0b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--primary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-9 h-9 text-[#141311]" />
          </div>
          <h1 className="text-2xl font-bold text-[#f3f1ea] font-heading uppercase tracking-wide">
            Cambia tu contraseña
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Es tu primer acceso — necesitas elegir una contraseña nueva antes de continuar.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="La que recibiste al activarse"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña nueva</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 btn-primary rounded-lg font-medium text-sm disabled:opacity-60 transition-colors"
            >
              {loading ? 'Guardando...' : 'Cambiar contraseña y continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
