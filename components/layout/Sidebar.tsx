'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Monitor, Users, CreditCard, History,
  BarChart2, Settings, Shield, UserCheck, LogOut, Dumbbell, Boxes
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { currentGym } from '@/data/gyms';

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/access-monitor', label: 'Monitor de acceso', icon: Monitor },
  { href: '/members', label: 'Miembros', icon: Users },
  { href: '/memberships', label: 'Membresías', icon: Dumbbell },
  { href: '/payments', label: 'Pagos', icon: CreditCard },
  { href: '/inventory', label: 'Inventario', icon: Boxes },
  { href: '/access-history', label: 'Historial de accesos', icon: History },
  { href: '/reports', label: 'Reportes', icon: BarChart2 },
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

  const handleLogout = () => { logout(); router.push('/login'); };

  const visibleItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <aside className="w-60 shrink-0 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      {/* Gym Header */}
      <div className="px-4 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{currentGym.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-xs text-gray-400">Sistema activo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-0.5">
        {user?.role === 'platform_admin' && (
          <Link href="/platform" className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors', pathname === '/platform' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800')}>
            <Shield className="w-4 h-4 shrink-0" />
            <span>Panel de plataforma</span>
          </Link>
        )}
        {visibleItems.map(item => (
          <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors', pathname === item.href || pathname.startsWith(item.href + '/') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800')}>
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Footer */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-semibold shrink-0">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user ? `${user.firstName} ${user.lastName.split(' ')[0]}` : 'Usuario'}</p>
            <p className="text-xs text-gray-400">{user ? roleLabels[user.role] : ''}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full">
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
