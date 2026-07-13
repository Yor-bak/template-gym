export interface CartLine {
  productId: string;
  productName: string;
  barcode?: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

export type CartFeedback =
  | { type: 'not_found'; code: string }
  | { type: 'inactive'; productName: string }
  | { type: 'no_price'; productName: string }
  | { type: 'max_stock'; productName: string; maxStock: number }
  | { type: 'incremented'; productName: string; quantity: number }
  | { type: 'added'; productName: string };
