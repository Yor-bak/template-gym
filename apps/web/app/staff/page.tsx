'use client';
import { useState } from 'react';
import { UserPlus, Edit, Power, PowerOff, UserCheck, ShieldCheck, Crown } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Staff, StaffRole } from '@/types';

const roleLabels: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  receptionist: 'Recepcionista',
  platform_admin: 'Admin Plataforma',
};
const roleBadgeClass: Record<StaffRole, string> = {
  super_admin: 'bg-amber-100 text-amber-800',
  admin: 'bg-purple-100 text-purple-700',
  receptionist: 'bg-blue-100 text-blue-700',
  platform_admin: 'bg-gray-900 text-white',
};

type CreatableRole = 'admin' | 'receptionist';
interface StaffFormData { firstName: string; lastName: string; email: string; role: CreatableRole; }
const emptyStaff = (role: CreatableRole): StaffFormData => ({ firstName: '', lastName: '', email: '', role });

// Solo se muestra un ocupante por rol (máximo 3 filas en total): el activo si
// existe, o el inactivo más reciente (para poder reactivarlo). Cuentas
// duplicadas más antiguas del mismo rol quedan fuera de esta vista — el
// límite de una cuenta activa por rol se aplica en el store/API, no aquí.
function pickForRole(list: Staff[], role: CreatableRole): Staff | undefined {
  const active = list.find((s) => s.role === role && s.active);
  if (active) return active;
  return list
    .filter((s) => s.role === role && !s.active)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export default function StaffPage() {
  const { staff, addStaff, updateStaff } = useStore();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffFormData>(emptyStaff('admin'));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = user?.role === 'admin';
  // El Super Admin del gimnasio (titular del contrato) es un concepto
  // distinto del Admin de plataforma (J2EC, multi-gimnasio) — este último no
  // pertenece a Personal y nunca se muestra aquí.
  const gymStaff = staff.filter((s) => s.role !== 'platform_admin');

  const superAdmin = gymStaff.find((s) => s.role === 'super_admin');
  const adminHolder = pickForRole(gymStaff, 'admin');
  const receptionistHolder = pickForRole(gymStaff, 'receptionist');

  const adminTaken = !!adminHolder?.active;
  const receptionistTaken = !!receptionistHolder?.active;
  const limitReached = adminTaken && receptionistTaken;

  const openCreate = (role: CreatableRole) => { setForm(emptyStaff(role)); setEditTarget(null); setError(null); setShowForm(true); };
  const openEdit = (s: Staff) => {
    setForm({ firstName: s.firstName, lastName: s.lastName, email: s.email, role: s.role as CreatableRole });
    setEditTarget(s);
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.firstName || !form.email) return;
    setSaving(true);
    setError(null);
    try {
      if (editTarget) {
        await updateStaff(editTarget.id, { firstName: form.firstName, lastName: form.lastName, email: form.email, role: form.role });
      } else {
        const { tempPassword } = await addStaff({ firstName: form.firstName, lastName: form.lastName, email: form.email, role: form.role });
        window.alert(`Cuenta creada. Contraseña temporal para ${form.email}:\n\n${tempPassword}\n\nCompártela de forma segura — pídele que la cambie al entrar.`);
      }
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: Staff) => {
    try {
      await updateStaff(s.id, { active: !s.active });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo actualizar.');
    }
  };

  return (
    <AppShell>
      <Header
        title="Personal"
        subtitle="Cuentas administrativas del gimnasio"
        actions={canEdit && (
          limitReached ? (
            <span className="text-xs text-gray-400 px-3 py-2">Se alcanzó el límite de cuentas para este gimnasio.</span>
          ) : (
            <button
              onClick={() => openCreate(!adminTaken ? 'admin' : 'receptionist')}
              className="flex items-center gap-2 px-4 py-2 text-sm btn-primary rounded-lg"
            >
              <UserPlus className="w-4 h-4" /> Nuevo personal
            </button>
          )
        )}
      />
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cuenta</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Último acceso</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Creado</th>
                {canEdit && <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Opciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Super Admin — siempre primero, sin acciones de eliminar/desactivar/cambiar rol */}
              {superAdmin ? (
                <tr className="bg-amber-50/40 hover:bg-amber-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MemberAvatar firstName={superAdmin.firstName} lastName={superAdmin.lastName} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900 flex items-center gap-1.5">
                          {superAdmin.firstName} {superAdmin.lastName}
                          <span title="Cuenta principal"><Crown className="w-3.5 h-3.5 text-amber-500" /></span>
                        </p>
                        <p className="text-xs text-gray-400">{superAdmin.phone ?? superAdmin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadgeClass.super_admin}`}>{roleLabels.super_admin}</span>
                      <span className="text-[10px] font-medium text-amber-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Titular del contrato</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Activo</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{superAdmin.lastLogin ? formatDateTime(superAdmin.lastLogin) : 'Nunca'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(superAdmin.createdAt)}</td>
                  {canEdit && <td className="px-4 py-3 text-right text-xs text-gray-300">—</td>}
                </tr>
              ) : (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-4 text-sm text-gray-400 text-center">
                    Sin Super Admin asignado todavía (pendiente del flujo de alta contractual del gimnasio).
                  </td>
                </tr>
              )}

              {/* Admin */}
              {adminHolder ? (
                <StaffRow s={adminHolder} canEdit={canEdit} onEdit={openEdit} onToggle={handleToggleActive} />
              ) : (
                <EmptySlotRow label="No hay una cuenta de administrador asignada." canCreate={canEdit} onCreate={() => openCreate('admin')} colSpan={canEdit ? 6 : 5} />
              )}

              {/* Recepcionista */}
              {receptionistHolder ? (
                <StaffRow s={receptionistHolder} canEdit={canEdit} onEdit={openEdit} onToggle={handleToggleActive} />
              ) : (
                <EmptySlotRow label="No hay una cuenta de recepción asignada." canCreate={canEdit} onCreate={() => openCreate('receptionist')} colSpan={canEdit ? 6 : 5} />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900 mb-4">{editTarget ? 'Editar personal' : 'Nuevo personal'}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input value={form.firstName} onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos</label>
                  <input value={form.lastName} onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                <input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
              {!editTarget && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
                  <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value as CreatableRole }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                    <option value="admin" disabled={adminTaken}>Administrador{adminTaken ? ' (ya existe)' : ''}</option>
                    <option value="receptionist" disabled={receptionistTaken}>Recepcionista{receptionistTaken ? ' (ya existe)' : ''}</option>
                  </select>
                  {form.role === 'admin' && adminTaken && <p className="text-xs text-red-600 mt-1">Este gimnasio ya tiene una cuenta de administrador.</p>}
                  {form.role === 'receptionist' && receptionistTaken && <p className="text-xs text-red-600 mt-1">Este gimnasio ya tiene una cuenta de recepcionista.</p>}
                </div>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.firstName || !form.email || (!editTarget && ((form.role === 'admin' && adminTaken) || (form.role === 'receptionist' && receptionistTaken)))}
                className="flex-1 py-2.5 btn-primary text-sm rounded-lg disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StaffRow({ s, canEdit, onEdit, onToggle }: { s: Staff; canEdit: boolean; onEdit: (s: Staff) => void; onToggle: (s: Staff) => void }) {
  return (
    <tr className="hover:bg-gray-50">
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
        <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadgeClass[s.role]}`}>{roleLabels[s.role]}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {s.active ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">{s.lastLogin ? formatDateTime(s.lastLogin) : 'Nunca'}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(s.createdAt)}</td>
      {canEdit && (
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => onEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
            <button
              onClick={() => onToggle(s)}
              className={`p-1.5 rounded-lg ${s.active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
              title={s.active ? 'Desactivar' : 'Reactivar'}
            >
              {s.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

function EmptySlotRow({ label, canCreate, onCreate, colSpan }: { label: string; canCreate: boolean; onCreate: () => void; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <UserCheck className="w-6 h-6" />
          <p className="text-sm">{label}</p>
          {canCreate && (
            <button onClick={onCreate} className="mt-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
              Crear cuenta
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
