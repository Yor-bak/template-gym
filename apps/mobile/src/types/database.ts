// Tipos alineados 1:1 con el JSON real del backend (apps/api) — todo en
// camelCase porque el backend responde así (app/core/camel_model.py). Ya no
// hay mapeo/transformación en el cliente: lo que llega del servidor es
// directamente lo que usan las pantallas.

export type UserRole =
  | 'client'
  | 'trainer'
  | 'gym_admin'
  | 'gym_admin_secondary'
  | 'receptionist'
  | 'platform_admin';

export type MemberStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'blocked'
  | 'temporary_access'
  | 'pending_activation'
  | 'archived';

export interface User {
  id: string;
  gymId: string | null;
  role: UserRole;
  fullName: string;
  phone: string;
  email: string | null;
  active?: boolean;
  mustChangePassword: boolean;
}

export interface Member {
  id: string;
  gymId: string;
  userId: string | null;
  memberNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: MemberStatus;
  startDate: string | null;
  expirationDate: string | null;
  mobileAppStatus: string;
  activationCode: string | null;
  createdAt: string;
}

/** Token de acceso firmado (HMAC), rotativo cada ~20s — ver
 * app/core/qr.py. Sirve tanto para el QR de entrada del cliente como para
 * el QR de identificación del entrenador y para vincular entrenador↔cliente
 * cuando el entrenador lo escanea. */
export interface QrToken {
  token: string;
  rotateAfterSeconds: number;
}

/** Vista mínima del cliente para "Mis clientes" del entrenador. */
export interface TrainerClientMember {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

/** Vista mínima del entrenador para "Mi entrenador" del cliente. */
export interface MyTrainer {
  id: string;
  fullName: string;
  phone: string;
}

export interface RoutineExercise {
  id: string;
  routineId: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number | null;
  orderIndex: number;
  notes: string | null;
  /** Referencia opcional al catálogo de ejercicios estático de
   * lib/exercise-catalog.ts — no es un id del backend, vive solo en el
   * cliente. */
  catalogId: string | null;
}

export interface Routine {
  id: string;
  gymId: string;
  trainerId: string | null;
  clientId: string | null;
  title: string;
  goal: string | null;
  /** Set solo en rutinas genéricas por grupo muscular (sin cliente
   * asignado) — se le ofrecen al cliente que todavía no tiene entrenador. */
  muscleGroup: string | null;
  createdAt: string;
  routineExercises: RoutineExercise[];
}

/** Un registro de que el cliente terminó una rutina cierto día — alimenta
 * el calendario de la pantalla de Rutina. */
export interface WorkoutLog {
  id: string;
  memberId: string;
  routineId: string | null;
  routineTitle: string;
  /** Fecha en formato YYYY-MM-DD (sin hora). */
  completedDate: string;
  completedAt: string;
}
