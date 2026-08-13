import * as SecureStore from 'expo-secure-store';

import type {
  Member,
  MyTrainer,
  QrToken,
  Routine,
  TrainerClientMember,
  User,
  WorkoutLog,
} from '@/types/database';

// URL real del backend en el Pi (túnel de Cloudflare) — configurable por
// entorno para poder apuntar a un backend local mientras se desarrolla.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://gym-api.j2ec.net';

const TOKEN_KEY = 'gym_access_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

/** Mensaje de error legible para el usuario, pero que nunca oculta la causa
 * real (timeout, TLS, DNS, etc.) — antes decía siempre "No se pudo conectar
 * con el servidor" sin importar la causa, lo que hacía imposible diagnosticar
 * fallos de red reales desde un APK de producción sin logs conectados. */
function describeNetworkError(err: unknown): string {
  const detail = err instanceof Error ? err.message : String(err);
  return `No se pudo conectar con el servidor (${detail}).`;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = (data && (data.detail as string)) || `Error ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  login: async (
    phone: string,
    password: string
  ): Promise<{ error: string | null; user?: User; token?: string }> => {
    try {
      const res = await request<{ access_token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: { phone, password },
        auth: false,
      });
      await setToken(res.access_token);
      return { error: null, user: res.user, token: res.access_token };
    } catch (err) {
      if (err instanceof ApiError) return { error: err.message };
      return { error: describeNetworkError(err) };
    }
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ error: string | null }> => {
    try {
      await request('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      return { error: null };
    } catch (err) {
      if (err instanceof ApiError) return { error: err.message };
      return { error: describeNetworkError(err) };
    }
  },

  signOut: async (): Promise<void> => {
    await clearToken();
  },

  me: async (): Promise<User> => request<User>('/users/me'),
};

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export const membersApi = {
  /** GET /members está scoped por rol — como cliente devuelve solo el propio. */
  mine: async (): Promise<Member | null> => {
    const members = await request<Member[]>('/members');
    return members[0] ?? null;
  },
  byId: async (memberId: string): Promise<Member | null> => {
    try {
      return await request<Member>(`/members/${memberId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
};

// ---------------------------------------------------------------------------
// Access (QR)
// ---------------------------------------------------------------------------

export const accessApi = {
  myQrToken: async (): Promise<QrToken> =>
    request<QrToken>('/access/my-qr-token', { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Trainer / clientes
// ---------------------------------------------------------------------------

export const trainerApi = {
  myClients: async (): Promise<TrainerClientMember[]> => request<TrainerClientMember[]>('/trainer/my-clients'),
  myTrainer: async (): Promise<MyTrainer | null> => request<MyTrainer | null>('/trainer/my-trainer'),
  linkClient: async (token: string): Promise<{ error: string | null; clientId?: string }> => {
    try {
      const link = await request<{ clientId: string }>('/trainer/link-client', {
        method: 'POST',
        body: { token },
      });
      return { error: null, clientId: link.clientId };
    } catch (err) {
      if (err instanceof ApiError) return { error: err.message };
      return { error: describeNetworkError(err) };
    }
  },
};

// ---------------------------------------------------------------------------
// Rutinas
// ---------------------------------------------------------------------------

export interface RoutineExerciseInput {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number | null;
  orderIndex: number;
  notes: string | null;
  catalogId: string | null;
}

export const routinesApi = {
  mine: async (): Promise<Routine | null> => request<Routine | null>('/routines/mine'),
  generic: async (): Promise<Routine[]> => request<Routine[]>('/routines/generic'),
  forClient: async (memberId: string): Promise<Routine | null> =>
    request<Routine | null>(`/routines/client/${memberId}`),
  saveForClient: async (
    memberId: string,
    payload: { title: string; goal: string | null; exercises: RoutineExerciseInput[] }
  ): Promise<Routine> =>
    request<Routine>(`/routines/client/${memberId}`, { method: 'PUT', body: payload }),
};

export const workoutLogsApi = {
  log: async (routineId: string | null, routineTitle: string): Promise<WorkoutLog> =>
    request<WorkoutLog>('/workout-logs', { method: 'POST', body: { routineId, routineTitle } }),
  mine: async (): Promise<WorkoutLog[]> => request<WorkoutLog[]>('/workout-logs/mine'),
};
