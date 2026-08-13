'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, TrendingUp, Wallet, CreditCard, Building2, XCircle, ShoppingCart, Receipt, UserPlus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { FilterBar } from '@/components/shared/FilterBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MetricCard } from '@/components/shared/MetricCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { InventorySaleModal } from '@/components/payments/InventorySaleModal';
import { useStore } from '@/lib/store';
import { isStaffAdmin, useAuth } from '@/lib/auth';
import { formatCurrency, formatDate, formatTime, getPaymentMethodLabel } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import type { IncomeSource, IncomeTransaction } from '@/types';

const STATUS_LABELS: Record<string, string> = { confirmed: 'Confirmado', cancelled: 'Cancelado', corrected: 'Corregido', pending: 'Pendiente' };

type Tab = 'all' | 'membership' | 'inventory';

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

const ORIGIN_LABELS: Record<IncomeSource, string> = { membership: 'Membresía', inventory: 'Inventario' };
const ORIGIN_STYLES: Record<IncomeSource, string> = {
  membership: 'bg-blue-100 text-blue-800',
  inventory: 'bg-amber-100 text-amber-800',
};

function OriginBadge({ source }: { source: IncomeSource }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ORIGIN_STYLES[source]}`}>{ORIGIN_LABELS[source]}</span>;
}

export default function IncomePage() {
  const now = new Date();
  const TODAY = toISODate(now);
  const THIS_MONTH = TODAY.slice(0, 7);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const THIS_WEEK_START = toISODate(weekStart);

  const { payments, inventorySales, cancelPayment, cancelInventorySale } = useStore();
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = isStaffAdmin(user?.role);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleConfirmation, setSaleConfirmation] = useState<string | null>(null);

  const [cancelPaymentTarget, setCancelPaymentTarget] = useState<string | null>(null);
  const [cancelSaleTarget, setCancelSaleTarget] = useState<string | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const inPeriod = (dateStr: string) => {
    if (periodFilter === 'today') return dateStr === TODAY;
    if (periodFilter === 'week') return dateStr >= THIS_WEEK_START;
    if (periodFilter === 'month') return dateStr.startsWith(THIS_MONTH);
    return true;
  };

  const responsibles = useMemo(() => {
    const set = new Set<string>();
    payments.forEach(p => set.add(p.registeredBy));
    inventorySales.forEach(s => set.add(s.registeredBy));
    return Array.from(set).sort();
  }, [payments, inventorySales]);

  // Vista unificada de solo lectura para la pestaña "Todos" — no se persiste,
  // cada fuente (Payment / InventorySale) sigue siendo dueña de sus datos.
  const allTransactions = useMemo<IncomeTransaction[]>(() => {
    const fromPayments: IncomeTransaction[] = payments
      .filter(p => inPeriod(p.paymentDate))
      .map(p => ({
        id: `pay_${p.id}`, source: 'membership', concept: p.membershipName,
        amount: p.amount, paymentMethod: p.method, status: p.status,
        occurredAt: p.paymentDate, responsibleName: p.registeredBy,
        memberId: p.memberId, memberName: p.memberName, memberNumber: p.memberNumber,
        reference: p.reference,
      }));
    const fromSales: IncomeTransaction[] = inventorySales
      .filter(s => inPeriod(s.soldAt.split('T')[0]))
      .map(s => ({
        id: `sale_${s.id}`, source: 'inventory',
        concept: s.memberName ? `Venta de tienda a ${s.memberName}` : 'Venta de tienda',
        amount: s.total, paymentMethod: s.method, status: s.status,
        occurredAt: s.soldAt, responsibleName: s.registeredBy,
        memberId: s.memberId, memberName: s.memberName,
        itemCount: s.items.length,
      }));
    return [...fromPayments, ...fromSales].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, inventorySales, periodFilter, TODAY, THIS_WEEK_START, THIS_MONTH]);

  const filteredAll = useMemo(() => {
    let list = allTransactions;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.memberName ?? '').toLowerCase().includes(q) ||
        t.concept.toLowerCase().includes(q) ||
        (t.reference ?? '').toLowerCase().includes(q) ||
        (t.responsibleName ?? '').toLowerCase().includes(q)
      );
    }
    if (originFilter) list = list.filter(t => t.source === originFilter);
    if (methodFilter) list = list.filter(t => t.paymentMethod === methodFilter);
    if (statusFilter) list = list.filter(t => t.status === statusFilter);
    if (responsibleFilter) list = list.filter(t => t.responsibleName === responsibleFilter);
    return list;
  }, [allTransactions, search, originFilter, methodFilter, statusFilter, responsibleFilter]);

  const filteredPayments = useMemo(() => {
    let list = payments.filter(p => inPeriod(p.paymentDate));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.memberName.toLowerCase().includes(q) || p.memberNumber.toLowerCase().includes(q));
    }
    if (methodFilter) list = list.filter(p => p.method === methodFilter);
    if (statusFilter) list = list.filter(p => p.status === statusFilter);
    if (responsibleFilter) list = list.filter(p => p.registeredBy === responsibleFilter);
    return list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, search, methodFilter, statusFilter, responsibleFilter, periodFilter]);

  const filteredSales = useMemo(() => {
    let list = inventorySales.filter(s => inPeriod(s.soldAt.split('T')[0]));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.items.some(i => i.productName.toLowerCase().includes(q) || (i.barcode ?? '').toLowerCase().includes(q)) ||
        (s.memberName ?? '').toLowerCase().includes(q)
      );
    }
    if (methodFilter) list = list.filter(s => s.method === methodFilter);
    if (statusFilter) list = list.filter(s => s.status === statusFilter);
    if (responsibleFilter) list = list.filter(s => s.registeredBy === responsibleFilter);
    return list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventorySales, search, methodFilter, statusFilter, responsibleFilter, periodFilter]);

  // KPIs: siempre sobre el periodo activo, solo movimientos confirmados, sin duplicar entre fuentes.
  const confirmedPayments = payments.filter(p => inPeriod(p.paymentDate) && p.status === 'confirmed');
  const confirmedSales = inventorySales.filter(s => inPeriod(s.soldAt.split('T')[0]) && s.status === 'confirmed');
  const membershipTotal = confirmedPayments.reduce((s, p) => s + p.amount, 0);
  const inventoryTotal = confirmedSales.reduce((s, sale) => s + sale.total, 0);
  const totalRevenue = membershipTotal + inventoryTotal;
  const operations = confirmedPayments.length + confirmedSales.length;
  const cashTotal = confirmedPayments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0) + confirmedSales.filter(s => s.method === 'cash').reduce((s, sale) => s + sale.total, 0);
  const cardTotal = confirmedPayments.filter(p => p.method === 'card').reduce((s, p) => s + p.amount, 0) + confirmedSales.filter(s => s.method === 'card').reduce((s, sale) => s + sale.total, 0);
  const transferTotal = confirmedPayments.filter(p => p.method === 'transfer').reduce((s, p) => s + p.amount, 0) + confirmedSales.filter(s => s.method === 'transfer').reduce((s, sale) => s + sale.total, 0);

  const productTotals = new Map<string, number>();
  confirmedSales.forEach(s => s.items.forEach(i => productTotals.set(i.productName, (productTotals.get(i.productName) ?? 0) + i.subtotal)));
  const topProductEntries = Array.from(productTotals.entries()).sort((a, b) => b[1] - a[1]);
  const topProduct = topProductEntries.length > 0 ? { name: topProductEntries[0][0], amount: topProductEntries[0][1] } : null;

  const handleExportCsv = () => {
    const source = tab === 'membership' ? filteredPayments.map(p => ({
      occurredAt: p.paymentDate, origin: 'Membresía', concept: p.membershipName,
      memberName: p.memberName, memberNumber: p.memberNumber, amount: p.amount,
      method: p.method, status: p.status, responsible: p.registeredBy, reference: p.reference,
    })) : tab === 'inventory' ? filteredSales.map(s => ({
      occurredAt: s.soldAt.split('T')[0], origin: 'Tienda',
      concept: s.memberName ? `Venta a ${s.memberName}` : 'Venta de mostrador',
      memberName: s.memberName ?? '', memberNumber: '', amount: s.total,
      method: s.method, status: s.status, responsible: s.registeredBy, reference: '',
    })) : filteredAll.map(t => ({
      occurredAt: t.occurredAt.split('T')[0], origin: t.source === 'membership' ? 'Membresía' : 'Tienda',
      concept: t.concept, memberName: t.memberName ?? '', memberNumber: t.memberNumber ?? '',
      amount: t.amount, method: t.paymentMethod, status: t.status,
      responsible: t.responsibleName ?? '', reference: t.reference ?? '',
    }));
    const rows = source.map(r => [
      formatDate(r.occurredAt), r.origin, r.concept, r.memberName, r.memberNumber,
      r.amount, getPaymentMethodLabel(r.method), STATUS_LABELS[r.status] ?? r.status, r.responsible, r.reference,
    ]);
    downloadCsv(
      `ingresos_${TODAY}.csv`,
      ['Fecha', 'Origen', 'Concepto', 'Miembro', 'No. miembro', 'Monto', 'Método', 'Estado', 'Responsable', 'Referencia'],
      rows,
    );
  };

  const handleCancelPayment = () => {
    if (!cancelPaymentTarget || !cancelReason.trim() || !user) return;
    cancelPayment(cancelPaymentTarget, `${user.firstName} ${user.lastName}`, cancelReason);
    setCancelPaymentTarget(null);
    setCancelReason('');
  };

  const handleCancelSale = () => {
    if (!cancelSaleTarget || !cancelReason.trim() || !user) return;
    cancelInventorySale(cancelSaleTarget, `${user.firstName} ${user.lastName}`, cancelReason);
    setCancelSaleTarget(null);
    setCancelReason('');
  };

  return (
    <AppShell>
      <Header
        title="Ingresos"
        subtitle="Membresías, inscripciones y tienda"
        actions={
          <div className="flex gap-2">
            <button onClick={handleExportCsv} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <button onClick={() => router.push('/members')} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <UserPlus className="w-4 h-4" /> Registrar ingreso de membresía
            </button>
            <button onClick={() => setSaleModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm btn-primary rounded-lg">
              <ShoppingCart className="w-4 h-4" /> Registrar venta de inventario
            </button>
          </div>
        }
      />
      <div className="p-6 space-y-5">
        {saleConfirmation && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center justify-between">
            <span>{saleConfirmation}</span>
            <button onClick={() => setSaleConfirmation(null)} className="text-green-600 hover:text-green-800 text-xs font-medium">Cerrar</button>
          </div>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Ingresos totales" value={formatCurrency(totalRevenue)} icon={TrendingUp} iconColor="text-green-600" />
          <MetricCard title="Membresías e inscripciones" value={formatCurrency(membershipTotal)} icon={Receipt} iconColor="text-blue-600" onClick={() => setTab('membership')} />
          <MetricCard title="Tienda" value={formatCurrency(inventoryTotal)} icon={ShoppingCart} iconColor="text-amber-600" onClick={() => setTab('inventory')} />
          <MetricCard title="Operaciones" value={operations} icon={CreditCard} iconColor="text-purple-600" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Efectivo" value={formatCurrency(cashTotal)} icon={Wallet} iconColor="text-blue-600" />
          <MetricCard title="Tarjeta" value={formatCurrency(cardTotal)} icon={CreditCard} iconColor="text-purple-600" />
          <MetricCard title="Transferencia" value={formatCurrency(transferTotal)} icon={Building2} iconColor="text-teal-600" />
          <MetricCard title="Producto con más ingresos" value={topProduct ? formatCurrency(topProduct.amount) : '—'} subtitle={topProduct?.name} icon={ShoppingCart} iconColor="text-amber-600" />
        </div>

        {/* Period Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {[{ key: 'today', label: 'Hoy' }, { key: 'week', label: 'Esta semana' }, { key: 'month', label: 'Este mes' }, { key: 'all', label: 'Todos' }].map(p => (
            <button key={p.key} onClick={() => setPeriodFilter(p.key)} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${periodFilter === p.key ? 'bg-[#2a2822] text-[var(--primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Source Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {([{ key: 'all', label: 'Todos' }, { key: 'membership', label: 'Membresías e inscripciones' }, { key: 'inventory', label: 'Tienda' }] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === t.key ? 'bg-[#2a2822] text-[var(--primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <FilterBar
          search={search} onSearchChange={setSearch}
          searchPlaceholder="Buscar por miembro, producto, concepto, referencia o responsable..."
          filters={[
            ...(tab === 'all' ? [{ key: 'origin', label: 'Origen', value: originFilter, options: [{ value: 'membership', label: 'Membresía' }, { value: 'inventory', label: 'Inventario' }], onChange: setOriginFilter }] : []),
            { key: 'method', label: 'Método', value: methodFilter, options: [{ value: 'cash', label: 'Efectivo' }, { value: 'card', label: 'Tarjeta' }, { value: 'transfer', label: 'Transferencia' }, { value: 'other', label: 'Otro' }], onChange: setMethodFilter },
            { key: 'status', label: 'Estado', value: statusFilter, options: [{ value: 'confirmed', label: 'Confirmado' }, { value: 'pending', label: 'Pendiente' }, { value: 'cancelled', label: 'Cancelado' }, { value: 'corrected', label: 'Corregido' }], onChange: setStatusFilter },
            { key: 'responsible', label: 'Responsable', value: responsibleFilter, options: responsibles.map(r => ({ value: r, label: r })), onChange: setResponsibleFilter },
          ]}
          onClear={() => { setSearch(''); setMethodFilter(''); setStatusFilter(''); setOriginFilter(''); setResponsibleFilter(''); }}
        />

        {/* Tab: Todos */}
        {tab === 'all' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {filteredAll.length === 0 ? (
              <EmptyState icon={Receipt} title="Sin ingresos" description="No hay movimientos con los filtros actuales." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fecha</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Hora</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Concepto</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Origen</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Persona / Cliente</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cantidad</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Método</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Responsable</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAll.map(t => (
                      <tr key={t.id} className={t.status === 'cancelled' ? 'opacity-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 text-gray-600">{formatDate(t.occurredAt)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{t.occurredAt.includes('T') ? formatTime(t.occurredAt) : '—'}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{t.concept}</p>
                          {t.itemCount !== undefined && <p className="text-xs text-gray-400">{t.itemCount} producto{t.itemCount === 1 ? '' : 's'}</p>}
                        </td>
                        <td className="px-4 py-3"><OriginBadge source={t.source} /></td>
                        <td className="px-4 py-3 text-gray-600">{t.memberName ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(t.amount)}</td>
                        <td className="px-4 py-3 text-gray-600">{getPaymentMethodLabel(t.paymentMethod)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{t.responsibleName}</td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Membresías e inscripciones */}
        {tab === 'membership' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {filteredPayments.length === 0 ? (
              <EmptyState icon={Receipt} title="Sin movimientos" description="No hay ingresos de membresías con los filtros actuales." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fecha</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Miembro</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Membresía</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Periodo cubierto</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cantidad</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Método</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Responsable</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPayments.map(p => (
                      <tr key={p.id} className={p.status === 'cancelled' ? 'opacity-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 text-gray-600">{formatDate(p.paymentDate)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.memberName}</p>
                          <p className="text-xs text-gray-400">{p.memberNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.membershipName}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-gray-600">{getPaymentMethodLabel(p.method)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{p.registeredBy}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-right">
                          {p.status === 'confirmed' && isAdmin && (
                            <button onClick={() => setCancelPaymentTarget(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Cancelar ingreso">
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
        )}

        {/* Tab: Tienda */}
        {tab === 'inventory' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {filteredSales.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="Sin ventas" description="No hay ventas de inventario con los filtros actuales." action={{ label: 'Registrar venta de inventario', onClick: () => setSaleModalOpen(true) }} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fecha</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Concepto</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Método</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cliente</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Responsable</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredSales.map(s => (
                      <>
                        <tr
                          key={s.id}
                          className={`cursor-pointer ${s.status === 'cancelled' ? 'opacity-50' : 'hover:bg-gray-50'}`}
                          onClick={() => setExpandedSale(prev => (prev === s.id ? null : s.id))}
                        >
                          <td className="px-4 py-3 text-gray-600">{formatDate(s.soldAt)} <span className="text-gray-400 text-xs">{formatTime(s.soldAt)}</span></td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">Venta de tienda</p>
                            <p className="text-xs text-gray-400">{s.items.length} producto{s.items.length === 1 ? '' : 's'}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(s.total)}</td>
                          <td className="px-4 py-3 text-gray-600">{getPaymentMethodLabel(s.method)}</td>
                          <td className="px-4 py-3 text-gray-600">{s.memberName ?? 'Mostrador'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{s.registeredBy}</td>
                          <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                          <td className="px-4 py-3 text-right">
                            {s.status === 'confirmed' && isAdmin && (
                              <button onClick={(e) => { e.stopPropagation(); setCancelSaleTarget(s.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Cancelar venta">
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedSale === s.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="px-4 py-3">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-400">
                                    <th className="text-left font-medium py-1">Producto</th>
                                    <th className="text-left font-medium py-1">Código</th>
                                    <th className="text-left font-medium py-1">Cantidad</th>
                                    <th className="text-left font-medium py-1">Precio unitario</th>
                                    <th className="text-left font-medium py-1">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {s.items.map((line, idx) => (
                                    <tr key={idx}>
                                      <td className="py-1.5 text-gray-900 font-medium">{line.productName}</td>
                                      <td className="py-1.5 text-gray-500">{line.barcode ?? '—'}</td>
                                      <td className="py-1.5 text-gray-700">{line.quantity}</td>
                                      <td className="py-1.5 text-gray-700">{formatCurrency(line.unitPrice)}</td>
                                      <td className="py-1.5 font-medium text-gray-900">{formatCurrency(line.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {s.notes && <p className="text-xs text-gray-500 mt-2">Notas: {s.notes}</p>}
                              {s.status === 'cancelled' && s.cancelReason && (
                                <p className="text-xs text-red-600 mt-2">Cancelada por {s.cancelledBy}: {s.cancelReason}</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {saleModalOpen && (
        <InventorySaleModal onClose={() => setSaleModalOpen(false)} onSuccess={(msg) => setSaleConfirmation(msg)} />
      )}

      {/* Cancel Payment Dialog */}
      {cancelPaymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900 mb-3">Cancelar ingreso de membresía</h3>
            <p className="text-sm text-gray-500 mb-4">Indica el motivo de la cancelación. Esta acción quedará registrada en el historial.</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Motivo de cancelación..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setCancelPaymentTarget(null); setCancelReason(''); }} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={handleCancelPayment} disabled={!cancelReason.trim()} className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Confirmar cancelación</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Sale Dialog */}
      {cancelSaleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900 mb-3">Cancelar venta de inventario</h3>
            <p className="text-sm text-gray-500 mb-4">El stock vendido se repondrá automáticamente. Indica el motivo.</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Motivo de cancelación..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setCancelSaleTarget(null); setCancelReason(''); }} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={handleCancelSale} disabled={!cancelReason.trim()} className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Confirmar cancelación</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
