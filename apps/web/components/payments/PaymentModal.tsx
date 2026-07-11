'use client';
import { useState, useEffect } from 'react';
import { X, CreditCard } from 'lucide-react';
import type { Member, Membership } from '@/types';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate, addDays, addMonths } from '@/lib/utils';

interface PaymentModalProps {
  member: Member | null;
  memberships: Membership[];
  onClose: () => void;
  onSuccess?: () => void;
}

function calcNewExpiration(member: Member, membership: Membership, startFromToday: boolean): string {
  const base = startFromToday || member.status === 'expired' ? new Date() : new Date(member.expirationDate);
  if (membership.durationUnit === 'days') return addDays(base, membership.duration).toISOString().split('T')[0];
  if (membership.durationUnit === 'months') return addMonths(base, membership.duration).toISOString().split('T')[0];
  if (membership.durationUnit === 'years') { const d = new Date(base); d.setFullYear(d.getFullYear() + membership.duration); return d.toISOString().split('T')[0]; }
  return base.toISOString().split('T')[0];
}

export function PaymentModal({ member, memberships, onClose, onSuccess }: PaymentModalProps) {
  const { updateMember, addPayment } = useStore();
  const { user } = useAuth();
  const [membershipId, setMembershipId] = useState(member?.membershipId ?? memberships[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer' | 'other'>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [startFromToday, setStartFromToday] = useState(member?.status === 'expired');
  const [loading, setLoading] = useState(false);

  const selectedMembership = memberships.find(m => m.id === membershipId);

  useEffect(() => {
    if (selectedMembership) setAmount(String(selectedMembership.price));
  }, [membershipId, selectedMembership]);

  if (!member) return null;

  const newExpiration = selectedMembership ? calcNewExpiration(member, selectedMembership, startFromToday) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMembership) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const today = new Date().toISOString().split('T')[0];
    const periodStart = startFromToday || member.status === 'expired' ? today : member.expirationDate;
    addPayment({
      id: `pay_${Date.now()}`,
      gymId: 'gym_001',
      memberId: member.id,
      memberNumber: member.memberNumber,
      memberName: `${member.firstName} ${member.lastName}`,
      membershipId,
      membershipName: selectedMembership.name,
      amount: Number(amount),
      method,
      status: 'confirmed',
      paymentDate: today,
      periodStart,
      periodEnd: newExpiration,
      reference: reference || undefined,
      notes: notes || undefined,
      registeredBy: `${user?.firstName} ${user?.lastName}`,
    });
    updateMember(member.id, {
      membershipId,
      expirationDate: newExpiration,
      lastPaymentDate: today,
      status: 'active',
    });
    setLoading(false);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Registrar pago</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Miembro</p>
            <p className="font-medium text-gray-900">{member.firstName} {member.lastName}</p>
            <p className="text-sm text-gray-500">{member.memberNumber}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Membresía</label>
              <select value={membershipId} onChange={e => setMembershipId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                {memberships.filter(m => m.active).map(m => (
                  <option key={m.id} value={m.id}>{m.name} — {formatCurrency(m.price)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad recibida</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" required min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select value={method} onChange={e => setMethod(e.target.value as 'cash' | 'card' | 'transfer' | 'other')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          {member.status === 'expired' && (
            <div className="flex items-center gap-3 bg-yellow-50 p-3 rounded-lg">
              <input type="checkbox" id="startToday" checked={startFromToday} onChange={e => setStartFromToday(e.target.checked)} className="rounded" />
              <label htmlFor="startToday" className="text-sm text-yellow-800">Iniciar vigencia desde hoy</label>
            </div>
          )}

          {newExpiration && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <p className="text-blue-600 text-xs font-medium">Nueva fecha de vencimiento</p>
              <p className="text-blue-900 font-semibold">{formatDate(newExpiration)}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia (opcional)</label>
            <input value={reference} onChange={e => setReference(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="Núm. de transferencia, folio, etc." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 btn-primary text-sm rounded-lg disabled:opacity-60">
              {loading ? 'Registrando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
