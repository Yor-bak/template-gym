import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mockDb } from '@/lib/mock-db';
import type { AccessCode, Member, Profile, Routine, RoutineExercise, WorkoutLog } from '@/types/database';

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

/** Un cliente (member) por su id — para mostrar su nombre en pantallas del entrenador. */
export function useMember(memberId?: string) {
  return useQuery({
    queryKey: ['member', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<Member | null> => mockDb.findMemberById(memberId as string),
  });
}

/**
 * Código de acceso que se rota solo cada `ACCESS_CODE_ROTATION_SECONDS`
 * mientras la pantalla del QR esté abierta. Sirve tanto para clientes
 * (`owner_role: 'client'`, acceso físico al gym) como para entrenadores
 * (`owner_role: 'trainer'`, mismo propósito además de ser lo que un
 * entrenador escanea desde su vista para identificarse). En modo mock esto
 * vive en memoria (ver lib/mock-db.ts); cuando exista el backend en
 * FastAPI, vuelve a ser una llamada al servidor que también invalida el
 * código anterior.
 */
export function useRotatingAccessCode(ownerId: string | undefined, ownerRole: AccessCode['owner_role'], enabled: boolean) {
  return useQuery({
    queryKey: ['rotating-access-code', ownerId],
    enabled: enabled && !!ownerId,
    refetchInterval: enabled && ownerId ? ACCESS_CODE_ROTATION_SECONDS * 1000 : false,
    queryFn: async () => mockDb.rotateAccessCode(ownerId as string, ownerRole),
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

/** Rutina personalizada que el propio entrenador del cliente le asignó. */
export function useMyRoutine(memberId?: string) {
  return useQuery({
    queryKey: ['my-routine', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<RoutineWithExercises | null> => mockDb.findPersonalizedRoutine(memberId as string),
  });
}

/** Las rutinas genéricas por grupo muscular — solo se muestran cuando el
 * cliente todavía no tiene rutina personalizada de un entrenador. */
export function useGenericRoutines() {
  return useQuery({
    queryKey: ['generic-routines'],
    queryFn: async (): Promise<RoutineWithExercises[]> => mockDb.findGenericRoutines(),
  });
}

/** Historial de rutinas completadas por el cliente, para el calendario. */
export function useWorkoutHistory(memberId?: string) {
  return useQuery({
    queryKey: ['workout-history', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<WorkoutLog[]> => mockDb.findWorkoutHistory(memberId as string),
  });
}

/** Marca la rutina del día como completada — alimenta el calendario. */
export function useLogWorkoutCompletion(memberId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ routineId, routineTitle }: { routineId: string; routineTitle: string }) => {
      if (!memberId) throw new Error('Falta el id del cliente.');
      return mockDb.logWorkoutCompletion(memberId, routineId, routineTitle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-history', memberId] });
    },
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

export type ScanClientResult =
  | { status: 'assigned'; clientName: string }
  | { status: 'not_a_client' }
  | { status: 'invalid_or_expired' };

/**
 * Resuelve el código escaneado por el entrenador (el mismo QR de acceso
 * rotativo que el cliente ya usa para entrar al gym) y, si pertenece a un
 * cliente vigente, lo asigna a este entrenador. El `owner_id` de un código
 * de rol "client" es directamente el `Member.id` (así se genera en
 * `(client)/index.tsx`), no un `profile.id`.
 */
export function useAssignClientFromScan(trainerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rawCode: string): Promise<ScanClientResult> => {
      const resolved = mockDb.resolveAccessCode(rawCode);
      if (!resolved) return { status: 'invalid_or_expired' };
      if (resolved.ownerRole !== 'client') return { status: 'not_a_client' };
      if (!trainerId) return { status: 'invalid_or_expired' };

      const member = mockDb.findMemberById(resolved.ownerId);
      if (!member) return { status: 'invalid_or_expired' };

      mockDb.assignTrainer(trainerId, member.id);
      return { status: 'assigned', clientName: `${member.first_name} ${member.last_name}` };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-clients', trainerId] });
    },
  });
}
