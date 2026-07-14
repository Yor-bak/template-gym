'use client';
import { useMemo } from 'react';
import { Download, Users, UserX, TrendingUp, UserPlus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/shared/MetricCard';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PeakHoursReport } from '@/components/reports/PeakHoursReport';
import { useStore } from '@/lib/store';
import { formatCurrency, formatDate, daysUntil, downloadCsv } from '@/lib/utils';

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

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thisMonth = today.slice(0, 7);

  // Última fecha de acceso autorizado por miembro, derivada de accessLogs
  // (no hay una columna "lastAccessDate" real — se calcula aquí).
  const lastAccessByMember = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accessLogs) {
      if (!a.memberId || !['authorized', 'expiring_soon', 'temporary_access'].includes(a.result)) continue;
      const current = map.get(a.memberId);
      if (!current || a.timestamp > current) map.set(a.memberId, a.timestamp);
    }
    return map;
  }, [accessLogs]);

  const metrics = useMemo(() => {
    const active = members.filter(m => ['active', 'expiring_soon', 'temporary_access'].includes(m.status));
    const expired = members.filter(m => m.status === 'expired');
    const expiringSoon = members.filter(m => m.status === 'expiring_soon');
    const newThisMonth = members.filter(m => m.createdAt.startsWith(thisMonth));
    const monthRevenue = payments.filter(p => p.paymentDate.startsWith(thisMonth) && p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
    const monthPayments = payments.filter(p => p.paymentDate.startsWith(thisMonth) && p.status === 'confirmed').length;
    const rejectedExpired = accessLogs.filter(a => a.result === 'expired').length;
    return { active: active.length, expired: expired.length, expiringSoon: expiringSoon.length, newThisMonth: newThisMonth.length, monthRevenue, monthPayments, rejectedExpired };
  }, [members, payments, accessLogs, thisMonth]);

  const topMembers = useMemo(() => {
    const counts: Record<string, number> = {};
    accessLogs.forEach(a => { if (a.memberId) counts[a.memberId] = (counts[a.memberId] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ member: members.find(m => m.id === id), count }))
      .filter(x => x.member);
  }, [members, accessLogs]);

  const inactiveMembers = useMemo(() =>
    members.filter(m => {
      if (m.status !== 'active') return false;
      const last = lastAccessByMember.get(m.id);
      return !last || daysUntil(last.split('T')[0]) < -30;
    }).slice(0, 5),
    [members, lastAccessByMember]
  );

  const expiredAttempts = useMemo(() =>
    members.filter(m => accessLogs.some(a => a.memberId === m.id && a.result === 'expired')).slice(0, 5),
    [members, accessLogs]
  );

  const exportUpcomingExpirations = () => {
    const rows = members.filter(m => m.status === 'expiring_soon').map(m => ({
      Miembro: `${m.firstName} ${m.lastName}`, Número: m.memberNumber, Vencimiento: m.expirationDate, 'Días restantes': daysUntil(m.expirationDate),
    }));
    downloadCsv(`vencimientos-${today}.csv`, rows);
  };

  const exportTopMembers = () => {
    const rows = topMembers.map(({ member, count }) => ({ Miembro: `${member!.firstName} ${member!.lastName}`, Número: member!.memberNumber, Accesos: count }));
    downloadCsv(`top-accesos-${today}.csv`, rows);
  };

  const exportExpiredAttempts = () => {
    const rows = expiredAttempts.map(m => ({ Miembro: `${m.firstName} ${m.lastName}`, Número: m.memberNumber, Venció: m.expirationDate }));
    downloadCsv(`vencidos-con-intentos-${today}.csv`, rows);
  };

  const exportInactive = () => {
    const rows = inactiveMembers.map(m => ({ Miembro: `${m.firstName} ${m.lastName}`, Número: m.memberNumber, 'Último acceso': lastAccessByMember.get(m.id) ?? 'Sin accesos' }));
    downloadCsv(`sin-actividad-${today}.csv`, rows);
  };

  const exportPaymentsSummary = () => {
    downloadCsv(`pagos-${thisMonth}.csv`, [
      { Concepto: 'Total confirmado', Valor: metrics.monthRevenue },
      { Concepto: 'Número de pagos', Valor: metrics.monthPayments },
      { Concepto: 'Accesos rechazados (vencidos)', Valor: metrics.rejectedExpired },
    ]);
  };

  return (
    <AppShell>
      <Header title="Reportes" subtitle="Resumen de operación" />
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Miembros activos" value={metrics.active} icon={Users} iconColor="text-green-600" />
          <MetricCard title="Vencidos" value={metrics.expired} icon={UserX} iconColor="text-red-600" />
          <MetricCard title="Ingresos del mes" value={formatCurrency(metrics.monthRevenue)} icon={TrendingUp} iconColor="text-blue-600" />
          <MetricCard title="Nuevos este mes" value={metrics.newThisMonth} icon={UserPlus} iconColor="text-purple-600" />
        </div>

        <PeakHoursReport accessLogs={accessLogs} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Próximos vencimientos" onExport={exportUpcomingExpirations}>
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

          <Section title="Miembros con más accesos" onExport={exportTopMembers}>
            <div className="space-y-2">
              {topMembers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin accesos registrados</p>
              ) : topMembers.map(({ member, count }, i) => member && (
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

          <Section title="Vencidos que intentaron acceder" onExport={exportExpiredAttempts}>
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

          <Section title="Miembros sin actividad reciente (30+ días)" onExport={exportInactive}>
            <div className="space-y-2">
              {inactiveMembers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Todos los miembros tienen actividad reciente</p>
              ) : inactiveMembers.map(m => {
                const last = lastAccessByMember.get(m.id);
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <MemberAvatar firstName={m.firstName} lastName={m.lastName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-gray-400">
                        {last ? `Último: ${formatDate(last.split('T')[0])}` : 'Sin accesos'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Pagos registrados este mes" onExport={exportPaymentsSummary}>
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
