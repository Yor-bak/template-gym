'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle, XCircle, Users, Calendar } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/lib/auth';
import { gyms } from '@/data/gyms';
import { formatDate } from '@/lib/utils';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};
const statusLabels: Record<string, string> = {
  active: 'Activa', trial: 'Prueba', suspended: 'Suspendida', cancelled: 'Cancelada',
};

export default function PlatformPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'platform_admin') router.push('/dashboard');
  }, [user, router]);

  if (!user || user.role !== 'platform_admin') return null;

  const totalMembers = gyms.reduce((s, g) => s + g.memberCount, 0);
  const activeGyms = gyms.filter(g => g.active).length;

  return (
    <AppShell>
      <Header title="Panel de Plataforma" subtitle="Template Gym — Administración global" />
      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{gyms.length}</p>
            <p className="text-sm text-gray-500 mt-1">Gimnasios registrados</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{activeGyms}</p>
            <p className="text-sm text-gray-500 mt-1">Gimnasios activos</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{totalMembers}</p>
            <p className="text-sm text-gray-500 mt-1">Total de miembros</p>
          </div>
        </div>

        {/* Gyms Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Gimnasios en la plataforma</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Gimnasio</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Suscripción</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Miembros</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Alta</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gyms.map(gym => (
                  <tr key={gym.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: gym.primaryColor + '20' }}>
                          <Building2 className="w-4 h-4" style={{ color: gym.primaryColor }} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{gym.name}</p>
                          <p className="text-xs text-gray-400">{gym.address.slice(0, 30)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[gym.subscriptionStatus]}`}>
                        {statusLabels[gym.subscriptionStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {gym.active ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-xs text-gray-600">{gym.active ? 'Activo' : 'Inactivo'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>{gym.memberCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(gym.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${gym.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {gym.active ? 'Suspender' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
