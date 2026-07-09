'use client';
import { useState, useMemo } from 'react';
import { Download, TrendingUp, Wallet, CreditCard, Building2, XCircle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { FilterBar } from '@/components/shared/FilterBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MetricCard } from '@/components/shared/MetricCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate, getPaymentMethodLabel, getPaymentStatusLabel } from '@/lib/utils';

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function PaymentsPage() {
  const now = new Date();
  const TODAY = toISODate(now);
  const THIS_MONTH = TODAY.slice(0, 7);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const THIS_WEEK_START = toISODate(weekStart);
  const { payments, cancelPayment } = useStore();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const filtered = useMemo(() => {
    let list = payments;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.memberName.toLowerCase().includes(q) || p.memberNumber.toLowerCase().includes(q));
    }
    if (methodFilter) list = list.filter(p => p.method === methodFilter);
    if (statusFilter) list = list.filter(p => p.status === statusFilter);
    if (periodFilter === 'today') list = list.filter(p => p.paymentDate === TODAY);
    else if (periodFilter === 'week') list = list.filter(p => p.paymentDate >= THIS_WEEK_START);
    else if (periodFilter === 'month') list = list.filter(p => p.paymentDate.startsWith(THIS_MONTH));
    return list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [payments, search, methodFilter, statusFilter, periodFilter]);

  const confirmed = filtered.filter(p => p.status === 'confirmed');
  const totalRevenue = confirmed.reduce((s, p) => s + p.amount, 0);
  const cashTotal = confirmed.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
  const cardTotal = confirmed.filter(p => p.method === 'card').reduce((s, p) => s + p.amount, 0);
  const transferTotal = confirmed.filter(p => p.method === 'transfer').reduce((s, p) => s + p.amount, 0);

  const handleCancel = () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    cancelPayment(cancelTarget, `${user?.firstName} ${user?.lastName}`, cancelReason);
    setCancelTarget(null);
    setCancelReason('');
  };

  void getPaymentStatusLabel;

  return (
    <AppShell>
      <Header
        title="Pagos"
        subtitle="Historial de movimientos"
        actions={
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        }
      />
      <div className="p-6 space-y-5">
        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total registrado" value={formatCurrency(totalRevenue)} icon={TrendingUp} iconColor="text-green-600" />
          <MetricCard title="Efectivo" value={formatCurrency(cashTotal)} icon={Wallet} iconColor="text-blue-600" />
          <MetricCard title="Tarjeta" value={formatCurrency(cardTotal)} icon={CreditCard} iconColor="text-purple-600" />
          <MetricCard title="Transferencia" value={formatCurrency(transferTotal)} icon={Building2} iconColor="text-teal-600" />
        </div>

        {/* Period Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {[{ key: 'today', label: 'Hoy' }, { key: 'week', label: 'Esta semana' }, { key: 'month', label: 'Este mes' }, { key: 'all', label: 'Todos' }].map(p => (
            <button key={p.key} onClick={() => setPeriodFilter(p.key)} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${periodFilter === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>

        <FilterBar
          search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por miembro..."
          filters={[
            { key: 'method', label: 'Método', value: methodFilter, options: [{ value: 'cash', label: 'Efectivo' }, { value: 'card', label: 'Tarjeta' }, { value: 'transfer', label: 'Transferencia' }], onChange: setMethodFilter },
            { key: 'status', label: 'Estado', value: statusFilter, options: [{ value: 'confirmed', label: 'Confirmado' }, { value: 'cancelled', label: 'Cancelado' }, { value: 'pending', label: 'Pendiente' }], onChange: setStatusFilter },
          ]}
          onClear={() => { setSearch(''); setMethodFilter(''); setStatusFilter(''); }}
        />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sin pagos" description="No hay pagos registrados con los filtros actuales." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Miembro</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Membresía</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cantidad</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Método</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Responsable</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p.id} className={p.status === 'cancelled' ? 'opacity-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 text-gray-600">{formatDate(p.paymentDate)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.memberName}</p>
                        <p className="text-xs text-gray-400">{p.memberNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.membershipName}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{getPaymentMethodLabel(p.method)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.registeredBy}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status as any} /></td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'confirmed' && user?.role === 'admin' && (
                          <button onClick={() => setCancelTarget(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Cancelar pago">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Payment Dialog */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900 mb-3">Cancelar pago</h3>
            <p className="text-sm text-gray-500 mb-4">Indica el motivo de la cancelación. Esta acción quedará registrada en el historial.</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Motivo de cancelación..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setCancelTarget(null)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={handleCancel} disabled={!cancelReason.trim()} className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Confirmar cancelación</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
