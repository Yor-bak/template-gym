import { staff } from '@/data/staff';
import type { AuthUser } from '@/lib/auth';

// Usuarios de acceso rápido para el login simulado — uno por rol, tomados de
// apps/web/data/staff.ts para que el resto de los datos demo (pagos
// registrados por, auditoría, etc.) queden consistentes con quien inició sesión.
const DEMO_STAFF_IDS = ['staff_001', 'staff_002', 'staff_platform'];

export const DEMO_AUTH_USERS: AuthUser[] = DEMO_STAFF_IDS.map((id) => {
  const s = staff.find((item) => item.id === id)!;
  return {
    id: s.id,
    gymId: s.gymId ?? null,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    role: s.role as AuthUser['role'],
  };
});
