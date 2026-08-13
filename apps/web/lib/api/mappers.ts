// Traduce las respuestas camelCase de apps/api (CamelModel, "no negociable"
// según REQUERIMIENTOS_BACKEND_GYM.md §6 — ver apps/api/app/core/camel_model.py)
// a los tipos que ya usan las pantallas (@/types) — mismo criterio que los
// mapeos DbX -> X que ya existían para Supabase en lib/store.tsx, para no
// tocar cada componente.
import type { AccessLog, AccessResult, InventoryItem, InventorySale, Member, Membership, Payment, PaymentMethod } from '@/types';

export interface ApiMember {
  id: string;
  gymId: string;
  userId: string | null;
  memberNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  membershipPlanId: string | null;
  status: string;
  startDate: string | null;
  expirationDate: string | null;
  mobileAppStatus: string;
  activationCode: string | null;
  createdAt: string;
}

// createdBy no viene en MemberRead (apps/api todavía no lo expone) — se deja
// en '' a propósito, documentado en docs/BACKEND_PREPARATION_AUDIT_GYM.md
// como pendiente de backend. membershipPlanId sí llegó con el módulo de
// pagos (necesario para que PaymentModal sepa qué plan tiene el miembro).
export function mapMember(m: ApiMember): Member {
  return {
    id: m.id,
    gymId: m.gymId,
    memberNumber: m.memberNumber,
    firstName: m.firstName,
    lastName: m.lastName,
    phone: m.phone,
    email: m.email ?? undefined,
    membershipId: m.membershipPlanId ?? '',
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
export interface ApiPayment {
  id: string;
  gymId: string;
  memberId: string;
  amount: number;
  paidAt: string;
  coversUntil: string;
  paymentMethod: string | null;
  recordedBy: string | null;
  createdAt: string;
}

// PaymentRead es deliberadamente delgado (POST /members/{id}/payments deriva
// todo lo demás server-side, ver REQUERIMIENTOS_BACKEND_GYM.md §6) — varios
// campos del tipo Payment del frontend no tienen contraparte real todavía:
// - memberNumber/memberName/membershipName: se resuelven aquí contra los
//   miembros/membresías ya cargados en el store (mismo criterio que
//   mapAccessLog con memberById).
// - periodStart: el backend no expone la fecha base que usó para el cálculo
//   (podría ser paidAt o el expirationDate previo si el pago se apiló) — se
//   aproxima a paidAt, documentado como límite conocido.
// - status: no existe cancelación/corrección todavía (PAYMENTS_PENDING para
//   cancelPayment) — siempre 'confirmed'.
// - registeredBy: el backend solo da el uuid del usuario (recordedBy), no
//   un nombre resuelto — se deja en '' igual que registeredBy en
//   mapInventorySale.
export function mapPayment(
  p: ApiPayment,
  context: { member?: Pick<Member, 'memberNumber' | 'firstName' | 'lastName' | 'membershipId'>; membershipName?: string } = {}
): Payment {
  const { member, membershipName } = context;
  return {
    id: p.id,
    gymId: p.gymId,
    memberId: p.memberId,
    memberNumber: member?.memberNumber ?? '',
    memberName: member ? `${member.firstName} ${member.lastName}`.trim() : '',
    membershipId: member?.membershipId ?? '',
    membershipName: membershipName ?? '',
    amount: p.amount,
    method: (p.paymentMethod ?? 'other') as PaymentMethod,
    status: 'confirmed',
    paymentDate: p.paidAt,
    periodStart: p.paidAt,
    periodEnd: p.coversUntil,
    registeredBy: '',
  };
}

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
