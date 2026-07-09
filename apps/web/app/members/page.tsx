'use client';
import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserPlus, Download, ChevronLeft, ChevronRight, Eye, CreditCard, Lock, Unlock, Archive, Users } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FilterBar } from '@/components/shared/FilterBar';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { MemberForm } from '@/components/members/MemberForm';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatDate, daysUntil } from '@/lib/utils';
import type { Member, MemberStatus } from '@/types';

const PAGE_SIZE = 15;

function MembersContent() {
  const { members, memberships, updateMember } = useStore();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initStatus = searchParams.get('status') ?? '';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initStatus);
  const [membershipFilter, setMembershipFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [paymentMember, setPaymentMember] = useState<Member | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; desc: string; action: () => void }>({ open: false, title: '', desc: '', action: () => {} });

  const filtered = useMemo(() => {
    let list = members;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.memberNumber.toLowerCase().includes(q) ||
        m.phone.includes(q)
      );
    }
    if (statusFilter) list = list.filter(m => m.status === statusFilter);
    if (membershipFilter) list = list.filter(m => m.membershipId === membershipFilter);
    return list;
  }, [members, search, statusFilter, membershipFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const confirm = (title: string, desc: string, action: () => void) => {
    setConfirmDialog({ open: true, title, desc, action });
  };

  const handleBlock = (m: Member) => confirm(
    `Bloquear a ${m.firstName}?`,
    'El miembro no podrá acceder al gimnasio.',
    () => updateMember(m.id, { status: 'blocked', blockedAt: new Date().toISOString(), blockedBy: `${user?.firstName} ${user?.lastName}`, blockReason: 'Bloqueado desde panel' })
  );

  const handleUnblock = (m: Member) => confirm(
    `Desbloquear a ${m.firstName}?`,
    'Se restaurará el acceso según la vigencia de su membresía.',
    () => {
      const days = daysUntil(m.expirationDate);
      const newStatus: MemberStatus = days > 7 ? 'active' : days > 0 ? 'expiring_soon' : 'expired';
      updateMember(m.id, { status: newStatus, blockedAt: undefined, blockedBy: undefined, blockReason: undefined });
    }
  );

  const handleArchive = (m: Member) => confirm(
    `Archivar a ${m.firstName}?`,
    'El miembro quedará archivado y no aparecerá en los listados activos.',
    () => updateMember(m.id, { status: 'archived' })
  );

  return (
    <AppShell>
      <Header
        title="Miembros"
        subtitle={`${filtered.length} miembro${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Exportar
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <UserPlus className="w-4 h-4" /> Nuevo miembro
            </button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <FilterBar
          search={search}
          onSearchChange={v => { setSearch(v); setPage(1); }}
          searchPlaceholder="Buscar por nombre, teléfono o número..."
          filters={[
            {
              key: 'status', label: 'Estado', value: statusFilter,
              options: [
                { value: 'active', label: 'Activo' },
                { value: 'expiring_soon', label: 'Por vencer' },
                { value: 'expired', label: 'Vencido' },
                { value: 'blocked', label: 'Bloqueado' },
                { value: 'temporary_access', label: 'Acceso temporal' },
                { value: 'pending_activation', label: 'Pendiente' },
                { value: 'archived', label: 'Archivado' },
              ],
              onChange: v => { setStatusFilter(v); setPage(1); }
            },
            {
              key: 'membership', label: 'Membresía', value: membershipFilter,
              options: memberships.map(m => ({ value: m.id, label: m.name })),
              onChange: v => { setMembershipFilter(v); setPage(1); }
            },
          ]}
          onClear={() => { setSearch(''); setStatusFilter(''); setMembershipFilter(''); setPage(1); }}
        />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {paginated.length === 0 ? (
            <EmptyState icon={Users} title="Sin miembros" description="No se encontraron miembros con los filtros actuales." action={{ label: 'Agregar miembro', onClick: () => setShowForm(true) }} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Miembro</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Teléfono</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Membresía</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Vencimiento</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Días</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map(m => {
                      const days = daysUntil(m.expirationDate);
                      const ms = memberships.find(ms => ms.id === m.membershipId);
                      return (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <MemberAvatar firstName={m.firstName} lastName={m.lastName} size="sm" />
                              <div>
                                <p className="font-medium text-gray-900">{m.firstName} {m.lastName}</p>
                                <p className="text-xs text-gray-400">{m.memberNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{m.phone}</td>
                          <td className="px-4 py-3 text-gray-600">{ms?.name ?? '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={m.status as Parameters<typeof StatusBadge>[0]['status']} /></td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(m.expirationDate)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${days < 0 ? 'text-red-600' : days <= 5 ? 'text-yellow-600' : 'text-gray-600'}`}>
                              {days < 0 ? `−${Math.abs(days)}` : days === 0 ? 'Hoy' : `${days}d`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => router.push(`/members/${m.id}`)} title="Ver perfil" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => setPaymentMember(m)} title="Registrar pago" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><CreditCard className="w-4 h-4" /></button>
                              {m.status === 'blocked'
                                ? <button onClick={() => handleUnblock(m)} title="Desbloquear" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Unlock className="w-4 h-4" /></button>
                                : <button onClick={() => handleBlock(m)} title="Bloquear" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Lock className="w-4 h-4" /></button>
                              }
                              {user?.role === 'admin' && m.status !== 'archived' && (
                                <button onClick={() => handleArchive(m)} title="Archivar" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Archive className="w-4 h-4" /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showForm && <MemberForm memberships={memberships} onClose={() => setShowForm(false)} onSuccess={m => router.push(`/members/${m.id}`)} />}
      {paymentMember && <PaymentModal member={paymentMember} memberships={memberships} onClose={() => setPaymentMember(null)} />}
      <ConfirmationDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.desc}
        variant="warning"
        onConfirm={() => { confirmDialog.action(); setConfirmDialog(prev => ({ ...prev, open: false })); }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </AppShell>
  );
}

export default function MembersPage() {
  return <Suspense><MembersContent /></Suspense>;
}
