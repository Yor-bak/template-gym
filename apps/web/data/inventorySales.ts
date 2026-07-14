import { InventorySale } from '@/types';

// Reutiliza los productos ya sembrados en data/inventory.ts (área "tienda") —
// no se inventan productos nuevos para estos ejemplos. Cada venta tiene una
// sola línea (items[]) porque son datos históricos previos al carrito
// multi-producto; el carrito nuevo genera ventas con varias líneas.
export const inventorySales: InventorySale[] = [
  {
    id: 'isale_001', gymId: 'gym_001',
    items: [{ productId: 'inv_016', productName: 'Botella deportiva 750ml', barcode: 'ACC-BOT-01', quantity: 2, unitPrice: 120, subtotal: 240 }],
    subtotal: 240, total: 240, method: 'cash', status: 'confirmed',
    soldAt: '2026-07-10T09:15:00Z', registeredBy: 'María González López',
  },
  {
    id: 'isale_002', gymId: 'gym_001',
    items: [{ productId: 'inv_014', productName: 'Proteína Whey 1kg (Vainilla)', barcode: 'SUP-PRO-01', quantity: 1, unitPrice: 750, subtotal: 750 }],
    subtotal: 750, total: 750, method: 'card', status: 'confirmed',
    soldAt: '2026-07-10T11:40:00Z', registeredBy: 'María González López', memberId: 'mem_001', memberName: 'Alejandro Torres Vega',
  },
  {
    id: 'isale_003', gymId: 'gym_001',
    items: [{ productId: 'inv_018', productName: 'Barra energética (caja 12)', barcode: 'SUP-BAR-03', quantity: 3, unitPrice: 300, subtotal: 900 }],
    subtotal: 900, total: 900, method: 'cash', status: 'confirmed',
    soldAt: '2026-07-09T18:05:00Z', registeredBy: 'Carlos Mendoza Ruiz',
  },
  {
    id: 'isale_004', gymId: 'gym_001',
    items: [
      { productId: 'inv_017', productName: 'Guantes de entrenamiento', barcode: 'ACC-GUA-02', quantity: 1, unitPrice: 220, subtotal: 220 },
      { productId: 'inv_016', productName: 'Botella deportiva 750ml', barcode: 'ACC-BOT-01', quantity: 1, unitPrice: 120, subtotal: 120 },
    ],
    subtotal: 340, total: 340, method: 'transfer', status: 'confirmed',
    soldAt: '2026-07-09T16:20:00Z', registeredBy: 'Carlos Mendoza Ruiz', memberId: 'mem_004', memberName: 'Valentina Morales Castro',
  },
  {
    id: 'isale_005', gymId: 'gym_001',
    items: [{ productId: 'inv_015', productName: 'Creatina 300g', barcode: 'SUP-CRE-02', quantity: 1, unitPrice: 480, subtotal: 480 }],
    subtotal: 480, total: 480, method: 'cash', status: 'cancelled',
    soldAt: '2026-07-08T10:00:00Z', registeredBy: 'María González López',
    cancelledBy: 'Carlos Mendoza Ruiz', cancelReason: 'Cliente se arrepintió antes de retirar el producto', cancelledAt: '2026-07-08T10:05:00Z',
  },
  {
    id: 'isale_006', gymId: 'gym_001',
    items: [{ productId: 'inv_014', productName: 'Proteína Whey 1kg (Vainilla)', barcode: 'SUP-PRO-01', quantity: 1, unitPrice: 750, subtotal: 700 }],
    subtotal: 700, total: 700, method: 'card', status: 'corrected',
    soldAt: '2026-07-07T12:30:00Z', registeredBy: 'Carlos Mendoza Ruiz',
  },
];
