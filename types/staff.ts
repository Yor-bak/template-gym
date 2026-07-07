export type StaffRole = 'admin' | 'receptionist' | 'platform_admin';

export interface Staff {
  id: string;
  gymId?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  active: boolean;
  lastLogin?: string;
  paymentsRegistered: number;
  actionsCount: number;
  createdAt: string;
  password?: string; // only for simulation
}
