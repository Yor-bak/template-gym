'use client';
import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { useCamera } from '@/lib/camera/CameraContext';
import { useInventoryCart } from '@/lib/cart/InventoryCartContext';
import { ReceptionSetupModal } from '@/components/camera/ReceptionSetupModal';
import { applyPrimaryColor, loadPrimaryColor } from '@/lib/theme';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, mustChangePassword } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const camera = useCamera();
  const cart = useInventoryCart();
  const hadUserRef = useRef(false);

  // Aplica el color principal personalizado (si el admin lo cambió) al montar.
  useEffect(() => {
    const saved = loadPrimaryColor();
    if (saved) applyPrimaryColor(saved);
  }, []);

  useEffect(() => {
    // Espera a que la sesión (demo en localStorage o Supabase) termine de
    // rehidratar antes de decidir el redirect; si no, un refresh/deep-link
    // patea a /login aunque haya sesión guardada.
    if (isLoading) return;
    // Único punto de la app que decide el rebote a /change-password: con
    // must_change_password=true el backend bloquea todo endpoint protegido
    // (incluido /users/me, por eso `user` puede venir null aquí) salvo
    // /auth/change-password — ver apps/api/app/auth/dependencies.py.
    if (mustChangePassword && pathname !== '/change-password') {
      router.push('/change-password');
      return;
    }
    if (!mustChangePassword && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, isLoading, mustChangePassword, pathname, router]);

  // Al cerrar sesión (user pasa de autenticado a null) se detiene el stream.
  useEffect(() => {
    if (user) hadUserRef.current = true;
    else if (hadUserRef.current) {
      camera.stop();
      camera.resetSetupPrompt();
      cart.clearCart();
      hadUserRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <ReceptionSetupModal />
    </div>
  );
}
