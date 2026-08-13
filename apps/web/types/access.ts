import type { ScanSource } from './scan';

export type AccessResult =
  | 'authorized'
  | 'expiring_soon'
  | 'expired'
  | 'blocked'
  | 'invalid_qr'
  | 'temporary_access'
  | 'already_entered'
  | 'manual';

export interface AccessLog {
  id: string;
  gymId: string;
  memberId?: string;
  memberNumber?: string;
  memberName?: string;
  membershipName?: string;
  result: AccessResult;
  timestamp: string;
  reader: string;
  membershipExpirationDate?: string;
  daysUntilExpiration?: number;
  daysSinceExpiration?: number;
  lastPaymentDate?: string;
  blockReason?: string;
  manualBy?: string;
  manualReason?: string;
  rawQrCode?: string;
  source?: ScanSource;
}
