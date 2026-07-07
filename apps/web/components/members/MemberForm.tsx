'use client';
import { useState } from 'react';
import { X, User } from 'lucide-react';
import type { Member, Membership } from '@/types';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatCurrency, addMonths, addDays } from '@/lib/utils';

interface MemberFormProps {
  memberships: Membership[];
  onClose: () => void;
  onSuccess?: (member: Member) => void;
}

function getNextMemberNumber(members: Member[]): string {
  const nums = members.map(m => parseInt(m.memberNumber.split('-')[1] ?? '0')).filter(n => !isNaN(n));
  const max = Math.max(0, ...nums);
  return `AF-${String(max + 1).padStart(5, '0')}`;
}

function calcExpiration(membershipId: string, memberships: Membership[], startDate: string): string {
  const ms = memberships.find(m => m.id === membershipId);
  if (!ms) return startDate;
  const base = new Date(startDate);
  if (ms.durationUnit === 'days') return addDays(base, ms.duration).toISOString().split('T')[0];
  if (ms.durationUnit === 'months') return addMonths(base, ms.duration).toISOString().split('T')[0];
  if (ms.durationUnit === 'years') { const d = new Date(base); d.setFullYear(d.getFullYear() + ms.duration); return d.toISOString().split('T')[0]; }
  return startDate;
}

export function MemberForm({ memberships, onClose, onSuccess }: MemberFormProps) {
  const { members, addMember, addPayment } = useStore();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', birthDate: '',
    membershipId: memberships[0]?.id ?? '', startDate: today,
    paymentMethod: 'cash' as 'cash' | 'card' | 'transfer' | 'other', paymentAmount: memberships[0]?.price ?? 0,
    emergencyContact: '', emergencyPhone: '', notes: '',
  });
  const [registerPayment, setRegisterPayment] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedMs = memberships.find(m => m.id === form.membershipId);
  const expirationDate = calcExpiration(form.membershipId, memberships, form.startDate);

  const set = (key: string, val: string | number) => {
    if (key === 'membershipId') {
      const ms = memberships.find(m => m.id === val);
      if (ms) {
        setForm(prev => ({ ...prev, membershipId: val as string, paymentAmount: ms.price }));
      }
    } else {
      setForm(prev => ({ ...prev, [key]: val }));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Requerido';
    if (!form.lastName.trim()) e.lastName = 'Requerido';
    if (!form.phone.trim()) e.phone = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const memberNumber = getNextMemberNumber(members);
    const newMember: Member = {
      id: `mem_${Date.now()}`,
      gymId: 'gym_001',
      memberNumber,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      birthDate: form.birthDate || undefined,
      membershipId: form.membershipId,
      status: registerPayment ? 'active' : 'pending_activation',
      startDate: form.startDate,
      expirationDate,
      lastPaymentDate: registerPayment ? today : undefined,
      mobileAppStatus: 'not_activated',
      emergencyContact: form.emergencyContact || undefined,
      emergencyPhone: form.emergencyPhone || undefined,
      notes: form.notes || undefined,
      createdAt: new Date().toISOString(),
      createdBy: user?.id ?? 'staff_001',
    };
    addMember(newMember);
    if (registerPayment) {
      addPayment({
        id: `pay_${Date.now()}`,
        gymId: 'gym_001',
        memberId: newMember.id,
        memberNumber,
        memberName: `${newMember.firstName} ${newMember.lastName}`,
        membershipId: form.membershipId,
        membershipName: selectedMs?.name ?? '',
        amount: form.paymentAmount,
        method: form.paymentMethod,
        status: 'confirmed',
        paymentDate: today,
        periodStart: form.startDate,
        periodEnd: expirationDate,
        registeredBy: `${user?.firstName} ${user?.lastName}`,
      });
    }
    setLoading(false);
    onSuccess?.(newMember);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Registrar nuevo miembro</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos personales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos *</label>
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono *</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de nacimiento</label>
                <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Membresía</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de membresía *</label>
                <select value={form.membershipId} onChange={e => set('membershipId', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {memberships.filter(m => m.active).map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {formatCurrency(m.price)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de inicio</label>
                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de vencimiento</label>
                <input readOnly value={expirationDate} className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500" />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <input type="checkbox" id="regPay" checked={registerPayment} onChange={e => setRegisterPayment(e.target.checked)} className="rounded" />
              <label htmlFor="regPay" className="text-sm font-semibold text-gray-700">Registrar pago inicial</label>
            </div>
            {registerPayment && (
              <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-blue-200">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                  <input type="number" value={form.paymentAmount} onChange={e => set('paymentAmount', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" min="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Método</label>
                  <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Guardando...' : registerPayment ? 'Guardar y registrar pago' : 'Guardar miembro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
