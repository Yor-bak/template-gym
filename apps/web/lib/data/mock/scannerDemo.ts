// Códigos de ejemplo para el botón de desarrollo "Simular código" del
// escáner global. Se toman directamente de los datos sembrados en
// apps/web/data/ (mismos memberNumber/sku que ya se ven en el resto del
// dashboard), no se inventan aparte, para que el resultado del escaneo
// coincida con lo que el usuario ve en Miembros/Inventario.
import { members } from '@/data/members';
import { inventory } from '@/data/inventory';

export interface DemoScanCode {
  label: string;
  code: string;
}

function findMemberNumber(status: string): string | undefined {
  return members.find((m) => m.status === status)?.memberNumber;
}

export const DEMO_ACCESS_CODES: DemoScanCode[] = [
  { label: 'Miembro activo', code: findMemberNumber('active') ?? 'AF-00001' },
  { label: 'Próximo a vencer', code: findMemberNumber('expiring_soon') ?? 'AF-00097' },
  { label: 'Miembro vencido', code: findMemberNumber('expired') ?? 'AF-00099' },
  { label: 'Miembro bloqueado', code: findMemberNumber('blocked') ?? 'AF-00098' },
  { label: 'Activación temporal', code: findMemberNumber('temporary_access') ?? 'AF-00096' },
  { label: 'QR inválido', code: `QR-INVALIDO-${Math.random().toString(36).slice(2, 6).toUpperCase()}` },
].filter((c) => !!c.code);

const storeItems = inventory.filter((i) => i.area === 'tienda' && i.sku);

export const DEMO_INVENTORY_CODES: DemoScanCode[] = [
  ...storeItems.slice(0, 2).map((i) => ({ label: i.name, code: i.sku! })),
  { label: 'Producto no registrado', code: 'SKU-NO-EXISTE-001' },
];
