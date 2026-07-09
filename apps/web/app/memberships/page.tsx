'use client';
import { useState } from 'react';
import { Plus, Edit, Copy, PowerOff, Power, Dumbbell, Users } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/shared/EmptyState';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import type { Membership } from '@/types';

const durationLabels: Record<string, string> = {
  days: 'días', weeks: 'semanas', months: 'meses', years: 'años',
};

interface MembershipFormData {
  name: string; price: string; duration: string; durationUnit: 'days' | 'weeks' | 'months' | 'years';
  toleranceDays: string; description: string;
}

const emptyForm: MembershipFormData = { name: '', price: '', duration: '1', durationUnit: 'months', toleranceDays: '3', description: '' };

export default function MembershipsPage() {
  const { memberships, updateMembership, addMembership } = useStore();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Membership | null>(null);
  const [form, setForm] = useState<MembershipFormData>(emptyForm);

  const canEdit = user?.role === 'admin';

  const openCreate = () => { setForm(emptyForm); setEditTarget(null); setShowForm(true); };
  const openEdit = (ms: Membership) => {
    setForm({ name: ms.name, price: String(ms.price), duration: String(ms.duration), durationUnit: ms.durationUnit, toleranceDays: String(ms.toleranceDays), description: ms.description ?? '' });
    setEditTarget(ms);
    setShowForm(true);
  };
  const openDuplicate = (ms: Membership) => {
    setForm({ name: `${ms.name} (copia)`, price: String(ms.price), duration: String(ms.duration), durationUnit: ms.durationUnit, toleranceDays: String(ms.toleranceDays), description: ms.description ?? '' });
    setEditTarget(null);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    if (editTarget) {
      updateMembership(editTarget.id, {
        name: form.name, price: Number(form.price), duration: Number(form.duration),
        durationUnit: form.durationUnit, toleranceDays: Number(form.toleranceDays), description: form.description,
      });
    } else {
      addMembership({
        id: `ms_${Date.now()}`, gymId: 'gym_001', name: form.name, price: Number(form.price),
        duration: Number(form.duration), durationUnit: form.durationUnit, toleranceDays: Number(form.toleranceDays),
        description: form.description, active: true, memberCount: 0, createdAt: new Date().toISOString(),
      });
    }
    setShowForm(false);
  };

  const gymMemberships = memberships;

  return (
    <AppShell>
      <Header
        title="Membresías"
        subtitle="Tipos de membresía disponibles"
        actions={canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nueva membresía
          </button>
        )}
      />
      <div className="p-6">
        {gymMemberships.length === 0 ? (
          <EmptyState icon={Dumbbell} title="Sin membresías" description="Crea tu primera membresía." action={canEdit ? { label: 'Crear membresía', onClick: openCreate } : undefined} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gymMemberships.map(ms => (
              <div key={ms.id} className={`bg-white rounded-lg border-2 p-5 ${ms.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{ms.name}</h3>
                    {!ms.active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactiva</span>}
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(ms.price)}</p>
                </div>
                <p className="text-sm text-gray-500 mb-1">Duración: {ms.duration} {durationLabels[ms.durationUnit]}</p>
                <p className="text-sm text-gray-500 mb-1">Tolerancia: {ms.toleranceDays} días</p>
                {ms.description && <p className="text-xs text-gray-400 mb-3">{ms.description}</p>}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">{ms.memberCount} miembros</span>
                  <div className="flex-1" />
                  {canEdit && (
                    <>
                      <button onClick={() => openEdit(ms)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => openDuplicate(ms)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Copy className="w-4 h-4" /></button>
                      <button
                        onClick={() => updateMembership(ms.id, { active: !ms.active })}
                        title={ms.active ? 'Desactivar' : 'Activar'}
                        className={`p-1.5 rounded-lg ${ms.active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                      >
                        {ms.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Membership Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-gray-900 mb-4">{editTarget ? 'Editar membresía' : 'Nueva membresía'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Precio (MXN)</label>
                  <input type="number" value={form.price} onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tolerancia (días)</label>
                  <input type="number" value={form.toleranceDays} onChange={e => setForm(prev => ({ ...prev, toleranceDays: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duración</label>
                  <input type="number" value={form.duration} onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" min="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
                  <select value={form.durationUnit} onChange={e => setForm(prev => ({ ...prev, durationUnit: e.target.value as any }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="days">Días</option>
                    <option value="weeks">Semanas</option>
                    <option value="months">Meses</option>
                    <option value="years">Años</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
