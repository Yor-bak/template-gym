import type {
  AccessCode,
  Gym,
  Member,
  Profile,
  Routine,
  RoutineExercise,
  TrainerClient,
  WorkoutLog,
} from '@/types/database';

// ----------------------------------------------------------------------------
// "Base de datos" en memoria (modo mock). Sustituye temporalmente al backend
// real mientras se construye el nuevo backend en Python/FastAPI + SQLAlchemy +
// PostgreSQL. Vive en un módulo singleton (no en un Context) porque varias
// pantallas necesitan leer/escribir el mismo estado sin pasar por props.
// ----------------------------------------------------------------------------

const gym: Gym = {
  id: 'gym_001',
  name: 'American Fitness',
  slug: 'american-fitness',
  address: 'Av. Insurgentes Sur 1234, CDMX',
  phone: '55 1234 5678',
  email: 'contacto@americanfitness.mx',
  timezone: 'America/Mexico_City',
  currency: 'MXN',
  member_prefix: 'AF',
  logo_url: null,
  primary_color: '#16305a',
  active: true,
  subscription_status: 'active',
  created_at: '2023-03-15T10:00:00Z',
};

let profiles: Profile[] = [
  {
    id: 'profile_client_1',
    gym_id: gym.id,
    role: 'client',
    full_name: 'Alejandro Torres Vega',
    phone: '5511112222',
    avatar_url: null,
    created_at: '2024-01-10T10:00:00Z',
  },
  {
    id: 'profile_client_2',
    gym_id: gym.id,
    role: 'client',
    full_name: 'Daniela Olvera Cruz',
    phone: '5544556677',
    avatar_url: null,
    created_at: '2026-07-02T09:00:00Z',
  },
  {
    id: 'profile_trainer_1',
    gym_id: gym.id,
    role: 'trainer',
    full_name: 'Óscar Ramírez Kim',
    phone: '5522113344',
    avatar_url: null,
    created_at: '2024-01-10T10:00:00Z',
  },
];

// La recepción da de alta al member y su cuenta de acceso en el mismo paso
// (ya no hay un "código de activación" ni un registro separado del cliente):
// el member nace con profile_id ya linkeado.
let members: Member[] = [
  {
    id: 'mem_001',
    gym_id: gym.id,
    profile_id: 'profile_client_1',
    member_number: 'AF-00001',
    first_name: 'Alejandro',
    last_name: 'Torres Vega',
    phone: '5511112222',
    email: 'alejandro.torres@email.com',
    birth_date: '1990-05-15',
    photo_url: null,
    membership_plan_id: 'ms_001',
    status: 'active',
    start_date: '2026-06-02',
    expiration_date: '2026-08-01',
    last_payment_date: '2026-06-02',
    blocked_at: null,
    blocked_by: null,
    block_reason: null,
    temporary_access_until: null,
    temporary_access_by: null,
    temporary_access_reason: null,
    mobile_app_status: 'activated',
    activation_code: null,
    emergency_contact: null,
    emergency_phone: null,
    notes: null,
    created_by: null,
    created_at: '2024-01-10T10:00:00Z',
  },
  {
    id: 'mem_024',
    gym_id: gym.id,
    profile_id: 'profile_client_2',
    member_number: 'AF-00024',
    first_name: 'Daniela',
    last_name: 'Olvera Cruz',
    phone: '5544556677',
    email: 'daniela.o@email.com',
    birth_date: null,
    photo_url: null,
    membership_plan_id: 'ms_001',
    status: 'active',
    start_date: '2026-07-02',
    expiration_date: '2026-08-01',
    last_payment_date: '2026-07-02',
    blocked_at: null,
    blocked_by: null,
    block_reason: null,
    temporary_access_until: null,
    temporary_access_by: null,
    temporary_access_reason: null,
    mobile_app_status: 'activated',
    activation_code: null,
    emergency_contact: null,
    emergency_phone: null,
    notes: null,
    created_by: null,
    created_at: '2026-07-02T09:00:00Z',
  },
];

let trainerClients: TrainerClient[] = [
  { id: 'tc_001', trainer_id: 'profile_trainer_1', client_id: 'mem_001', assigned_at: '2026-06-05T10:00:00Z' },
];

// Los clientes con entrenador asignado solo ven la rutina que ese entrenador
// les armó. Los que todavía no tienen entrenador reciben, en su lugar, una
// de las rutinas genéricas por grupo muscular de abajo (ver
// findRoutineForClient) — deliberadamente básicas (3-4 ejercicios, sin
// progresión ni periodización) para no sustituir el trabajo real de un
// entrenador, solo dar un punto de partida.
let routines: Routine[] = [
  {
    id: 'rt_001',
    trainer_id: 'profile_trainer_1',
    client_id: 'mem_001',
    title: 'Fuerza general - principiante',
    goal: 'Adaptación anatómica, 3 días por semana',
    muscle_group: null,
    created_at: '2026-06-01T10:00:00Z',
  },
];

