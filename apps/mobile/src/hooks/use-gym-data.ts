import { useQuery } from '@tanstack/react-query';

import { mockDb } from '@/lib/mock-db';
import type { Member, Profile, Routine, RoutineExercise } from '@/types/database';

export type RoutineWithExercises = Routine & { routine_exercises: RoutineExercise[] };

/** Cuántos segundos vive cada código antes de rotarse. */
export const ACCESS_CODE_ROTATION_SECONDS = 20;

/** El registro de negocio del cliente (member) ligado a su cuenta de login. */
export function useMyMember(profileId?: string) {
  return useQuery({
    queryKey: ['my-member', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<Member | null> => mockDb.findMemberByProfileId(profileId as string),
  });
}

/**
 * Código de acceso que se rota solo cada `ACCESS_CODE_ROTATION_SECONDS`
 * mientras la pantalla del QR esté abierta. En modo mock esto vive en
 * memoria (ver lib/mock-db.ts); cuando exista el backend en FastAPI, vuelve
 * a ser una llamada al servidor que también invalida el código anterior.
 */
export function useRotatingAccessCode(memberId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['rotating-access-code', memberId],
    enabled: enabled && !!memberId,
    refetchInterval: enabled && memberId ? ACCESS_CODE_ROTATION_SECONDS * 1000 : false,
    queryFn: async () => mockDb.rotateAccessCode(memberId as string),
  });
}

/** Entrenador asignado al cliente, si tiene uno. */
export function useMyTrainer(memberId?: string) {
  return useQuery({
    queryKey: ['my-trainer', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<Profile | null> => mockDb.findTrainerForClient(memberId as string),
  });
}

/** Rutina personalizada del cliente; si no tiene, cae a una rutina genérica. */
export function useMyRoutine(memberId?: string) {
  return useQuery({
    queryKey: ['my-routine', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<RoutineWithExercises | null> => mockDb.findRoutineForClientOrGeneric(memberId as string),
  });
}

/** Clientes (members) asignados a un entrenador. */
export function useMyClients(trainerId?: string) {
  return useQuery({
    queryKey: ['my-clients', trainerId],
    enabled: !!trainerId,
    queryFn: async (): Promise<Member[]> => mockDb.findClientsForTrainer(trainerId as string),
  });
}

/** Rutina personalizada de un cliente específico, vista/editada por su entrenador. */
export function useClientRoutine(memberId?: string) {
  return useQuery({
    queryKey: ['client-routine', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<RoutineWithExercises | null> => mockDb.findPersonalizedRoutine(memberId as string),
  });
}
