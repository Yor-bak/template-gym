import type { PaymentMethod } from './payment';

export interface SaleItem {
  productId: string;
  productName: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InventorySale {
  id: string;
  gymId: string;
  items: SaleItem[];
  subtotal: number;
  total: number;
  method: PaymentMethod;
  status: 'confirmed' | 'cancelled' | 'corrected';
  soldAt: string;
  registeredBy: string;
  memberId?: string;
  memberName?: string;
  notes?: string;
  cancelledBy?: string;
  cancelReason?: string;
  cancelledAt?: string;
}
