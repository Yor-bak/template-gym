import type {
  ClientAccessCode,
  Gym,
  Member,
  Profile,
  Routine,
  RoutineExercise,
  TrainerClient,
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
    phone: '55 1111 2222',
    avatar_url: null,
    created_at: '2024-01-10T10:00:00Z',
  },
  {
    id: 'profile_trainer_1',
    gym_id: gym.id,
    role: 'trainer',
    full_name: 'Óscar Ramírez Kim',
    phone: '55 2211 3344',
    avatar_url: null,
    created_at: '2024-01-10T10:00:00Z',
  },
];

let members: Member[] = [
  {
    id: 'mem_001',
    gym_id: gym.id,
    profile_id: 'profile_client_1',
    member_number: 'AF-00001',
    first_name: 'Alejandro',
    last_name: 'Torres Vega',
    phone: '55 1111 2222',
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
    mobile_app_status: 'device_linked',
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
    profile_id: null,
    member_number: 'AF-00024',
    first_name: 'Daniela',
    last_name: 'Olvera Cruz',
    phone: '55 4455 6677',
    email: 'daniela.o@email.com',
    birth_date: null,
    photo_url: null,
    membership_plan_id: 'ms_001',
    status: 'pending_activation',
    start_date: '2026-07-02',
    expiration_date: '2026-08-01',
    last_payment_date: '2026-07-02',
    blocked_at: null,
    blocked_by: null,
    block_reason: null,
    temporary_access_until: null,
    temporary_access_by: null,
    temporary_access_reason: null,
    mobile_app_status: 'pending',
    activation_code: 'DEMO1234',
    emergency_contact: null,
    emergency_phone: null,
    notes: null,
    created_by: null,
    created_at: '2026-07-02T09:00:00Z',
  },
];

const trainerClients: TrainerClient[] = [
  { id: 'tc_001', trainer_id: 'profile_trainer_1', client_id: 'mem_001', assigned_at: '2026-06-05T10:00:00Z' },
];

let routines: Routine[] = [
  {
    id: 'rt_generic_1',
    trainer_id: null,
    client_id: null,
    title: 'Fuerza general - principiante',
    goal: 'Adaptación anatómica, 3 días por semana',
    created_at: '2026-06-01T10:00:00Z',
  },
];

let routineExercises: RoutineExercise[] = [
  { id: 'rte_1', routine_id: 'rt_generic_1', name: 'Sentadilla goblet', sets: 3, reps: '12', rest_seconds: 60, order_index: 0, notes: null },
  { id: 'rte_2', routine_id: 'rt_generic_1', name: 'Press banca mancuerna', sets: 3, reps: '10', rest_seconds: 60, order_index: 1, notes: null },
  { id: 'rte_3', routine_id: 'rt_generic_1', name: 'Remo con barra', sets: 3, reps: '10', rest_seconds: 60, order_index: 2, notes: null },
];

const accessCodes = new Map<string, ClientAccessCode>();

interface Credential {
  email: string;
  password: string;
  profileId: string;
}

const credentials: Credential[] = [
  { email: 'cliente@test.com', password: '123456', profileId: 'profile_client_1' },
  { email: 'entrenador@test.com', password: '123456', profileId: 'profile_trainer_1' },
];

export const mockDb = {
  getGym: (): Gym => gym,

  findProfile: (id: string): Profile | null => profiles.find((p) => p.id === id) ?? null,

  findMemberByProfileId: (profileId: string): Member | null =>
    members.find((m) => m.profile_id === profileId) ?? null,

  lookupActivationCode: (code: string): { first_name: string; gym_name: string } | null => {
    const member = members.find((m) => m.activation_code === code);
    if (!member) return null;
    return { first_name: member.first_name, gym_name: gym.name };
  },

  signIn: (email: string, password: string): { error: string | null; profileId?: string } => {
    const cred = credentials.find(
      (c) => c.email.toLowerCase() === email.trim().toLowerCase() && c.password === password
    );
    if (!cred) return { error: 'Correo o contraseña incorrectos.' };
    return { error: null, profileId: cred.profileId };
  },

  activateAccount: (
    email: string,
    password: string,
    activationCode: string
  ): { error: string | null; profileId?: string } => {
    const code = activationCode.trim().toUpperCase();
    const member = members.find((m) => m.activation_code === code);
    if (!member) return { error: 'Código de activación inválido o ya utilizado.' };

    const profileId = `profile_${member.id}`;
    profiles = [
      ...profiles,
      {
        id: profileId,
        gym_id: gym.id,
        role: 'client',
        full_name: `${member.first_name} ${member.last_name}`,
        phone: member.phone,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    ];
    members = members.map((m) =>
      m.id === member.id ? { ...m, profile_id: profileId, mobile_app_status: 'activated', activation_code: null } : m
    );
    credentials.push({ email: email.trim(), password, profileId });
    return { error: null, profileId };
  },

  rotateAccessCode: (memberId: string): ClientAccessCode => {
    const code: ClientAccessCode = {
      id: `code_${Date.now()}`,
      member_id: memberId,
      code: Math.random().toString(36).slice(2, 10).toUpperCase(),
      active: true,
      created_at: new Date().toISOString(),
    };
    accessCodes.set(memberId, code);
    return code;
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

  findRoutineForClientOrGeneric: (clientId: string): (Routine & { routine_exercises: RoutineExercise[] }) | null => {
    const personalized = routines.find((r) => r.client_id === clientId);
    const base = personalized ?? routines.find((r) => r.client_id === null);
    if (!base) return null;
    return { ...base, routine_exercises: routineExercises.filter((e) => e.routine_id === base.id) };
  },

  findPersonalizedRoutine: (clientId: string): (Routine & { routine_exercises: RoutineExercise[] }) | null => {
    const routine = routines.find((r) => r.client_id === clientId);
    if (!routine) return null;
    return { ...routine, routine_exercises: routineExercises.filter((e) => e.routine_id === routine.id) };
  },

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
