export type PaymentAccountType = 'clabe' | 'account' | 'card' | 'reference';

export interface CustomerSupportSettings {
  customerNumber: string;
  paymentAccount: {
    holderName: string;
    bankName: string;
    type: PaymentAccountType;
    value: string;
  };
  support: {
    phone: string;
    whatsappUrl: string;
    businessHours: string;
  };
}
