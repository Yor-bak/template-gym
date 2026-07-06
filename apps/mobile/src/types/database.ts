export type UserRole = 'client' | 'trainer';
export type SubscriptionStatus = 'active' | 'cancelled';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  client_id: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface ClientAccessCode {
  id: string;
  client_id: string;
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
}

export interface AccessLog {
  id: string;
  client_id: string;
  scanned_at: string;
}

// Tipo mínimo compatible con el genérico de supabase-js; se puede reemplazar
// por el output de `supabase gen types typescript` cuando el proyecto esté enlazado.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      subscriptions: { Row: Subscription; Insert: Partial<Subscription>; Update: Partial<Subscription> };
      client_access_codes: {
        Row: ClientAccessCode;
        Insert: Partial<ClientAccessCode>;
        Update: Partial<ClientAccessCode>;
      };
      trainer_clients: { Row: TrainerClient; Insert: Partial<TrainerClient>; Update: Partial<TrainerClient> };
      routines: { Row: Routine; Insert: Partial<Routine>; Update: Partial<Routine> };
      routine_exercises: {
        Row: RoutineExercise;
        Insert: Partial<RoutineExercise>;
        Update: Partial<RoutineExercise>;
      };
      access_logs: { Row: AccessLog; Insert: Partial<AccessLog>; Update: Partial<AccessLog> };
    };
  };
}
