'use client';
import { useState } from 'react';
import { UserPlus, Users2, X, Dumbbell, Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import type { Routine, RoutineExercise, Trainer } from '@/types';

interface TrainerFormData {
  firstName: string;
  lastName: string;
  email: string;
}
const emptyTrainerForm: TrainerFormData = { firstName: '', lastName: '', email: '' };

type EditableExercise = Omit<RoutineExercise, 'id' | 'routineId'>;
const emptyExercise: EditableExercise = { name: '', sets: 3, reps: '10', restSeconds: 60, orderIndex: 0, notes: '' };

export default function TrainersPage() {
  const {
    members,
    trainers,
    trainerAssignments,
    genericRoutines,
    addStaff,
    assignTrainer,
    unassignTrainer,
    addGenericRoutine,
    updateGenericRoutine,
    deleteGenericRoutine,
    replaceRoutineExercises,
  } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // --- Nuevo entrenador ---
  const [showTrainerForm, setShowTrainerForm] = useState(false);
  const [trainerForm, setTrainerForm] = useState<TrainerFormData>(emptyTrainerForm);
  const [creatingTrainer, setCreatingTrainer] = useState(false);

  const handleCreateTrainer = async () => {
    if (!trainerForm.firstName || !trainerForm.email) return;
    setCreatingTrainer(true);
    try {
      const { tempPassword } = await addStaff({
        firstName: trainerForm.firstName,
        lastName: trainerForm.lastName,
        email: trainerForm.email,
        role: 'trainer',
      });
      window.alert(`Cuenta de entrenador creada. Contraseña temporal para ${trainerForm.email}:\n\n${tempPassword}\n\nCompártela de forma segura.`);
      setShowTrainerForm(false);
      setTrainerForm(emptyTrainerForm);
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

  // --- Rutinas genéricas ---
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineGoal, setRoutineGoal] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [newExercise, setNewExercise] = useState<EditableExercise>(emptyExercise);
  const [deleteRoutineTarget, setDeleteRoutineTarget] = useState<Routine | null>(null);
  const [savingRoutine, setSavingRoutine] = useState(false);

  const openNewRoutine = () => {
    setEditingRoutine(null);
    setRoutineTitle('');
    setRoutineGoal('');
    setExercises([]);
    setNewExercise(emptyExercise);
    setRoutineModalOpen(true);
  };
  const openEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setRoutineTitle(routine.title);
    setRoutineGoal(routine.goal ?? '');
    setExercises(routine.exercises.map(({ id: _id, routineId: _rid, ...rest }) => rest));
    setNewExercise(emptyExercise);
    setRoutineModalOpen(true);
  };
  const closeRoutineModal = () => setRoutineModalOpen(false);

  const addExerciseToForm = () => {
    if (!newExercise.name.trim()) return;
    setExercises(prev => [...prev, newExercise]);
    setNewExercise(emptyExercise);
  };
  const removeExerciseFromForm = (index: number) => setExercises(prev => prev.filter((_, i) => i !== index));

  const handleSaveRoutine = async () => {
    if (!routineTitle.trim()) return;
    setSavingRoutine(true);
    try {
      const routineId = editingRoutine
        ? (await updateGenericRoutine(editingRoutine.id, { title: routineTitle.trim(), goal: routineGoal.trim() }), editingRoutine.id)
        : (await addGenericRoutine({ title: routineTitle.trim(), goal: routineGoal.trim() })).id;
      await replaceRoutineExercises(routineId, exercises);
      closeRoutineModal();
    } finally {
      setSavingRoutine(false);
    }
  };

  return (
    <AppShell>
      <Header title="Entrenadores" subtitle="Asignación de clientes y rutinas genéricas" />
      <div className="p-6 space-y-8">
        {/* Roster de entrenadores */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users2 className="w-4 h-4 text-blue-600" /> Entrenadores
            </h2>
            {isAdmin && (
              <button onClick={() => setShowTrainerForm(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
                        <p className="text-xs text-gray-400 truncate">{trainer.email}</p>
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

        {/* Rutinas genéricas */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-blue-600" /> Rutinas genéricas
            </h2>
            {isAdmin && (
              <button onClick={openNewRoutine} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Nueva rutina
              </button>
            )}
          </div>

          {genericRoutines.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Sin rutinas genéricas" description="Estas son las rutinas que ve un cliente sin entrenador personal." action={isAdmin ? { label: 'Nueva rutina', onClick: openNewRoutine } : undefined} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {genericRoutines.map(routine => (
                <div key={routine.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{routine.title}</p>
                      {routine.goal && <p className="text-xs text-blue-600 font-medium mt-0.5">{routine.goal}</p>}
                      <p className="text-xs text-gray-400 mt-1">{routine.exercises.length} ejercicio{routine.exercises.length !== 1 ? 's' : ''}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => openEditRoutine(routine)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteRoutineTarget(routine)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                <input type="email" value={trainerForm.email} onChange={e => setTrainerForm(prev => ({ ...prev, email: e.target.value }))} className="input" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowTrainerForm(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg">Cancelar</button>
              <button onClick={handleCreateTrainer} disabled={creatingTrainer || !trainerForm.firstName || !trainerForm.email} className="flex-1 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
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
              <button onClick={confirmAssign} disabled={!selectedClientId} className="flex-1 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">Asignar</button>
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

      <ConfirmationDialog
        open={!!deleteRoutineTarget}
        title="Eliminar rutina"
        description={`¿Seguro que deseas eliminar "${deleteRoutineTarget?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => { if (deleteRoutineTarget) deleteGenericRoutine(deleteRoutineTarget.id); setDeleteRoutineTarget(null); }}
        onCancel={() => setDeleteRoutineTarget(null)}
      />

      {/* Modal: editor de rutina genérica */}
      {routineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{editingRoutine ? 'Editar rutina' : 'Nueva rutina genérica'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
                  <input value={routineTitle} onChange={e => setRoutineTitle(e.target.value)} className="input" placeholder="Ej. Fuerza tren superior" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Objetivo</label>
                  <input value={routineGoal} onChange={e => setRoutineGoal(e.target.value)} className="input" placeholder="Ej. ganancia_muscular" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Ejercicios</h4>
                <div className="space-y-2">
                  {exercises.map((ex, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{ex.name}</p>
                        <p className="text-xs text-gray-400">{ex.sets} series × {ex.reps} reps{ex.restSeconds ? ` · descanso ${ex.restSeconds}s` : ''}</p>
                      </div>
                      <button onClick={() => removeExerciseFromForm(index)} className="text-red-500 hover:text-red-700 text-xs">Quitar</button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                  <input value={newExercise.name} onChange={e => setNewExercise(prev => ({ ...prev, name: e.target.value }))} className="input" placeholder="Nombre del ejercicio" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" min="1" value={newExercise.sets} onChange={e => setNewExercise(prev => ({ ...prev, sets: Number(e.target.value) }))} className="input" placeholder="Series" />
                    <input value={newExercise.reps} onChange={e => setNewExercise(prev => ({ ...prev, reps: e.target.value }))} className="input" placeholder="Reps (ej. 8-12)" />
                    <input type="number" min="0" value={newExercise.restSeconds} onChange={e => setNewExercise(prev => ({ ...prev, restSeconds: Number(e.target.value) }))} className="input" placeholder="Descanso (s)" />
                  </div>
                  <button onClick={addExerciseToForm} disabled={!newExercise.name.trim()} className="w-full py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-white disabled:opacity-50">
                    + Agregar ejercicio
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={closeRoutineModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveRoutine} disabled={savingRoutine || !routineTitle.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {savingRoutine ? 'Guardando...' : editingRoutine ? 'Guardar cambios' : 'Crear rutina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
