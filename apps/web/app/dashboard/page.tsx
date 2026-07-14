'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserCheck, UserX, DoorOpen, ShieldOff, CreditCard, TrendingUp, UserPlus, AlertCircle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/shared/MetricCard';
import { LiveScannerPanel } from '@/components/camera/LiveScannerPanel';
import { BusinessActivityFeed, type BusinessActivityEvent } from '@/components/dashboard/BusinessActivityFeed';
import { ActionableAlert, type AlertPriority } from '@/components/dashboard/ActionableAlert';
import { useStore } from '@/lib/store';
import { formatCurrency, daysUntil, daysAgo } from '@/lib/utils';

export default function DashboardPage() {
  const { members, payments, accessLogs, inventory, inventorySales } = useStore();
  const router = useRouter();
  const now = new Date();
  const TODAY = now.toISOString().split('T')[0];
  const THIS_MONTH = TODAY.slice(0, 7);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const YESTERDAY = yesterday.toISOString().split('T')[0];
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const LAST_MONTH = lastMonthDate.toISOString().slice(0, 7);

  // % de cambio; null = sin base de comparación (se muestra "Sin cambio"/"Sin datos").
  const pctChange = (current: number, previous: number): number | null => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
  };

  const metrics = useMemo(() => {
    const active = members.filter(m => m.status === 'active' || m.status === 'temporary_access').length;
    const expiringSoon = members.filter(m => m.status === 'expiring_soon').length;
    const expired = members.filter(m => m.status === 'expired').length;
    const todayAccesses = accessLogs.filter(a => a.timestamp.startsWith(TODAY) && (a.result === 'authorized' || a.result === 'expiring_soon' || a.result === 'temporary_access')).length;
    const todayRejected = accessLogs.filter(a => a.timestamp.startsWith(TODAY) && (a.result === 'expired' || a.result === 'blocked' || a.result === 'invalid_qr')).length;
    const todayPayments = payments.filter(p => p.paymentDate === TODAY && p.status === 'confirmed').length;
    const todayRevenue = payments.filter(p => p.paymentDate === TODAY && p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
    const yesterdayRevenue = payments.filter(p => p.paymentDate === YESTERDAY && p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
    const newThisMonth = members.filter(m => m.createdAt.startsWith(THIS_MONTH)).length;
    const newLastMonth = members.filter(m => m.createdAt.startsWith(LAST_MONTH)).length;
    return {
      active, expiringSoon, expired, todayAccesses, todayRejected, todayPayments,
      todayRevenue, revenueTrend: pctChange(todayRevenue, yesterdayRevenue),
      newThisMonth, newThisMonthTrend: pctChange(newThisMonth, newLastMonth),
    };
  }, [members, payments, accessLogs, TODAY, YESTERDAY, THIS_MONTH, LAST_MONTH]);

  // Solo movimientos de negocio de HOY. Ventas/renovaciones quedan contempladas
  // en el tipo pero no se generan aún: no existe tabla de ventas ni un campo
  // que distinga "renovación" de "pago normal" en el modelo actual.
  const businessActivity = useMemo(() => {
    const events: BusinessActivityEvent[] = [];
    payments
      .filter(p => p.paymentDate === TODAY && p.status === 'confirmed')
      .forEach(p => events.push({
        id: `pay_${p.id}`, type: 'payment', title: 'Pago de mensualidad',
        detail: `${p.memberName} pagó`, amount: p.amount, time: p.paymentDate, employee: p.registeredBy,
      }));
    members
      .filter(m => m.createdAt.startsWith(TODAY))
      .forEach(m => events.push({
        id: `new_${m.id}`, type: 'new_member', title: 'Nueva inscripción',
        detail: `${m.firstName} ${m.lastName} fue registrado`, time: m.createdAt, employee: m.createdBy,
      }));
    payments
      .filter(p => (p.status === 'cancelled' || p.status === 'corrected') && (p.cancelledAt ?? '').startsWith(TODAY))
      .forEach(p => events.push({
        id: `corr_${p.id}`, type: 'payment_correction',
        title: p.status === 'cancelled' ? 'Cancelación de pago' : 'Corrección de pago',
        detail: `${p.memberName}${p.cancelReason ? ` — ${p.cancelReason}` : ''}`, amount: p.amount,
        time: p.cancelledAt ?? p.paymentDate, employee: p.cancelledBy,
      }));
    // Un solo evento por venta completa (no uno por producto).
    inventorySales
      .filter(s => s.status === 'confirmed' && s.soldAt.startsWith(TODAY))
      .forEach(s => {
        const units = s.items.reduce((sum, i) => sum + i.quantity, 0);
        events.push({
          id: `sale_${s.id}`, type: 'sale',
          title: s.memberName ? `Venta de inventario a ${s.memberName}` : 'Venta de inventario',
          detail: `${units} producto${units === 1 ? '' : 's'} vendido${units === 1 ? '' : 's'}`, amount: s.total,
          time: s.soldAt, employee: s.registeredBy,
        });
      });
    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [members, payments, inventorySales, TODAY]);

  const alertCounts = useMemo(() => ({
    expiringTomorrow: members.filter(m => daysUntil(m.expirationDate) === 1).length,
    expiredThisWeek: members.filter(m => m.status === 'expired' && daysAgo(m.expirationDate) <= 7).length,
    lowStock: inventory.filter(i => i.area === 'tienda' && i.minStock !== undefined && i.quantity <= i.minStock).length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
  }), [members, inventory, payments]);

  const handleSendReminder = () => {
    // No existe integración real de mensajería (email/SMS) en el proyecto todavía —
    // se simula la acción con una confirmación visible en vez de un botón inerte.
    window.alert(`Recordatorio simulado enviado a ${alertCounts.expiringTomorrow} miembro(s) que vencen mañana.`);
  };

  const alerts: { key: string; message: string; priority: AlertPriority; actionLabel: string; onAction: () => void }[] = [
    ...(alertCounts.expiringTomorrow > 0 ? [{
      key: 'expiring-tomorrow',
      message: `${alertCounts.expiringTomorrow} miembro${alertCounts.expiringTomorrow === 1 ? '' : 's'} vence${alertCounts.expiringTomorrow === 1 ? '' : 'n'} mañana`,
      priority: 'medium' as AlertPriority, actionLabel: 'Enviar recordatorio', onAction: handleSendReminder,
    }] : []),
    ...(alertCounts.expiredThisWeek > 0 ? [{
      key: 'expired-week',
      message: `${alertCounts.expiredThisWeek} miembro${alertCounts.expiredThisWeek === 1 ? '' : 's'} vencieron esta semana`,
      priority: 'high' as AlertPriority, actionLabel: 'Ver miembros', onAction: () => router.push('/members?status=expired'),
    }] : []),
    ...(alertCounts.lowStock > 0 ? [{
      key: 'low-stock',
      message: `${alertCounts.lowStock} producto${alertCounts.lowStock === 1 ? '' : 's'} tiene${alertCounts.lowStock === 1 ? '' : 'n'} stock bajo`,
      priority: 'medium' as AlertPriority, actionLabel: 'Revisar inventario', onAction: () => router.push('/inventory'),
    }] : []),
    ...(alertCounts.pendingPayments > 0 ? [{
      key: 'pending-payments',
      message: `${alertCounts.pendingPayments} pago${alertCounts.pendingPayments === 1 ? '' : 's'} necesita${alertCounts.pendingPayments === 1 ? '' : 'n'} revisión`,
      priority: 'low' as AlertPriority, actionLabel: 'Ver ingresos', onAction: () => router.push('/payments'),
    }] : []),
  ];

  return (
    <AppShell>
      <Header title="Dashboard" subtitle={`American Fitness — ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`} />
      <div className="p-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Miembros activos" value={metrics.active} icon={Users} iconColor="text-green-600" onClick={() => router.push('/members?status=active')} />
          <MetricCard title="Por vencer" value={metrics.expiringSoon} subtitle="Próximos 7 días" icon={AlertCircle} iconColor="text-yellow-600" onClick={() => router.push('/members?status=expiring_soon')} />
          <MetricCard title="Vencidos" value={metrics.expired} icon={UserX} iconColor="text-red-600" onClick={() => router.push('/members?status=expired')} />
          <MetricCard title="Entradas hoy" value={metrics.todayAccesses} icon={DoorOpen} iconColor="text-blue-600" onClick={() => router.push('/access-history')} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Rechazados hoy" value={metrics.todayRejected} icon={ShieldOff} iconColor="text-red-600" />
          <MetricCard title="Pagos hoy" value={metrics.todayPayments} icon={CreditCard} iconColor="text-blue-600" onClick={() => router.push('/payments')} />
          <MetricCard
            title="Ingresos hoy" value={formatCurrency(metrics.todayRevenue)} icon={TrendingUp} iconColor="text-green-600"
            trend={{ value: metrics.revenueTrend, label: 'vs. ayer' }}
          />
          <MetricCard
            title="Nuevos este mes" value={metrics.newThisMonth} icon={UserPlus} iconColor="text-purple-600"
            trend={{ value: metrics.newThisMonthTrend, label: 'vs. mes anterior' }}
          />
        </div>

        {/* Escáner en vivo + Alertas accionables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <LiveScannerPanel />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Alertas</h2>
            </div>
            {alerts.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">Sin alertas por ahora.</p>
            ) : (
              <div className="space-y-2.5">
                {alerts.map(a => (
                  <ActionableAlert key={a.key} message={a.message} priority={a.priority} actionLabel={a.actionLabel} onAction={a.onAction} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actividad reciente */}
        <BusinessActivityFeed events={businessActivity} />
      </div>
    </AppShell>
  );
}
