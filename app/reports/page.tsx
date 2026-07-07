'use client';
import { useMemo } from 'react';
import { Download, BarChart2, Users, UserX, Clock, TrendingUp, UserPlus, DoorOpen, AlertCircle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/shared/MetricCard';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useStore } from '@/lib/store';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';

const THIS_MONTH = '2026-07';

function Section({ title, children, onExport }: { title: string; children: React.ReactNode; onExport?: () => void }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {onExport && (
          <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function ReportsPage() {
  const { members, payments, accessLogs } = useStore();

  const metrics = useMemo(() => {
    const active = members.filter(m => ['active', 'expiring_soon', 'temporary_access'].includes(m.status));
    const expired = members.filter(m => m.status === 'expired');
    const expiringSoon = members.filter(m => m.status === 'expiring_soon');
    const newThisMonth = members.filter(m => m.createdAt.startsWith(THIS_MONTH));
    const monthRevenue = payments.filter(p => p.paymentDate.startsWith(THIS_MONTH) && p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
    const monthPayments = payments.filter(p => p.paymentDate.startsWith(THIS_MONTH) && p.status === 'confirmed').length;
    const todayAccesses = accessLogs.filter(a => a.timestamp.startsWith('2026-07-02') && ['authorized', 'expiring_soon', 'temporary_access'].includes(a.result)).length;
    const rejectedExpired = accessLogs.filter(a => a.result === 'expired').length;
    return { active: active.length, expired: expired.length, expiringSoon: expiringSoon.length, newThisMonth: newThisMonth.length, monthRevenue, monthPayments, todayAccesses, rejectedExpired };
  }, [members, payments, accessLogs]);

  // Top accessed members
  const topMembers = useMemo(() => {
    const counts: Record<string, number> = {};
    accessLogs.forEach(a => { if (a.memberId) counts[a.memberId] = (counts[a.memberId] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ member: members.find(m => m.id === id), count }))
      .filter(x => x.member);
  }, [members, accessLogs]);

  // Inactive members (no access in 30 days)
  const inactiveMembers = useMemo(() =>
    members.filter(m => m.status === 'active' && (!m.lastAccessDate || daysUntil(m.lastAccessDate.split('T')[0]) < -30)).slice(0, 5),
    [members]
  );

  // Expired still trying
  const expiredAttempts = useMemo(() =>
    members.filter(m => {
      const attempts = accessLogs.filter(a => a.memberId === m.id && a.result === 'expired');
      return attempts.length > 0;
    }).slice(0, 5),
    [members, accessLogs]
  );

  // Daily accesses (last 7 days)
  const dailyAccesses = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date('2026-07-02');
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = accessLogs.filter(a => a.timestamp.startsWith(dateStr) && ['authorized', 'expiring_soon', 'temporary_access'].includes(a.result)).length;
      days.push({ date: dateStr.slice(5), count });
    }
    return days;
  }, [accessLogs]);

  const maxCount = Math.max(...dailyAccesses.map(d => d.count), 1);

  return (
    <AppShell>
      <Header title="Reportes" subtitle="Resumen de operación" />
      <div className="p-6 space-y-6">

        {/* KPI Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Miembros activos" value={metrics.active} icon={Users} iconColor="text-green-600" />
          <MetricCard title="Vencidos" value={metrics.expired} icon={UserX} iconColor="text-red-600" />
          <MetricCard title="Ingresos del mes" value={formatCurrency(metrics.monthRevenue)} icon={TrendingUp} iconColor="text-blue-600" />
          <MetricCard title="Nuevos este mes" value={metrics.newThisMonth} icon={UserPlus} iconColor="text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily access chart */}
          <Section title="Entradas por día (últimos 7 días)" onExport={() => alert('Exportando CSV...')}>
            <div className="flex items-end gap-2 h-32">
              {dailyAccesses.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{d.count}</span>
                  <div
                    className="w-full bg-blue-500 rounded-t-sm transition-all"
                    style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                  />
                  <span className="text-xs text-gray-400">{d.date}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Upcoming expirations */}
          <Section title="Próximos vencimientos" onExport={() => alert('Exportando CSV...')}>
            <div className="space-y-2">
              {members.filter(m => m.status === 'expiring_soon').slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <MemberAvatar firstName={m.firstName} lastName={m.lastName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-gray-400">{m.memberNumber}</p>
                  </div>
                  <span className={`text-xs font-medium ${daysUntil(m.expirationDate) <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>
                    En {daysUntil(m.expirationDate)} días
                  </span>
                </div>
              ))}
              {members.filter(m => m.status === 'expiring_soon').length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Sin vencimientos próximos</p>
              )}
            </div>
          </Section>

          {/* Top members */}
          <Section title="Miembros con más accesos" onExport={() => alert('Exportando CSV...')}>
            <div className="space-y-2">
              {topMembers.map(({ member, count }, i) => member && (
                <div key={member.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-300 w-5">{i + 1}</span>
                  <MemberAvatar firstName={member.firstName} lastName={member.lastName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-gray-400">{member.memberNumber}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{count}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Expired still attempting */}
          <Section title="Vencidos que intentaron acceder" onExport={() => alert('Exportando CSV...')}>
            <div className="space-y-2">
              {expiredAttempts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin intentos registrados</p>
              ) : expiredAttempts.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <MemberAvatar firstName={m.firstName} lastName={m.lastName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-gray-400">Venció: {formatDate(m.expirationDate)}</p>
                  </div>
                  <StatusBadge status="expired" />
                </div>
              ))}
            </div>
          </Section>

          {/* Inactive */}
          <Section title="Miembros sin actividad reciente" onExport={() => alert('Exportando CSV...')}>
            <div className="space-y-2">
              {inactiveMembers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Todos los miembros tienen actividad reciente</p>
              ) : inactiveMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <MemberAvatar firstName={m.firstName} lastName={m.lastName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-gray-400">
                      {m.lastAccessDate ? `Último: ${formatDate(m.lastAccessDate.split('T')[0])}` : 'Sin accesos'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Payment summary */}
          <Section title="Pagos registrados este mes" onExport={() => alert('Exportando CSV...')}>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Total confirmado</span>
                <span className="font-semibold text-gray-900">{formatCurrency(metrics.monthRevenue)}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Número de pagos</span>
                <span className="font-semibold text-gray-900">{metrics.monthPayments}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Accesos rechazados (vencidos)</span>
                <span className="font-semibold text-red-600">{metrics.rejectedExpired}</span>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}
