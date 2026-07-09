import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Member, Profile, Routine, RoutineExercise } from '@/types/database';

export type RoutineWithExercises = Routine & { routine_exercises: RoutineExercise[] };

/** El registro de negocio del cliente (member) ligado a su cuenta de login. */
export function useMyMember(profileId?: string) {
  return useQuery({
    queryKey: ['my-member', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<Member | null> => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('profile_id', profileId as string)
        .maybeSingle();
      if (error) throw error;
      return data as Member | null;
    },
  });
}

/** Código de acceso activo del cliente (lo que se codifica en el QR). */
export function useMyAccessCode(memberId?: string) {
  return useQuery({
    queryKey: ['access-code', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_access_codes')
        .select('*')
        .eq('member_id', memberId as string)
        .eq('active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Entrenador asignado al cliente, si tiene uno. */
export function useMyTrainer(memberId?: string) {
  return useQuery({
    queryKey: ['my-trainer', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<Profile | null> => {
      const { data: assignment, error: assignmentError } = await supabase
        .from('trainer_clients')
        .select('trainer_id')
        .eq('client_id', memberId as string)
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
export function useMyRoutine(memberId?: string) {
  return useQuery({
    queryKey: ['my-routine', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<RoutineWithExercises | null> => {
      const { data: personalized, error: personalizedError } = await supabase
        .from('routines')
        .select('*, routine_exercises(*)')
        .eq('client_id', memberId as string)
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

/** Clientes (members) asignados a un entrenador. */
export function useMyClients(trainerId?: string) {
  return useQuery({
    queryKey: ['my-clients', trainerId],
    enabled: !!trainerId,
    queryFn: async (): Promise<Member[]> => {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('trainer_clients')
        .select('client_id')
        .eq('trainer_id', trainerId as string);
      if (assignmentsError) throw assignmentsError;
      if (!assignments?.length) return [];

      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*')
        .in(
          'id',
          assignments.map((a) => a.client_id)
        );
      if (membersError) throw membersError;
      return members ?? [];
    },
  });
}

/** Rutina personalizada de un cliente específico, vista/editada por su entrenador. */
export function useClientRoutine(memberId?: string) {
  return useQuery({
    queryKey: ['client-routine', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<RoutineWithExercises | null> => {
      const { data, error } = await supabase
        .from('routines')
        .select('*, routine_exercises(*)')
        .eq('client_id', memberId as string)
        .maybeSingle();
      if (error) throw error;
      return data as RoutineWithExercises | null;
    },
  });
}
