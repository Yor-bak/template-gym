'use client';
import { useState, useMemo } from 'react';
import { Download, History } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { FilterBar } from '@/components/shared/FilterBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { EmptyState } from '@/components/shared/EmptyState';
import { useStore } from '@/lib/store';
import { formatDateTime, getAccessResultLabel } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';

type Period = 'today' | 'week' | 'month' | 'all';

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function AccessHistoryPage() {
  const { accessLogs } = useStore();
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  // Sin esto, la vista por defecto renderizaba el año completo de logs
  // generados (12,000+ filas sin paginar), bloqueando el hilo principal ~6s
  // en cada visita. "Hoy" es el caso de uso más común (¿quién entró hoy?) y
  // deja la vista instantánea; "Todos" sigue disponible para auditorías.
  const [periodFilter, setPeriodFilter] = useState<Period>('today');

  const now = new Date();
  const TODAY = toISODate(now);
  const THIS_MONTH = TODAY.slice(0, 7);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const THIS_WEEK_START = toISODate(weekStart);

  const inPeriod = (timestamp: string) => {
    const dateStr = timestamp.split('T')[0];
    if (periodFilter === 'today') return dateStr === TODAY;
    if (periodFilter === 'week') return dateStr >= THIS_WEEK_START;
    if (periodFilter === 'month') return dateStr.startsWith(THIS_MONTH);
    return true;
  };

  const inPeriodLogs = useMemo(
    () => accessLogs.filter(a => inPeriod(a.timestamp)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accessLogs, periodFilter, TODAY, THIS_WEEK_START, THIS_MONTH]
  );

  // Un solo recorrido para los conteos de las píldoras, en vez de un
  // .filter() completo por píldora (8x) en cada render.
  const resultCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of inPeriodLogs) counts[a.result] = (counts[a.result] ?? 0) + 1;
    return counts;
  }, [inPeriodLogs]);

  const filtered = useMemo(() => {
    let list = inPeriodLogs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.memberName?.toLowerCase().includes(q) || a.memberNumber?.toLowerCase().includes(q));
    }
    if (resultFilter) list = list.filter(a => a.result === resultFilter);
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [inPeriodLogs, search, resultFilter]);

  const handleExportCsv = () => {
    const rows = filtered.map(a => [
      formatDateTime(a.timestamp), a.memberName ?? '', a.memberNumber ?? '',
      getAccessResultLabel(a.result), a.membershipName ?? '', a.reader ?? '',
      a.blockReason ?? a.manualReason ?? '',
    ]);
    downloadCsv(
      `historial_accesos_${new Date().toISOString().split('T')[0]}.csv`,
      ['Fecha y hora', 'Miembro', 'No. miembro', 'Resultado', 'Membresía', 'Lector', 'Motivo'],
      rows,
    );
  };

  return (
    <AppShell>
      <Header
        title="Historial de accesos"
        subtitle={`${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <button onClick={handleExportCsv} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        }
      />
      <div className="p-6 space-y-4">
        {/* Period Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {([{ key: 'today', label: 'Hoy' }, { key: 'week', label: 'Esta semana' }, { key: 'month', label: 'Este mes' }, { key: 'all', label: 'Todos' }] as { key: Period; label: string }[]).map(p => (
            <button key={p.key} onClick={() => setPeriodFilter(p.key)} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${periodFilter === p.key ? 'bg-[#2a2822] text-[var(--primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: '', label: 'Todos', color: 'bg-gray-100 text-gray-600' },
            { key: 'authorized', label: 'Autorizados', color: 'bg-green-100 text-green-700' },
            { key: 'expiring_soon', label: 'Por vencer', color: 'bg-yellow-100 text-yellow-700' },
            { key: 'expired', label: 'Vencidos', color: 'bg-red-100 text-red-700' },
            { key: 'blocked', label: 'Bloqueados', color: 'bg-gray-900 text-white' },
            { key: 'invalid_qr', label: 'QR inválido', color: 'bg-red-100 text-red-600' },
            { key: 'temporary_access', label: 'Temporal', color: 'bg-blue-100 text-blue-700' },
            { key: 'manual', label: 'Manual', color: 'bg-purple-100 text-purple-700' },
          ].map(f => (
            <button key={f.key} onClick={() => setResultFilter(f.key)} className={`px-3 py-1.5 text-xs rounded-full transition-all ${resultFilter === f.key ? f.color + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {f.label} ({f.key ? resultCounts[f.key] ?? 0 : inPeriodLogs.length})
            </button>
          ))}
        </div>

        <FilterBar
          search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por nombre o número..."
          onClear={() => { setSearch(''); setResultFilter(''); }}
        />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={History} title="Sin registros" description="No se encontraron accesos con los filtros actuales." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fecha y hora</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Miembro</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Resultado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Membresía</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Lector</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(a.timestamp)}</td>
                      <td className="px-4 py-3">
                        {a.memberName ? (
                          <div className="flex items-center gap-2">
                            <MemberAvatar firstName={a.memberName.split(' ')[0]} lastName={a.memberName.split(' ')[1] ?? 'M'} size="sm" />
                            <div>
                              <p className="font-medium text-gray-900">{a.memberName}</p>
                              <p className="text-xs text-gray-400">{a.memberNumber}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">{a.rawQrCode ?? 'Desconocido'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={a.result as any} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.membershipName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.reader}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-48 truncate">
                        {a.blockReason ?? a.manualReason ?? (a.daysSinceExpiration ? `Vencido hace ${a.daysSinceExpiration}d` : a.daysUntilExpiration != null ? `Vence en ${a.daysUntilExpiration}d` : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
