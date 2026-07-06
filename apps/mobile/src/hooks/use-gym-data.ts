import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Profile, Routine, RoutineExercise } from '@/types/database';

export type RoutineWithExercises = Routine & { routine_exercises: RoutineExercise[] };

/** Última suscripción del cliente (para saber si está activa). */
export function useMySubscription(clientId?: string) {
  return useQuery({
    queryKey: ['subscription', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Código de acceso activo del cliente (lo que se codifica en el QR). */
export function useMyAccessCode(clientId?: string) {
  return useQuery({
    queryKey: ['access-code', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_access_codes')
        .select('*')
        .eq('client_id', clientId as string)
        .eq('active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Entrenador asignado al cliente, si tiene uno. */
export function useMyTrainer(clientId?: string) {
  return useQuery({
    queryKey: ['my-trainer', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<Profile | null> => {
      const { data: assignment, error: assignmentError } = await supabase
        .from('trainer_clients')
        .select('trainer_id')
        .eq('client_id', clientId as string)
        .maybeSingle();
      if (assignmentError) throw assignmentError;
      if (!assignment) return null;

      const { data: trainer, error: trainerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', assignment.trainer_id)
        .maybeSingle();
      if (trainerError) throw trainerError;
      return trainer;
    },
  });
}

/** Rutina personalizada del cliente; si no tiene, cae a una rutina genérica. */
export function useMyRoutine(clientId?: string) {
  return useQuery({
    queryKey: ['my-routine', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<RoutineWithExercises | null> => {
      const { data: personalized, error: personalizedError } = await supabase
        .from('routines')
        .select('*, routine_exercises(*)')
        .eq('client_id', clientId as string)
        .maybeSingle();
      if (personalizedError) throw personalizedError;
      if (personalized) return personalized as RoutineWithExercises;

      const { data: generic, error: genericError } = await supabase
        .from('routines')
        .select('*, routine_exercises(*)')
        .is('client_id', null)
        .limit(1)
        .maybeSingle();
      if (genericError) throw genericError;
      return generic as RoutineWithExercises | null;
    },
  });
}

/** Clientes asignados a un entrenador. */
export function useMyClients(trainerId?: string) {
  return useQuery({
    queryKey: ['my-clients', trainerId],
    enabled: !!trainerId,
    queryFn: async (): Promise<Profile[]> => {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('trainer_clients')
        .select('client_id')
        .eq('trainer_id', trainerId as string);
      if (assignmentsError) throw assignmentsError;
      if (!assignments?.length) return [];

      const { data: clients, error: clientsError } = await supabase
        .from('profiles')
        .select('*')
        .in(
          'id',
          assignments.map((a) => a.client_id)
        );
      if (clientsError) throw clientsError;
      return clients ?? [];
    },
  });
}

/** Rutina personalizada de un cliente específico, vista/editada por su entrenador. */
export function useClientRoutine(clientId?: string) {
  return useQuery({
    queryKey: ['client-routine', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<RoutineWithExercises | null> => {
      const { data, error } = await supabase
        .from('routines')
        .select('*, routine_exercises(*)')
        .eq('client_id', clientId as string)
        .maybeSingle();
      if (error) throw error;
      return data as RoutineWithExercises | null;
    },
  });
}
