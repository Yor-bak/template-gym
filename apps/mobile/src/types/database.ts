export type UserRole = 'client' | 'trainer' | 'admin' | 'receptionist' | 'platform_admin';
export type MemberStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'blocked'
  | 'temporary_access'
  | 'pending_activation'
  | 'archived';
export type MobileAppStatus = 'not_activated' | 'pending' | 'activated' | 'device_linked' | 'suspended';

export interface Gym {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: 'MXN' | 'USD';
  member_prefix: string;
  logo_url: string | null;
  primary_color: string | null;
  active: boolean;
  subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled';
  created_at: string;
}

export interface Profile {
  id: string;
  gym_id: string | null;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface MembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  price: number;
  duration: number;
  duration_unit: 'days' | 'weeks' | 'months' | 'years';
  tolerance_days: number;
  description: string | null;
  active: boolean;
  allows_multi_branch_access: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  gym_id: string;
  profile_id: string | null;
  member_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  photo_url: string | null;
  membership_plan_id: string | null;
  status: MemberStatus;
  start_date: string | null;
  expiration_date: string | null;
  last_payment_date: string | null;
  blocked_at: string | null;
  blocked_by: string | null;
  block_reason: string | null;
  temporary_access_until: string | null;
  temporary_access_by: string | null;
  temporary_access_reason: string | null;
  mobile_app_status: MobileAppStatus;
  activation_code: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Código de acceso rotativo. `owner_id` es el `Member.id` cuando
 * `owner_role` es "client", o el `Profile.id` del entrenador cuando es
 * "trainer" — ambos roles usan el mismo mecanismo para entrar al gym por la
 * puerta de acceso, y el mismo código es lo que un entrenador escanea desde
 * su vista para identificar (y asignarse) a un cliente.
 */
export interface AccessCode {
  id: string;
  owner_id: string;
  owner_role: 'client' | 'trainer';
  code: string;
  active: boolean;
  created_at: string;
}

export interface TrainerClient {
  id: string;
  trainer_id: string;
  client_id: string;
  assigned_at: string;
}

export interface Routine {
  id: string;
  trainer_id: string | null;
  client_id: string | null;
  title: string;
  goal: string | null;
  /** Cuando la rutina es genérica (sin cliente asignado, `client_id: null`)
   * y pertenece a un grupo muscular fijo (pierna, espalda, torso...) — solo
   * se le ofrecen al cliente sin entrenador todavía, como punto de partida
   * mientras no tiene algo personalizado. */
  muscle_group: string | null;
  created_at: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  order_index: number;
  notes: string | null;
  /** Referencia opcional al catálogo de ejercicios (lib/exercise-catalog.ts)
   * — cuando existe, la app puede mostrar músculo trabajado e instrucciones
   * paso a paso. Los ejercicios escritos a mano (sin elegir del catálogo)
   * simplemente quedan en null. */
  catalog_id: string | null;
}

/** Un registro de que el cliente terminó una rutina cierto día — alimenta el
 * calendario de la pantalla de Rutina. Solo vive en el cliente (no hay
 * seguimiento de series/reps reales todavía, solo "la completó ese día"). */
export interface WorkoutLog {
  id: string;
  member_id: string;
  routine_id: string;
  routine_title: string;
  /** Fecha local en formato YYYY-MM-DD (sin hora) — así el calendario
   * compara por día sin líos de zona horaria. */
  completed_date: string;
  completed_at: string;
}

export type AccessResult =
  | 'authorized'
  | 'expiring_soon'
  | 'expired'
  | 'blocked'
  | 'invalid_qr'
  | 'temporary_access'
  | 'manual';

export interface AccessLog {
  id: string;
  gym_id: string;
  member_id: string | null;
  result: AccessResult;
  reader: string;
  raw_qr_code: string | null;
  scanned_at: string;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';
export type PaymentStatus = 'confirmed' | 'cancelled' | 'corrected' | 'pending';

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  membership_plan_id: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  payment_date: string;
  period_start: string;
  period_end: string;
  reference: string | null;
  notes: string | null;
  registered_by: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  correction_of: string | null;
  created_at: string;
}
