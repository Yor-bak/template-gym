'use client';
import { useState } from 'react';
import { UserPlus, Edit, Power, PowerOff, UserCheck } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { EmptyState } from '@/components/shared/EmptyState';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import type { Staff } from '@/types';

const roleLabels: Record<string, string> = { admin: 'Administrador', receptionist: 'Recepcionista', platform_admin: 'Admin Plataforma' };

interface StaffFormData { firstName: string; lastName: string; email: string; role: 'admin' | 'receptionist'; }
const emptyStaff: StaffFormData = { firstName: '', lastName: '', email: '', role: 'receptionist' };

export default function StaffPage() {
  const { staff, addStaff, updateStaff } = useStore();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffFormData>(emptyStaff);

  const canEdit = user?.role === 'admin';
  const gymStaff = staff.filter(s => s.gymId === 'gym_001' || (s.role !== 'platform_admin' && !s.gymId));

  const openCreate = () => { setForm(emptyStaff); setEditTarget(null); setShowForm(true); };
  const openEdit = (s: Staff) => {
    setForm({ firstName: s.firstName, lastName: s.lastName, email: s.email, role: s.role as 'admin' | 'receptionist' });
    setEditTarget(s);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.firstName || !form.email) return;
    if (editTarget) {
      updateStaff(editTarget.id, { firstName: form.firstName, lastName: form.lastName, email: form.email, role: form.role });
    } else {
      addStaff({
        id: `staff_${Date.now()}`, gymId: 'gym_001',
        firstName: form.firstName, lastName: form.lastName, email: form.email,
        role: form.role, active: true, paymentsRegistered: 0, actionsCount: 0,
        createdAt: new Date().toISOString(),
      });
    }
    setShowForm(false);
  };

  return (
    <AppShell>
      <Header
        title="Personal"
        subtitle="Empleados y roles"
        actions={canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <UserPlus className="w-4 h-4" /> Nuevo empleado
          </button>
        )}
      />
      <div className="p-6">
        {gymStaff.length === 0 ? (
          <EmptyState icon={UserCheck} title="Sin personal registrado" description="Agrega empleados para gestionar el acceso al sistema." action={canEdit ? { label: 'Agregar empleado', onClick: openCreate } : undefined} />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Empleado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Rol</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Último acceso</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Pagos</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Acciones</th>
                  {canEdit && <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Opciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gymStaff.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <MemberAvatar firstName={s.firstName} lastName={s.lastName} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {roleLabels[s.role] ?? s.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.lastLogin ? formatDateTime(s.lastLogin) : 'Nunca'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.paymentsRegistered}</td>
                    <td className="px-4 py-3 text-gray-600">{s.actionsCount}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                          <button
                            onClick={() => updateStaff(s.id, { active: !s.active })}
                            className={`p-1.5 rounded-lg ${s.active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                          >
                            {s.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900 mb-4">{editTarget ? 'Editar empleado' : 'Nuevo empleado'}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input value={form.firstName} onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos</label>
                  <input value={form.lastName} onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                <input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
                <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'receptionist' }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="receptionist">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </select>
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