const genericRoutines: Routine[] = [
  { id: 'rt_generic_legs', trainer_id: null, client_id: null, title: 'Rutina de pierna', goal: null, muscle_group: 'legs', created_at: '2026-01-01T00:00:00Z' },
  { id: 'rt_generic_back', trainer_id: null, client_id: null, title: 'Rutina de espalda', goal: null, muscle_group: 'back', created_at: '2026-01-01T00:00:00Z' },
  { id: 'rt_generic_chest', trainer_id: null, client_id: null, title: 'Rutina de pecho', goal: null, muscle_group: 'chest', created_at: '2026-01-01T00:00:00Z' },
  { id: 'rt_generic_shoulders', trainer_id: null, client_id: null, title: 'Rutina de hombros', goal: null, muscle_group: 'shoulders', created_at: '2026-01-01T00:00:00Z' },
  { id: 'rt_generic_arms', trainer_id: null, client_id: null, title: 'Rutina de brazos', goal: null, muscle_group: 'arms', created_at: '2026-01-01T00:00:00Z' },
  { id: 'rt_generic_core', trainer_id: null, client_id: null, title: 'Rutina de abdomen', goal: null, muscle_group: 'core', created_at: '2026-01-01T00:00:00Z' },
];

let routineExercises: RoutineExercise[] = [
  { id: 'rte_1', routine_id: 'rt_001', name: 'Sentadilla goblet', sets: 3, reps: '12', rest_seconds: 60, order_index: 0, notes: null, catalog_id: '1760' },
  { id: 'rte_2', routine_id: 'rt_001', name: 'Press banca mancuerna', sets: 3, reps: '10', rest_seconds: 60, order_index: 1, notes: null, catalog_id: null },
  { id: 'rte_3', routine_id: 'rt_001', name: 'Remo con barra', sets: 3, reps: '10', rest_seconds: 60, order_index: 2, notes: null, catalog_id: null },

  // Rutinas genéricas — cada ejercicio referencia el catálogo real (misma
  // fuente que usa el entrenador) para que el cliente también vea músculo
  // trabajado e instrucciones paso a paso.
  { id: 'rteg_legs_1', routine_id: 'rt_generic_legs', name: 'Sentadilla con mancuerna', sets: 3, reps: '10-12', rest_seconds: 60, order_index: 0, notes: null, catalog_id: '0413' },
  { id: 'rteg_legs_2', routine_id: 'rt_generic_legs', name: 'Estocada con mancuerna', sets: 3, reps: '10-12', rest_seconds: 60, order_index: 1, notes: null, catalog_id: '0336' },
  { id: 'rteg_legs_3', routine_id: 'rt_generic_legs', name: 'Peso muerto rumano con mancuerna', sets: 3, reps: '10-12', rest_seconds: 60, order_index: 2, notes: null, catalog_id: '1459' },
  { id: 'rteg_legs_4', routine_id: 'rt_generic_legs', name: 'Elevación de pantorrilla con barra', sets: 3, reps: '15', rest_seconds: 45, order_index: 3, notes: null, catalog_id: '1372' },

  { id: 'rteg_back_1', routine_id: 'rt_generic_back', name: 'Remo con barra', sets: 3, reps: '10-12', rest_seconds: 60, order_index: 0, notes: null, catalog_id: '0049' },
  { id: 'rteg_back_2', routine_id: 'rt_generic_back', name: 'Jalón al pecho', sets: 3, reps: '10-12', rest_seconds: 60, order_index: 1, notes: null, catalog_id: '0007' },
  { id: 'rteg_back_3', routine_id: 'rt_generic_back', name: 'Encogimiento con mancuerna', sets: 3, reps: '12-15', rest_seconds: 45, order_index: 2, notes: null, catalog_id: '0406' },

  { id: 'rteg_chest_1', routine_id: 'rt_generic_chest', name: 'Press de banca con mancuerna', sets: 3, reps: '10-12', rest_seconds: 60, order_index: 0, notes: null, catalog_id: '0289' },
  { id: 'rteg_chest_2', routine_id: 'rt_generic_chest', name: 'Apertura con mancuerna', sets: 3, reps: '12', rest_seconds: 60, order_index: 1, notes: null, catalog_id: '0308' },
  { id: 'rteg_chest_3', routine_id: 'rt_generic_chest', name: 'Fondos en banca', sets: 3, reps: '10-12', rest_seconds: 60, order_index: 2, notes: null, catalog_id: '1399' },

  { id: 'rteg_shoulders_1', routine_id: 'rt_generic_shoulders', name: 'Press de hombro con mancuerna', sets: 3, reps: '10-12', rest_seconds: 60, order_index: 0, notes: null, catalog_id: '0405' },
  { id: 'rteg_shoulders_2', routine_id: 'rt_generic_shoulders', name: 'Elevación lateral con mancuerna', sets: 3, reps: '12-15', rest_seconds: 45, order_index: 1, notes: null, catalog_id: '0334' },

  { id: 'rteg_arms_1', routine_id: 'rt_generic_arms', name: 'Curl de bíceps con mancuerna', sets: 3, reps: '10-12', rest_seconds: 45, order_index: 0, notes: null, catalog_id: '0294' },
  { id: 'rteg_arms_2', routine_id: 'rt_generic_arms', name: 'Curl martillo con mancuerna', sets: 3, reps: '10-12', rest_seconds: 45, order_index: 1, notes: null, catalog_id: '0313' },
  { id: 'rteg_arms_3', routine_id: 'rt_generic_arms', name: 'Extensión de tríceps con barra', sets: 3, reps: '10-12', rest_seconds: 45, order_index: 2, notes: null, catalog_id: '0061' },

  { id: 'rteg_core_1', routine_id: 'rt_generic_core', name: 'Abdominal 3/4', sets: 3, reps: '15', rest_seconds: 30, order_index: 0, notes: null, catalog_id: '0001' },
  { id: 'rteg_core_2', routine_id: 'rt_generic_core', name: 'Bicicleta en el aire', sets: 3, reps: '20', rest_seconds: 30, order_index: 1, notes: null, catalog_id: '0003' },
];

