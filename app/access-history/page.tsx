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
import { formatDateTime } from '@/lib/utils';

export default function AccessHistoryPage() {
  const { accessLogs } = useStore();
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('');

  const filtered = useMemo(() => {
    let list = accessLogs.filter(a => a.gymId === 'gym_001');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.memberName?.toLowerCase().includes(q) || a.memberNumber?.toLowerCase().includes(q));
    }
    if (resultFilter) list = list.filter(a => a.result === resultFilter);
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [accessLogs, search, resultFilter]);

  return (
    <AppShell>
      <Header
        title="Historial de accesos"
        subtitle={`${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        }
      />
      <div className="p-6 space-y-4">
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
              {f.label} ({accessLogs.filter(a => !f.key || a.result === f.key).length})
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
