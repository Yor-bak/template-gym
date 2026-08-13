// Traduce las respuestas camelCase de apps/api (CamelModel, "no negociable"
// según REQUERIMIENTOS_BACKEND_GYM.md §6 — ver apps/api/app/core/camel_model.py)
// a los tipos que ya usan las pantallas (@/types) — mismo criterio que los
// mapeos DbX -> X que ya existían para Supabase en lib/store.tsx, para no
// tocar cada componente.
import type { AccessLog, AccessResult, InventoryItem, InventorySale, Member, Membership } from '@/types';

export interface ApiMember {
  id: string;
  gymId: string;
  userId: string | null;
  memberNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: string;
  startDate: string | null;
  expirationDate: string | null;
  mobileAppStatus: string;
  activationCode: string | null;
  createdAt: string;
}

// membershipId/createdBy no vienen en MemberRead (apps/api todavía no los
// expone) — se dejan en '' a propósito, documentado en
// docs/BACKEND_PREPARATION_AUDIT_GYM.md como pendiente de backend.
export function mapMember(m: ApiMember): Member {
  return {
    id: m.id,
    gymId: m.gymId,
    memberNumber: m.memberNumber,
    firstName: m.firstName,
    lastName: m.lastName,
    phone: m.phone,
    email: m.email ?? undefined,
    membershipId: '',
    status: m.status as Member['status'],
    startDate: m.startDate ?? '',
    expirationDate: m.expirationDate ?? '',
    mobileAppStatus: m.mobileAppStatus as Member['mobileAppStatus'],
    activationCode: m.activationCode ?? undefined,
    createdAt: m.createdAt,
    createdBy: '',
  };
}

export interface ApiMembershipPlan {
  id: string;
  gymId: string;
  name: string;
  price: number;
  duration: number;
  durationUnit: string;
  toleranceDays: number;
  description: string | null;
  active: boolean;
}

// memberCount/createdAt no vienen en MembershipPlanRead — mismo criterio que
// mapMember: se dejan en un valor neutro, no inventado.
export function mapMembership(p: ApiMembershipPlan): Membership {
  return {
    id: p.id,
    gymId: p.gymId,
    name: p.name,
    price: p.price,
    duration: p.duration,
    durationUnit: p.durationUnit as Membership['durationUnit'],
    toleranceDays: p.toleranceDays,
    description: p.description ?? undefined,
    active: p.active,
    memberCount: 0,
    createdAt: '',
  };
}

export interface ApiInventoryItem {
  id: string;
  gymId: string;
  area: string;
  name: string;
  sku: string | null;
  quantity: number;
  salePrice: number | null;
  status: string;
  createdAt: string;
}

export function mapInventoryItem(i: ApiInventoryItem): InventoryItem {
  return {
    id: i.id,
    gymId: i.gymId,
    area: i.area as InventoryItem['area'],
    sku: i.sku ?? undefined,
    name: i.name,
    quantity: i.quantity,
    salePrice: i.salePrice ?? undefined,
    status: i.status as InventoryItem['status'],
  };
}

export interface ApiInventorySale {
  id: string;
  gymId: string;
  memberId: string | null;
  subtotal: number;
  total: number;
  method: string;
  status: string;
  notes: string | null;
  soldAt: string;
  items: { id: string; itemId: string; quantity: number; unitPrice: number; subtotal: number }[];
}

// registeredBy no viene en InventorySaleRead; productName se resuelve contra
// el inventario ya cargado en el store (la API solo regresa itemId).
export function mapInventorySale(s: ApiInventorySale, itemNameById: Map<string, string>): InventorySale {
  return {
    id: s.id,
    gymId: s.gymId,
    items: s.items.map((line) => ({
      productId: line.itemId,
      productName: itemNameById.get(line.itemId) ?? 'Producto',
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      subtotal: line.subtotal,
    })),
    subtotal: s.subtotal,
    total: s.total,
    method: s.method as InventorySale['method'],
    status: s.status as InventorySale['status'],
    soldAt: s.soldAt,
    registeredBy: '',
    memberId: s.memberId ?? undefined,
    notes: s.notes ?? undefined,
  };
}

export interface ApiAccessLog {
  id: string;
  gymId: string;
  memberId: string | null;
  result: string;
  reader: string;
  scannedAt: string;
}

// El backend emite "invalid_token"; el tipo AccessResult del frontend usa
// "invalid_qr" — se normaliza aquí, no se cambia el tipo compartido.
// AccessLogRead no incluye memberNumber/memberName (backend todavía no lo
// expone) — se resuelven aquí contra la lista de miembros ya cargada en el
// store en vez de dejarlos en blanco, ya que sí tenemos memberId.
export function mapAccessLog(
  l: ApiAccessLog,
  memberById: Map<string, { memberNumber: string; name: string }> = new Map()
): AccessLog {
  const result = l.result === 'invalid_token' ? 'invalid_qr' : (l.result as AccessResult);
  const member = l.memberId ? memberById.get(l.memberId) : undefined;
  return {
    id: l.id,
    gymId: l.gymId,
    memberId: l.memberId ?? undefined,
    memberNumber: member?.memberNumber,
    memberName: member?.name,
    result,
    timestamp: l.scannedAt,
    reader: l.reader,
  };
}
