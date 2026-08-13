'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Lock, Unlock, Archive, Clock, Smartphone, Copy, Check } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime, formatCurrency, daysUntil, getPaymentMethodLabel } from '@/lib/utils';
import type { MemberStatus } from '@/types';

type Tab = 'summary' | 'payments' | 'accesses' | 'history' | 'notes';

// Mismo patrón de ocultamiento de UI que admin-panel-j2ec: platform_admin no
// opera el día a día de un gym (tampoco puede registrar pagos en el
// backend real, ver require_role en apps/api/app/modules/member_payments/router.py).
const CAN_REGISTER_PAYMENTS: Array<string | undefined> = ['admin', 'receptionist'];

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { members, payments, accessLogs, memberships, updateMember, loadMemberPayments } = useStore();
  const { user } = useAuth();
  const canRegisterPayments = CAN_REGISTER_PAYMENTS.includes(user?.role);

  useEffect(() => {
    if (id) loadMemberPayments(id).catch(() => {});
  }, [id, loadMemberPayments]);

  const member = members.find(m => m.id === id);
  const membership = memberships.find(ms => ms.id === member?.membershipId);
  const memberPayments = payments.filter(p => p.memberId === id).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  const memberAccesses = accessLogs.filter(a => a.memberId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const [tab, setTab] = useState<Tab>('summary');
  const [showPayment, setShowPayment] = useState(false);
  const [showTempAccess, setShowTempAccess] = useState(false);
  const [tempDuration, setTempDuration] = useState('4');
  const [tempReason, setTempReason] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; desc: string; variant: 'warning' | 'danger' | 'default'; action: () => void }>({ open: false, title: '', desc: '', variant: 'warning', action: () => {} });

  if (!member) return (
    <AppShell>
      <div className="p-8 text-center text-gray-400">Miembro no encontrado</div>
    </AppShell>
  );

  const days = daysUntil(member.expirationDate);

  const handleBlock = () => {
    setConfirmDialog({
      open: true, title: 'Bloquear miembro', desc: `¿Bloquear el acceso de ${member.firstName} ${member.lastName}?`, variant: 'danger',
      action: () => updateMember(id, { status: 'blocked', blockedAt: new Date().toISOString(), blockedBy: `${user?.firstName} ${user?.lastName}`, blockReason: 'Bloqueado desde perfil' })
    });
  };

  const handleUnblock = () => {
    const newStatus: MemberStatus = days > 7 ? 'active' : days > 0 ? 'expiring_soon' : 'expired';
    updateMember(id, { status: newStatus, blockedAt: undefined, blockedBy: undefined, blockReason: undefined });
  };

  const handleTempAccess = () => {
    const until = new Date();
    until.setHours(until.getHours() + Number(tempDuration));
    updateMember(id, {
      status: 'temporary_access',
      temporaryAccessUntil: until.toISOString(),
      temporaryAccessBy: `${user?.firstName} ${user?.lastName}`,
      temporaryAccessReason: tempReason || 'Acceso temporal autorizado',
    });
    setShowTempAccess(false);
  };

  const handleCopyCode = () => {
    const code = `ACT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    navigator.clipboard?.writeText(code).catch(() => {});
    updateMember(id, { activationCode: code, mobileAppStatus: 'pending' });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Resumen' },
    { key: 'payments', label: `Pagos (${memberPayments.length})` },
    { key: 'accesses', label: `Accesos (${memberAccesses.length})` },
    { key: 'history', label: 'Historial' },
    { key: 'notes', label: 'Notas' },
  ];

  const mobileStatusLabels: Record<string, string> = {
    not_activated: 'No activada', pending: 'Activación pendiente', activated: 'Activada',
    device_linked: 'Dispositivo vinculado', suspended: 'Suspendida',
  };

  return (
    <AppShell>
      <Header
        title={`${member.firstName} ${member.lastName}`}
        subtitle={member.memberNumber}
        actions={
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        }
      />
      <div className="p-6 space-y-5">
        {/* Profile Header Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex flex-wrap gap-5 items-start">
            <MemberAvatar firstName={member.firstName} lastName={member.lastName} size="xl" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-gray-900">{member.firstName} {member.lastName}</h2>
                <StatusBadge status={member.status as Parameters<typeof StatusBadge>[0]['status']} />
              </div>
              <p className="text-sm text-gray-500">{member.memberNumber} · {membership?.name ?? '—'}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                {member.phone && <span className="text-gray-600">📞 {member.phone}</span>}
                {member.email && <span className="text-gray-600">✉️ {member.email}</span>}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                {member.expirationDate ? (
                  <span className={`font-medium ${days < 0 ? 'text-red-600' : days <= 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                    Vence: {formatDate(member.expirationDate)} ({days < 0 ? `hace ${Math.abs(days)} días` : days === 0 ? 'hoy' : `en ${days} días`})
                  </span>
                ) : (
                  <span className="font-medium text-gray-400">Sin fecha de vencimiento (sin pago registrado)</span>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {canRegisterPayments && (
                <button onClick={() => setShowPayment(true)} className="flex items-center gap-2 px-3 py-2 text-sm btn-primary rounded-lg">
                  <CreditCard className="w-4 h-4" /> Registrar pago
                </button>
              )}
              {member.status !== 'blocked' ? (
                <button onClick={handleBlock} className="flex items-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                  <Lock className="w-4 h-4" /> Bloquear
                </button>
              ) : (
                <button onClick={handleUnblock} className="flex items-center gap-2 px-3 py-2 text-sm border border-green-200 text-green-600 rounded-lg hover:bg-green-50">
                  <Unlock className="w-4 h-4" /> Desbloquear
                </button>
              )}
              {(member.status === 'expired') && (
                <button onClick={() => setShowTempAccess(true)} className="flex items-center gap-2 px-3 py-2 text-sm border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-50">
                  <Clock className="w-4 h-4" /> Acceso temporal
                </button>
              )}
            </div>
          </div>

          {/* Block info */}
          {member.status === 'blocked' && (
            <div className="mt-4 bg-red-50 rounded-lg p-3 text-sm">
              <p className="text-red-700 font-medium">Motivo de bloqueo: {member.blockReason}</p>
              <p className="text-red-500 text-xs mt-1">Bloqueado por {member.blockedBy} el {member.blockedAt ? formatDate(member.blockedAt) : '—'}</p>
            </div>
          )}
          {member.status === 'temporary_access' && (
            <div className="mt-4 bg-blue-50 rounded-lg p-3 text-sm">
              <p className="text-blue-700 font-medium">Acceso temporal activo</p>
              <p className="text-blue-500 text-xs mt-1">Autorizado por {member.temporaryAccessBy} · Hasta {member.temporaryAccessUntil ? formatDateTime(member.temporaryAccessUntil) : '—'}</p>
              <p className="text-blue-600 text-xs">{member.temporaryAccessReason}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-100 flex overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`px-5 py-3 text-sm whitespace-nowrap transition-colors ${tab === t.key ? 'text-blue-600 border-b-2 border-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'summary' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Estado', value: <StatusBadge status={member.status as Parameters<typeof StatusBadge>[0]['status']} /> },
                  { label: 'Fecha de registro', value: formatDate(member.createdAt) },
                  { label: 'Último pago', value: member.lastPaymentDate ? formatDate(member.lastPaymentDate) : 'Sin pagos' },
                  { label: 'Vencimiento', value: formatDate(member.expirationDate) },
                  { label: 'Último acceso', value: member.lastAccessDate ? formatDateTime(member.lastAccessDate) : 'Sin accesos' },
                  { label: 'Accesos este mes', value: memberAccesses.filter(a => a.timestamp.startsWith(new Date().toISOString().slice(0, 7))).length },
                  { label: 'Total de pagos', value: memberPayments.length },
                  { label: 'Tipo de membresía', value: membership?.name ?? '—' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <div className="font-medium text-gray-900 mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'payments' && (
              <div className="space-y-2">
                {memberPayments.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin pagos registrados</p> : memberPayments.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{formatCurrency(p.amount)}</span>
                        <StatusBadge status={p.status as Parameters<typeof StatusBadge>[0]['status']} />
                        <span className="text-xs text-gray-400">{getPaymentMethodLabel(p.method)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{p.membershipName} · {formatDate(p.periodStart)} — {formatDate(p.periodEnd)}</p>
                      <p className="text-xs text-gray-300">Registrado por {p.registeredBy} el {formatDate(p.paymentDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'accesses' && (
              <div className="space-y-2">
                {memberAccesses.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin accesos registrados</p> : memberAccesses.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${['authorized', 'expiring_soon', 'temporary_access'].includes(a.result) ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={a.result as Parameters<typeof StatusBadge>[0]['status']} />
                        <span className="text-xs text-gray-400">{a.reader}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(a.timestamp)}</p>
                      {a.manualReason && <p className="text-xs text-gray-400">{a.manualReason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'history' && (
              <div className="relative pl-4 space-y-4">
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gray-200" />
                {[
                  { date: member.createdAt, label: 'Alta de miembro', detail: `Registrado por — membresía ${membership?.name}` },
                  ...memberPayments.map(p => ({ date: p.paymentDate + 'T12:00:00Z', label: `Pago registrado — ${formatCurrency(p.amount)}`, detail: `${p.membershipName} · ${getPaymentMethodLabel(p.method)} · ${p.registeredBy}` })),
                  ...(member.blockedAt ? [{ date: member.blockedAt, label: 'Usuario bloqueado', detail: `Por ${member.blockedBy}: ${member.blockReason}` }] : []),
                  ...(member.temporaryAccessUntil ? [{ date: new Date().toISOString(), label: 'Acceso temporal otorgado', detail: `Por ${member.temporaryAccessBy}: ${member.temporaryAccessReason}` }] : []),
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((ev, i) => (
                  <div key={i} className="flex gap-3 relative">
                    <div className="w-3 h-3 rounded-full bg-[var(--primary)] border-2 border-white shadow shrink-0 mt-0.5 -ml-5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ev.label}</p>
                      <p className="text-xs text-gray-400">{ev.detail}</p>
                      <p className="text-xs text-gray-300 mt-0.5">{formatDateTime(ev.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 min-h-24">
                  <p className="text-sm text-gray-700">{member.notes || 'Sin notas'}</p>
                </div>
                {member.emergencyContact && (
                  <div className="bg-orange-50 rounded-lg p-4 text-sm">
                    <p className="font-medium text-orange-800 mb-1">Contacto de emergencia</p>
                    <p className="text-orange-700">{member.emergencyContact} — {member.emergencyPhone}</p>
                  </div>
                )}
                {/* Mobile App Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">Aplicación móvil</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${member.mobileAppStatus === 'device_linked' ? 'bg-green-100 text-green-700' : member.mobileAppStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                      {mobileStatusLabels[member.mobileAppStatus] ?? member.mobileAppStatus}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleCopyCode} className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copiado' : 'Generar código'}
                    </button>
                    {member.mobileAppStatus === 'device_linked' && (
                      <button onClick={() => updateMember(id, { mobileAppStatus: 'suspended' })} className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                        Suspender acceso
                      </button>
                    )}
                    {member.mobileAppStatus === 'suspended' && (
                      <button onClick={() => updateMember(id, { mobileAppStatus: 'device_linked' })} className="px-3 py-1.5 text-xs border border-green-200 text-green-600 rounded-lg hover:bg-green-50">
                        Restaurar acceso
                      </button>
                    )}
                  </div>
                  {member.activationCode && (
                    <p className="text-xs text-gray-400 mt-2">Código: <span className="font-mono text-gray-700">{member.activationCode}</span></p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPayment && <PaymentModal member={member} memberships={memberships} onClose={() => setShowPayment(false)} />}

      {showTempAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-gray-900">Acceso temporal</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duración (horas)</label>
                <select value={tempDuration} onChange={e => setTempDuration(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="1">1 hora</option>
                  <option value="2">2 horas</option>
                  <option value="4">4 horas</option>
                  <option value="8">8 horas</option>
                  <option value="24">24 horas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
                <input value={tempReason} onChange={e => setTempReason(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej. Va a pagar hoy en la tarde" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowTempAccess(false)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={handleTempAccess} className="flex-1 py-2 text-sm bg-yellow-600 text-[#141311] font-semibold rounded-lg hover:brightness-95">Autorizar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.desc}
        variant={confirmDialog.variant}
        onConfirm={() => { confirmDialog.action(); setConfirmDialog(prev => ({ ...prev, open: false })); }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </AppShell>
  );
}
