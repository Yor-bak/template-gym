export type StaffRole = 'super_admin' | 'admin' | 'receptionist' | 'platform_admin';

export interface Staff {
  id: string;
  gymId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: StaffRole;
  active: boolean;
  /** Titular del contrato del gimnasio (super_admin). */
  isContractHolder?: boolean;
  lastLogin?: string;
  paymentsRegistered: number;
  actionsCount: number;
  createdAt: string;
  /** Solo para el login simulado en modo demo. */
  password?: string;
}
