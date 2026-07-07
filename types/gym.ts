export type Currency = 'MXN' | 'USD';

export interface Gym {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: Currency;
  memberPrefix: string;
  logoUrl?: string;
  primaryColor: string;
  active: boolean;
  subscriptionStatus: 'active' | 'trial' | 'suspended' | 'cancelled';
  memberCount: number;
  createdAt: string;
}
