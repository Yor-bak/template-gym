'use client';
import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { useCamera } from '@/lib/camera/CameraContext';
import { useInventoryCart } from '@/lib/cart/InventoryCartContext';
import { ReceptionSetupModal } from '@/components/camera/ReceptionSetupModal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const camera = useCamera();
  const cart = useInventoryCart();
  const hadUserRef = useRef(false);

  useEffect(() => {
    if (!user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, pathname, router]);

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
