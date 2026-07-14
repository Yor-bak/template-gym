import type { PaymentMethod, PaymentStatus } from './payment';

export type IncomeSource = 'membership' | 'inventory';

export interface IncomeTransaction {
  id: string;
  source: IncomeSource;
  concept: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  occurredAt: string;
  responsibleName?: string;
  memberId?: string;
  memberName?: string;
  memberNumber?: string;
  reference?: string;
  itemCount?: number;
}
