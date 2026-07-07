'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserCheck, UserX, DoorOpen, ShieldOff, CreditCard, TrendingUp, UserPlus, AlertCircle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { useStore } from '@/lib/store';
import { formatCurrency, formatDate, formatDateTime, daysUntil, daysAgo, timeAgo } from '@/lib/utils';

const TODAY = '2026-07-02';
const THIS_MONTH = '2026-07';

export default function DashboardPage() {
  const { members, payments, accessLogs } = useStore();
  const router = useRouter();

  const metrics = useMemo(() => {
    const active = members.filter(m => m.status === 'active' || m.status === 'temporary_access').length;
    const expiringSoon = members.filter(m => m.status === 'expiring_soon').length;
    const expired = members.filter(m => m.status === 'expired').length;
    const todayAccesses = accessLogs.filter(a => a.timestamp.startsWith(TODAY) && (a.result === 'authorized' || a.result === 'expiring_soon' || a.result === 'temporary_access')).length;
    const todayRejected = accessLogs.filter(a => a.timestamp.startsWith(TODAY) && (a.result === 'expired' || a.result === 'blocked' || a.result === 'invalid_qr')).length;
    const todayPayments = payments.filter(p => p.paymentDate === TODAY && p.status === 'confirmed').length;
    const monthRevenue = payments.filter(p => p.paymentDate.startsWith(THIS_MONTH) && p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
    const newThisMonth = members.filter(m => m.createdAt.startsWith(THIS_MONTH)).length;
    return { active, expiringSoon, expired, todayAccesses, todayRejected, todayPayments, monthRevenue, newThisMonth };
  }, [members, payments, accessLogs]);

  const upcomingExpirations = useMemo(() =>
    members.filter(m => m.status === 'expiring_soon' || (m.status === 'active' && daysUntil(m.expirationDate) <= 14))
      .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())
      .slice(0, 8),
    [members]
  );

  const recentActivity = useMemo(() => {
    const events: { id: string; text: string; time: string; type: string }[] = [];
    payments.slice(0, 5).forEach(p => events.push({ id: `pay_${p.id}`, text: `Pago registrado — ${p.memberName} (${formatCurrency(p.amount)})`, time: p.paymentDate, type: 'payment' }));
    members.filter(m => m.createdAt.startsWith(THIS_MONTH)).slice(0, 3).forEach(m => events.push({ id: `new_${m.id}`, text: `Nuevo miembro — ${m.firstName} ${m.lastName}`, time: m.createdAt, type: 'new' }));
    members.filter(m => m.status === 'blocked').forEach(m => events.push({ id: `blk_${m.id}`, text: `Usuario bloqueado — ${m.firstName} ${m.lastName}`, time: m.blockedAt ?? m.createdAt, type: 'block' }));
    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
  }, [members, payments]);

  const recentAccesses = useMemo(() =>
    accessLogs.slice(0, 8),
    [accessLogs]
  );

  const activityColors: Record<string, string> = {
    payment: 'bg-green-100 text-green-600',
    new: 'bg-blue-100 text-blue-600',
    block: 'bg-red-100 text-red-600',
  };

  return (
    <AppShell>
      <Header title="Dashboard" subtitle={`American Fitness — ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`} />
      <div className="p-6 space-y-6">

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Miembros activos" value={metrics.active} icon={Users} iconColor="text-green-600" onClick={() => router.push('/members?status=active')} />
          <MetricCard title="Por vencer" value={metrics.expiringSoon} subtitle="Próximos 7 días" icon={AlertCircle} iconColor="text-yellow-600" onClick={() => router.push('/members?status=expiring_soon')} />
          <MetricCard title="Vencidos" value={metrics.expired} icon={UserX} iconColor="text-red-600" onClick={() => router.push('/members?status=expired')} />
          <MetricCard title="Entradas hoy" value={metrics.todayAccesses} icon={DoorOpen} iconColor="text-blue-600" onClick={() => router.push('/access-history')} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Rechazados hoy" value={metrics.todayRejected} icon={ShieldOff} iconColor="text-red-600" />
          <MetricCard title="Pagos hoy" value={metrics.todayPayments} icon={CreditCard} iconColor="text-blue-600" onClick={() => router.push('/payments')} />
          <MetricCard title="Ingresos del mes" value={formatCurrency(metrics.monthRevenue)} icon={TrendingUp} iconColor="text-green-600" />
          <MetricCard title="Nuevos este mes" value={metrics.newThisMonth} icon={UserPlus} iconColor="text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming expirations */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Próximos vencimientos</h2>
              <button onClick={() => router.push('/members?status=expiring_soon')} className="text-sm text-blue-600 hover:underline">Ver todos</button>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingExpirations.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Sin vencimientos próximos</p>
              ) : upcomingExpirations.map(m => {
                const days = daysUntil(m.expirationDate);
                return (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <MemberAvatar firstName={m.firstName} lastName={m.lastName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-gray-400">{m.memberNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatDate(m.expirationDate)}</p>
                      <p className={`text-xs font-medium ${days <= 3 ? 'text-red-600' : days <= 7 ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {days === 0 ? 'Hoy' : days < 0 ? `Hace ${Math.abs(days)}d` : `En ${days} días`}
                      </p>
                    </div>
                    <button onClick={() => router.push(`/members/${m.id}`)} className="ml-2 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                      Pagar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Actividad reciente</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {recentActivity.map(ev => (
                <div key={ev.id} className="px-5 py-3 flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${activityColors[ev.type] ?? 'bg-gray-100 text-gray-500'}`}>
                    {ev.type === 'payment' ? '💳' : ev.type === 'new' ? '👤' : '🚫'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-snug">{ev.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(ev.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Accesses */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Accesos recientes</h2>
            <button onClick={() => router.push('/access-history')} className="text-sm text-blue-600 hover:underline">Ver historial</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs text-gray-500 font-medium">Hora</th>
                  <th className="text-left px-5 py-2.5 text-xs text-gray-500 font-medium">Miembro</th>
                  <th className="text-left px-5 py-2.5 text-xs text-gray-500 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentAccesses.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{a.timestamp.split('T')[1]?.slice(0, 5)}</td>
                    <td className="px-5 py-3">
                      {a.memberName ? (
                        <div className="flex items-center gap-2">
                          <MemberAvatar firstName={a.memberName.split(' ')[0]} lastName={a.memberName.split(' ')[1] ?? 'M'} size="sm" />
                          <span className="font-medium text-gray-900">{a.memberName}</span>
                        </div>
                      ) : <span className="text-gray-400">Desconocido</span>}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={a.result as any} />
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
