export type MemberStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'blocked'
  | 'temporary_access'
  | 'pending_activation'
  | 'archived';

export type MobileAppStatus =
  | 'not_activated'
  | 'pending'
  | 'activated'
  | 'device_linked'
  | 'suspended';

export interface Member {
  id: string;
  gymId: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  photoUrl?: string;
  membershipId: string;
  status: MemberStatus;
  startDate: string;
  expirationDate: string;
  lastPaymentDate?: string;
  lastAccessDate?: string;
  blockedAt?: string;
  blockedBy?: string;
  blockReason?: string;
  temporaryAccessUntil?: string;
  temporaryAccessBy?: string;
  temporaryAccessReason?: string;
  mobileAppStatus: MobileAppStatus;
  activationCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}
