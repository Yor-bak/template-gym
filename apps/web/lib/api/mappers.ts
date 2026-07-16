// Traduce las respuestas snake_case de apps/api a los tipos camelCase que ya
// usan las pantallas (@/types) — mismo criterio que los mapeos DbX -> X que
// ya existían para Supabase en lib/store.tsx, para no tocar cada componente.
import type { AccessLog, AccessResult, InventoryItem, InventorySale, Member, Membership } from '@/types';

export interface ApiMember {
  id: string;
  gym_id: string;
  user_id: string | null;
  member_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  status: string;
  start_date: string | null;
  expiration_date: string | null;
  mobile_app_status: string;
  activation_code: string | null;
  created_at: string;
}

// membershipId/createdBy no vienen en MemberRead (apps/api todavía no los
// expone) — se dejan en '' a propósito, documentado en
// docs/BACKEND_PREPARATION_AUDIT_GYM.md como pendiente de backend.
export function mapMember(m: ApiMember): Member {
  return {
    id: m.id,
    gymId: m.gym_id,
    memberNumber: m.member_number,
    firstName: m.first_name,
    lastName: m.last_name,
    phone: m.phone,
    email: m.email ?? undefined,
    membershipId: '',
    status: m.status as Member['status'],
    startDate: m.start_date ?? '',
    expirationDate: m.expiration_date ?? '',
    mobileAppStatus: m.mobile_app_status as Member['mobileAppStatus'],
    activationCode: m.activation_code ?? undefined,
    createdAt: m.created_at,
    createdBy: '',
  };
}

export interface ApiMembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  price: number;
  duration: number;
  duration_unit: string;
  tolerance_days: number;
  description: string | null;
  active: boolean;
}

// memberCount/createdAt no vienen en MembershipPlanRead — mismo criterio que
// mapMember: se dejan en un valor neutro, no inventado.
export function mapMembership(p: ApiMembershipPlan): Membership {
  return {
    id: p.id,
    gymId: p.gym_id,
    name: p.name,
    price: p.price,
    duration: p.duration,
    durationUnit: p.duration_unit as Membership['durationUnit'],
    toleranceDays: p.tolerance_days,
    description: p.description ?? undefined,
    active: p.active,
    memberCount: 0,
    createdAt: '',
  };
}

export interface ApiInventoryItem {
  id: string;
  gym_id: string;
  area: string;
  name: string;
  sku: string | null;
  quantity: number;
  sale_price: number | null;
  status: string;
  created_at: string;
}

export function mapInventoryItem(i: ApiInventoryItem): InventoryItem {
  return {
    id: i.id,
    gymId: i.gym_id,
    area: i.area as InventoryItem['area'],
    sku: i.sku ?? undefined,
    name: i.name,
    quantity: i.quantity,
    salePrice: i.sale_price ?? undefined,
    status: i.status as InventoryItem['status'],
  };
}

export interface ApiInventorySale {
  id: string;
  gym_id: string;
  member_id: string | null;
  subtotal: number;
  total: number;
  method: string;
  status: string;
  notes: string | null;
  sold_at: string;
  items: { id: string; item_id: string; quantity: number; unit_price: number; subtotal: number }[];
}

// registeredBy no viene en InventorySaleRead; productName se resuelve contra
// el inventario ya cargado en el store (la API solo regresa item_id).
export function mapInventorySale(s: ApiInventorySale, itemNameById: Map<string, string>): InventorySale {
  return {
    id: s.id,
    gymId: s.gym_id,
    items: s.items.map((line) => ({
      productId: line.item_id,
      productName: itemNameById.get(line.item_id) ?? 'Producto',
      quantity: line.quantity,
      unitPrice: line.unit_price,
      subtotal: line.subtotal,
    })),
    subtotal: s.subtotal,
    total: s.total,
    method: s.method as InventorySale['method'],
    status: s.status as InventorySale['status'],
    soldAt: s.sold_at,
    registeredBy: '',
    memberId: s.member_id ?? undefined,
    notes: s.notes ?? undefined,
  };
}

export interface ApiAccessLog {
  id: string;
  gym_id: string;
  member_id: string | null;
  result: string;
  reader: string;
  scanned_at: string;
}

// El backend emite "invalid_token"; el tipo AccessResult del frontend usa
// "invalid_qr" — se normaliza aquí, no se cambia el tipo compartido.
// AccessLogRead no incluye member_number/member_name (backend todavía no lo
// expone) — se resuelven aquí contra la lista de miembros ya cargada en el
// store en vez de dejarlos en blanco, ya que sí tenemos member_id.
export function mapAccessLog(
  l: ApiAccessLog,
  memberById: Map<string, { memberNumber: string; name: string }> = new Map()
): AccessLog {
  const result = l.result === 'invalid_token' ? 'invalid_qr' : (l.result as AccessResult);
  const member = l.member_id ? memberById.get(l.member_id) : undefined;
  return {
    id: l.id,
    gymId: l.gym_id,
    memberId: l.member_id ?? undefined,
    memberNumber: member?.memberNumber,
    memberName: member?.name,
    result,
    timestamp: l.scanned_at,
    reader: l.reader,
  };
}