let workoutLogs: WorkoutLog[] = [
  { id: 'log_1', member_id: 'mem_001', routine_id: 'rt_001', routine_title: 'Fuerza general - principiante', completed_date: daysAgo(2), completed_at: new Date().toISOString() },
  { id: 'log_2', member_id: 'mem_001', routine_id: 'rt_001', routine_title: 'Fuerza general - principiante', completed_date: daysAgo(4), completed_at: new Date().toISOString() },
  { id: 'log_3', member_id: 'mem_001', routine_id: 'rt_001', routine_title: 'Fuerza general - principiante', completed_date: daysAgo(7), completed_at: new Date().toISOString() },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Clave = owner_id (member.id para clientes, profile.id para entrenadores).
const accessCodes = new Map<string, AccessCode>();

interface Credential {
  phone: string;
  password: string;
  /** true la primera vez que entra: la recepción le asignó una contraseña
   * provisional y debe cambiarla antes de usar el resto de la app. */
  mustChangePassword: boolean;
  profileId: string;
}

// Normaliza para que no importe si el usuario escribe espacios/guiones al
// teclear su teléfono para entrar.
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

let credentials: Credential[] = [
  { phone: '5511112222', password: '123456', mustChangePassword: false, profileId: 'profile_client_1' },
  // Cuenta de demo para probar el flujo de "primer ingreso": la recepción
  // acaba de dar de alta a Daniela con una contraseña provisional.
  { phone: '5544556677', password: 'temporal123', mustChangePassword: true, profileId: 'profile_client_2' },
  { phone: '5522113344', password: '123456', mustChangePassword: false, profileId: 'profile_trainer_1' },
];

export const mockDb = {
  getGym: (): Gym => gym,

  findProfile: (id: string): Profile | null => profiles.find((p) => p.id === id) ?? null,

  findMemberByProfileId: (profileId: string): Member | null =>
    members.find((m) => m.profile_id === profileId) ?? null,

  findMemberById: (memberId: string): Member | null => members.find((m) => m.id === memberId) ?? null,

  signIn: (
    phone: string,
    password: string
  ): { error: string | null; profileId?: string; mustChangePassword?: boolean } => {
    const cred = credentials.find(
      (c) => c.phone === normalizePhone(phone) && c.password === password
    );
    if (!cred) return { error: 'Teléfono o contraseña incorrectos.' };
    return { error: null, profileId: cred.profileId, mustChangePassword: cred.mustChangePassword };
  },

  changePassword: (profileId: string, newPassword: string): { error: string | null } => {
    const cred = credentials.find((c) => c.profileId === profileId);
    if (!cred) return { error: 'No se encontró la cuenta.' };
    credentials = credentials.map((c) =>
      c.profileId === profileId ? { ...c, password: newPassword, mustChangePassword: false } : c
    );
    return { error: null };
  },

  rotateAccessCode: (ownerId: string, ownerRole: AccessCode['owner_role']): AccessCode => {
    const code: AccessCode = {
      id: `code_${Date.now()}`,
      owner_id: ownerId,
      owner_role: ownerRole,
      code: Math.random().toString(36).slice(2, 10).toUpperCase(),
      active: true,
      created_at: new Date().toISOString(),
    };
    accessCodes.set(ownerId, code);
    return code;
  },

  /**
   * Lookup inverso: dado un código escaneado (el valor crudo del QR), busca
   * a quién pertenece ahora mismo. Como el código rota cada 20s, solo
   * resuelve si sigue siendo el vigente para su dueño — un código viejo
   * escaneado tarde ya no hace match contra nada.
   */
  resolveAccessCode: (rawCode: string): { ownerId: string; ownerRole: AccessCode['owner_role'] } | null => {
    const trimmed = rawCode.trim().toUpperCase();
    for (const ac of accessCodes.values()) {
      if (ac.active && ac.code === trimmed) return { ownerId: ac.owner_id, ownerRole: ac.owner_role };
    }
    return null;
  },

  findTrainerForClient: (clientId: string): Profile | null => {
    const assignment = trainerClients.find((tc) => tc.client_id === clientId);
    if (!assignment) return null;
    return profiles.find((p) => p.id === assignment.trainer_id) ?? null;
  },

  findClientsForTrainer: (trainerId: string): Member[] => {
    const ids = trainerClients.filter((tc) => tc.trainer_id === trainerId).map((tc) => tc.client_id);
    return members.filter((m) => ids.includes(m.id));
  },

  /** Asigna (o reasigna) un cliente a un entrenador — un cliente solo tiene un entrenador a la vez. */
  assignTrainer: (trainerId: string, clientId: string): TrainerClient => {
    const existing = trainerClients.find((tc) => tc.client_id === clientId);
    if (existing) {
      const updated: TrainerClient = { ...existing, trainer_id: trainerId, assigned_at: new Date().toISOString() };
      trainerClients = trainerClients.map((tc) => (tc.id === existing.id ? updated : tc));
      return updated;
    }
    const created: TrainerClient = {
      id: `tc_${Date.now()}`,
      trainer_id: trainerId,
      client_id: clientId,
      assigned_at: new Date().toISOString(),
    };
    trainerClients = [...trainerClients, created];
    return created;
  },

  findPersonalizedRoutine: (clientId: string): (Routine & { routine_exercises: RoutineExercise[] }) | null => {
    const routine = routines.find((r) => r.client_id === clientId);
    if (!routine) return null;
    return { ...routine, routine_exercises: routineExercises.filter((e) => e.routine_id === routine.id) };
  },

  /** Las 6 rutinas genéricas por grupo muscular (pierna, espalda, pecho,
   * hombros, brazos, abdomen) — se le ofrecen al cliente que todavía no
   * tiene entrenador asignado, como punto de partida mientras lo consigue. */
  findGenericRoutines: (): (Routine & { routine_exercises: RoutineExercise[] })[] =>
    genericRoutines.map((r) => ({
      ...r,
      routine_exercises: routineExercises.filter((e) => e.routine_id === r.id),
    })),

  logWorkoutCompletion: (memberId: string, routineId: string, routineTitle: string): WorkoutLog => {
    const log: WorkoutLog = {
      id: `log_${Date.now()}`,
      member_id: memberId,
      routine_id: routineId,
      routine_title: routineTitle,
      completed_date: new Date().toISOString().slice(0, 10),
      completed_at: new Date().toISOString(),
    };
    workoutLogs = [...workoutLogs, log];
    return log;
  },

  findWorkoutHistory: (memberId: string): WorkoutLog[] =>
    workoutLogs.filter((l) => l.member_id === memberId),

  saveClientRoutine: (params: {
    trainerId: string;
    clientId: string;
    title: string;
    goal: string | null;
    exercises: Omit<RoutineExercise, 'id' | 'routine_id'>[];
  }): Routine => {
    let routine = routines.find((r) => r.client_id === params.clientId);
    if (!routine) {
      routine = {
        id: `rt_${Date.now()}`,
        trainer_id: params.trainerId,
        client_id: params.clientId,
        title: params.title,
        goal: params.goal,
        muscle_group: null,
        created_at: new Date().toISOString(),
      };
      routines = [...routines, routine];
    } else {
      const routineId = routine.id;
      routines = routines.map((r) => (r.id === routineId ? { ...r, title: params.title, goal: params.goal } : r));
      routineExercises = routineExercises.filter((e) => e.routine_id !== routineId);
    }
    const newExercises = params.exercises.map((e, index) => ({
      ...e,
      id: `rte_${Date.now()}_${index}`,
      routine_id: routine!.id,
      order_index: index,
    }));
    routineExercises = [...routineExercises, ...newExercises];
    return routine;
  },
};
