export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';
export type PaymentStatus = 'confirmed' | 'cancelled' | 'corrected' | 'pending';

export interface Payment {
  id: string;
  gymId: string;
  memberId: string;
  memberNumber: string;
  memberName: string;
  membershipId: string;
  membershipName: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  periodStart: string;
  periodEnd: string;
  reference?: string;
  notes?: string;
  registeredBy: string;
  cancelledBy?: string;
  cancelReason?: string;
  cancelledAt?: string;
  correctionOf?: string;
}
