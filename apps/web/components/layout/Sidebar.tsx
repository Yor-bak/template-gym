'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Monitor, Users, CreditCard, History,
  BarChart2, Settings, Shield, UserCheck, LogOut, Dumbbell, Boxes, Users2, Headset
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { isDemoMode } from '@/lib/data/config';
import { useStore } from '@/lib/store';

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/access-monitor', label: 'Monitor de acceso', icon: Monitor },
  { href: '/members', label: 'Miembros', icon: Users },
  { href: '/memberships', label: 'Membresías', icon: Dumbbell },
  { href: '/trainers', label: 'Entrenadores', icon: Users2 },
  { href: '/payments', label: 'Ingresos', icon: CreditCard },
  { href: '/inventory', label: 'Inventario', icon: Boxes },
  { href: '/access-history', label: 'Historial de accesos', icon: History },
  { href: '/reports', label: 'Reportes', icon: BarChart2 },
  // Visible para todo el que llega al dashboard (admin/recepcionista): el
  // contenido contractual/bancario se filtra dentro de la propia página
  // (CustomerSupportSection), no aquí en la navegación.
  { href: '/customer-support', label: 'Atención al cliente', icon: Headset },
  { href: '/staff', label: 'Personal', icon: UserCheck, adminOnly: true },
  { href: '/settings', label: 'Configuración', icon: Settings, adminOnly: true },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  receptionist: 'Recepcionista',
  platform_admin: 'Admin Plataforma',
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { gym } = useStore();

  const handleLogout = () => { logout(); router.push('/login'); };

  const visibleItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');

  // El riel lateral es siempre oscuro (en ambos modos, hoy solo existe oscuro)
  // y usa sus propios tokens fijos en vez de la escala gray-* remapeada: esa
  // escala se invierte para las superficies "de tarjeta" del resto de la app
  // (gray-700 pasa a ser un tono casi blanco), lo que rompería los bordes y
  // círculos oscuros que el Sidebar necesita mantener siempre oscuros.
  return (
    <aside className="w-60 shrink-0 bg-[#0e0d0b] text-[#f3f1ea] flex flex-col h-screen sticky top-0">
      {/* Gym Header */}
      <div className="px-4 py-5 border-b border-[#2a2822]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[var(--primary)] flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 text-[#141311]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{gym?.name ?? 'Cargando...'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
              <span className="text-xs text-[#9c9689]">Sistema activo</span>
            </div>
            {isDemoMode() && (
              <span className="inline-block mt-1.5 text-[10px] font-medium uppercase tracking-wide bg-[#3a3213] text-[#ffb020] px-1.5 py-0.5 rounded">
                Modo demo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-0.5">
        {user?.role === 'platform_admin' && (
          <Link
            href="/platform"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border-l-2',
              pathname === '/platform'
                ? 'bg-[#1f2010] border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[#9c9689] hover:text-[#f3f1ea] hover:bg-[#1c1a17]'
            )}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span>Panel de plataforma</span>
          </Link>
        )}
        {visibleItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border-l-2',
                active
                  ? 'bg-[#1f2010] border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[#9c9689] hover:text-[#f3f1ea] hover:bg-[#1c1a17]'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="px-4 py-4 border-t border-[#2a2822]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#2a2822] flex items-center justify-center text-xs font-semibold shrink-0">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user ? `${user.firstName} ${user.lastName.split(' ')[0]}` : 'Usuario'}</p>
            <p className="text-xs text-[#9c9689]">{user ? roleLabels[user.role] : ''}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-[#9c9689] hover:text-[#f3f1ea] transition-colors w-full">
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
