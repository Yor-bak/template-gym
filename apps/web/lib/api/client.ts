// Cliente HTTP para apps/api (backend FastAPI real). El contrato de error es
// uniforme en todo el backend — ver apps/api/app/core/exceptions.py
// (CRIT-02, QA_AUDIT_REPORT_GYM.md): cualquier error, esperado o no, responde
// JSON {"detail": "mensaje legible"}. Este cliente confía en ese contrato en
// vez de intentar interpretar cada código de estado por separado.

const TOKEN_KEY = 'gym_api_token';

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error('NEXT_PUBLIC_API_URL no está configurado.');
  return url.replace(/\/$/, '');
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // no-op
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Se dispara cuando el backend rechaza el token actual (401) — el
// AuthProvider real se suscribe a esto para forzar logout sin que cada
// llamador tenga que revisar el status code a mano.
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;
export function onUnauthorized(listener: UnauthorizedListener | null): void {
  unauthorizedListener = listener;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${baseUrl()}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    if (res.status === 401) unauthorizedListener?.();
    const message = (body && typeof body === 'object' && 'detail' in body)
      ? typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
      : `Error ${res.status} al conectar con el servidor.`;
    throw new ApiError(res.status, message);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
};
