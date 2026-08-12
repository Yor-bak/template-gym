import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  accessApi,
  ApiError,
  membersApi,
  routinesApi,
  trainerApi,
  workoutLogsApi,
  type RoutineExerciseInput,
} from '@/lib/api-client';
import type { Member, MyTrainer, QrToken, Routine, TrainerClientMember, WorkoutLog } from '@/types/database';

export type RoutineWithExercises = Routine;

/** Cuántos segundos vive cada token de QR antes de rotarse — el backend lo
 * confirma en cada respuesta (rotateAfterSeconds), esto es solo el default
 * mientras se resuelve la primera petición. */
export const ACCESS_CODE_ROTATION_SECONDS = 20;

/** El registro de negocio del cliente (member) ligado a su cuenta de login.
 * GET /members ya viene scoped por rol — como cliente devuelve solo el propio. */
export function useMyMember(userId?: string) {
  return useQuery({
    queryKey: ['my-member', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Member | null> => membersApi.mine(),
  });
}

/** Un cliente (member) por su id — para mostrar su nombre en pantallas del entrenador. */
export function useMember(memberId?: string) {
  return useQuery({
    queryKey: ['member', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<Member | null> => membersApi.byId(memberId as string),
  });
}

/**
 * Token de acceso (QR) que se rota cada `rotateAfterSeconds` mientras la
 * pantalla del QR esté abierta. Sirve tanto para clientes (entrada física al
 * gym) como para entrenadores (su propio QR de identificación + lo que un
 * entrenador escanea desde su vista para vincularse a un cliente).
 */
export function useRotatingAccessCode(ownerId: string | undefined, _ownerRole: 'client' | 'trainer', enabled: boolean) {
  return useQuery({
    queryKey: ['rotating-access-code', ownerId],
    enabled: enabled && !!ownerId,
    refetchInterval: (query) => {
      if (!enabled || !ownerId) return false;
      const seconds = query.state.data?.rotateAfterSeconds ?? ACCESS_CODE_ROTATION_SECONDS;
      return seconds * 1000;
    },
    queryFn: async (): Promise<QrToken> => accessApi.myQrToken(),
  });
}

/** Entrenador asignado al cliente, si tiene uno. */
export function useMyTrainer(memberId?: string) {
  return useQuery({
    queryKey: ['my-trainer', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<MyTrainer | null> => trainerApi.myTrainer(),
  });
}

/** Rutina personalizada que el propio entrenador del cliente le asignó. */
export function useMyRoutine(memberId?: string) {
  return useQuery({
    queryKey: ['my-routine', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<RoutineWithExercises | null> => routinesApi.mine(),
  });
}

/** Las rutinas genéricas por grupo muscular — solo se muestran cuando el
 * cliente todavía no tiene rutina personalizada de un entrenador. */
export function useGenericRoutines() {
  return useQuery({
    queryKey: ['generic-routines'],
    queryFn: async (): Promise<RoutineWithExercises[]> => routinesApi.generic(),
  });
}

/** Historial de rutinas completadas por el cliente, para el calendario. */
export function useWorkoutHistory(memberId?: string) {
  return useQuery({
    queryKey: ['workout-history', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<WorkoutLog[]> => workoutLogsApi.mine(),
  });
}

/** Marca la rutina del día como completada — alimenta el calendario. */
export function useLogWorkoutCompletion(memberId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ routineId, routineTitle }: { routineId: string; routineTitle: string }) => {
      if (!memberId) throw new Error('Falta el id del cliente.');
      return workoutLogsApi.log(routineId, routineTitle);
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
    queryFn: async (): Promise<TrainerClientMember[]> => trainerApi.myClients(),
  });
}

/** Rutina personalizada de un cliente específico, vista/editada por su entrenador. */
export function useClientRoutine(memberId?: string) {
  return useQuery({
    queryKey: ['client-routine', memberId],
    enabled: !!memberId,
    queryFn: async (): Promise<RoutineWithExercises | null> => routinesApi.forClient(memberId as string),
  });
}

/** Guarda (crea o actualiza) la rutina personalizada de un cliente — usada
 * por el editor de rutina del entrenador. */
export function useSaveClientRoutine(memberId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { title: string; goal: string | null; exercises: RoutineExerciseInput[] }) => {
      if (!memberId) throw new Error('Falta el id del cliente.');
      return routinesApi.saveForClient(memberId, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-routine', memberId] });
    },
  });
}

export type ScanClientResult =
  | { status: 'assigned'; clientName: string }
  | { status: 'invalid_or_expired' };

/**
 * Resuelve el código QR escaneado por el entrenador (el mismo QR de acceso
 * rotativo que el cliente ve en su app) y, si pertenece a un cliente
 * vigente de este mismo gimnasio, lo vincula a este entrenador —
 * POST /trainer/link-client hace toda la validación server-side.
 */
export function useAssignClientFromScan(trainerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rawCode: string): Promise<ScanClientResult> => {
      const { error, clientId } = await trainerApi.linkClient(rawCode);
      if (error || !clientId) return { status: 'invalid_or_expired' };
      const member = await membersApi.byId(clientId);
      const clientName = member ? `${member.firstName} ${member.lastName}` : 'Cliente';
      return { status: 'assigned', clientName };
    },
    onSuccess: (result) => {
      if (result.status === 'assigned') {
        queryClient.invalidateQueries({ queryKey: ['my-clients', trainerId] });
      }
    },
  });
}

export { ApiError };
