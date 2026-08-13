'use client';
import { useState } from 'react';
import { UserPlus, Users2, X, Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { useStore } from '@/lib/store';
import { isStaffAdmin, useAuth } from '@/lib/auth';
import { isValidMexicanPhone } from '@/lib/utils';
import type { Trainer } from '@/types';

interface TrainerFormData {
  firstName: string;
  lastName: string;
  phone: string;
}
const emptyTrainerForm: TrainerFormData = { firstName: '', lastName: '', phone: '' };

export default function TrainersPage() {
  const {
    members,
    trainers,
    trainerAssignments,
    addStaff,
    assignTrainer,
    unassignTrainer,
  } = useStore();
  const { user } = useAuth();
  const isAdmin = isStaffAdmin(user?.role);

  // --- Nuevo entrenador ---
  const [showTrainerForm, setShowTrainerForm] = useState(false);
  const [trainerForm, setTrainerForm] = useState<TrainerFormData>(emptyTrainerForm);
  const [creatingTrainer, setCreatingTrainer] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const phoneValid = isValidMexicanPhone(trainerForm.phone);
  const phoneError = !phoneTouched
    ? null
    : !trainerForm.phone.trim()
      ? 'El teléfono es obligatorio.'
      : !phoneValid
        ? 'Ingresa un teléfono válido (10 dígitos, con o sin lada 52).'
        : null;

  const handleCreateTrainer = async () => {
    setPhoneTouched(true);
    if (!trainerForm.firstName || !phoneValid) return;
    setCreatingTrainer(true);
    try {
      const { tempPassword } = await addStaff({
        firstName: trainerForm.firstName,
        lastName: trainerForm.lastName,
        phone: trainerForm.phone,
        role: 'trainer',
      });
      window.alert(`Cuenta de entrenador creada. Contraseña temporal:\n\n${tempPassword}\n\nCompártela de forma segura.`);
      setShowTrainerForm(false);
      setTrainerForm(emptyTrainerForm);
      setPhoneTouched(false);
    } finally {
      setCreatingTrainer(false);
    }
  };

  // --- Asignar cliente a entrenador ---
  const [assignTarget, setAssignTarget] = useState<Trainer | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');

  const clientsOf = (trainerId: string) =>
    trainerAssignments.filter(a => a.trainerId === trainerId).map(a => members.find(m => m.id === a.clientId)).filter((m): m is NonNullable<typeof m> => !!m);

  const trainerOf = (clientId: string) => trainerAssignments.find(a => a.clientId === clientId);

  const openAssign = (trainer: Trainer) => { setAssignTarget(trainer); setSelectedClientId(''); };
  const confirmAssign = () => {
    if (!assignTarget || !selectedClientId) return;
    assignTrainer(selectedClientId, assignTarget.id);
    setAssignTarget(null);
  };

  const [unassignTarget, setUnassignTarget] = useState<{ trainerId: string; clientId: string; clientName: string } | null>(null);

  return (
    <AppShell>
      <Header title="Entrenadores" subtitle="Asignación de clientes y rutinas específicas" />
      <div className="p-6 space-y-8">
        {/* Roster de entrenadores */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users2 className="w-4 h-4 text-blue-600" /> Entrenadores
            </h2>
            {isAdmin && (
              <button onClick={() => setShowTrainerForm(true)} className="flex items-center gap-2 px-3 py-2 text-sm btn-primary rounded-lg">
                <UserPlus className="w-4 h-4" /> Nuevo entrenador
              </button>
            )}
          </div>

          {trainers.length === 0 ? (
            <EmptyState icon={Users2} title="Sin entrenadores" description="Crea la primera cuenta de entrenador para poder asignarle clientes." action={isAdmin ? { label: 'Nuevo entrenador', onClick: () => setShowTrainerForm(true) } : undefined} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trainers.map(trainer => {
                const assigned = clientsOf(trainer.id);
                return (
                  <div key={trainer.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <MemberAvatar firstName={trainer.firstName} lastName={trainer.lastName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{trainer.firstName} {trainer.lastName}</p>
                        <p className="text-xs text-gray-400 truncate">{trainer.phone}</p>
                      </div>
                      <button onClick={() => openAssign(trainer)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Asignar cliente">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {assigned.length === 0 ? (
                      <p className="text-xs text-gray-400">Sin clientes asignados.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {assigned.map(client => (
                          <span key={client.id} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                            {client.firstName} {client.lastName}
                            <button onClick={() => setUnassignTarget({ trainerId: trainer.id, clientId: client.id, clientName: `${client.firstName} ${client.lastName}` })} className="text-gray-400 hover:text-red-600">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal: nuevo entrenador */}
      {showTrainerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900 mb-4">Nuevo entrenador</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input value={trainerForm.firstName} onChange={e => setTrainerForm(prev => ({ ...prev, firstName: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos</label>
                  <input value={trainerForm.lastName} onChange={e => setTrainerForm(prev => ({ ...prev, lastName: e.target.value }))} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={trainerForm.phone}
                  onChange={e => setTrainerForm(prev => ({ ...prev, phone: e.target.value }))}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="55 1234 5678"
                  className="input"
                />
                {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowTrainerForm(false); setPhoneTouched(false); }} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg">Cancelar</button>
              <button onClick={handleCreateTrainer} disabled={creatingTrainer || !trainerForm.firstName} className="flex-1 py-2.5 btn-primary text-sm rounded-lg disabled:opacity-50">
                {creatingTrainer ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: asignar cliente */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900 mb-1">Asignar cliente</h3>
            <p className="text-sm text-gray-500 mb-4">Entrenador: {assignTarget.firstName} {assignTarget.lastName}</p>
            <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="input">
              <option value="">— Selecciona un cliente —</option>
              {members.map(m => {
                const current = trainerOf(m.id);
                const currentTrainer = current ? trainers.find(t => t.id === current.trainerId) : undefined;
                return (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}{currentTrainer ? ` (ya con ${currentTrainer.firstName})` : ''}
                  </option>
                );
              })}
            </select>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAssignTarget(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg">Cancelar</button>
              <button onClick={confirmAssign} disabled={!selectedClientId} className="flex-1 py-2.5 btn-primary text-sm rounded-lg disabled:opacity-50">Asignar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!unassignTarget}
        title="Quitar entrenador"
        description={`¿Quitarle el entrenador asignado a ${unassignTarget?.clientName}?`}
        confirmLabel="Quitar"
        variant="warning"
        onConfirm={() => { if (unassignTarget) unassignTrainer(unassignTarget.clientId); setUnassignTarget(null); }}
        onCancel={() => setUnassignTarget(null)}
      />
    </AppShell>
  );
}
