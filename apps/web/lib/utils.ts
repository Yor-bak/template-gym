import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MemberStatus, AccessResult, PaymentStatus, PaymentMethod, InventoryArea, InventoryStatus } from '@/types';

export type ExpirationPriority = 'today' | 'tomorrow' | 'soon' | 'later';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Deja solo dígitos — permite comparar "55 1234 5678", "55-1234-5678" y "+52 55 1234 5678" entre sí. */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** Formatos comunes de México: 10 dígitos locales, u opcionalmente con lada 52/+52 (12-13 dígitos). */
export function isValidMexicanPhone(value: string): boolean {
  const digits = normalizePhone(value);
  if (digits.length === 10) return true;
  if (digits.length === 12 && digits.startsWith('52')) return true;
  if (digits.length === 13 && digits.startsWith('521')) return true;
  return false;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

export function formatDate(dateStr: string): string {
  try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es }); } catch { return dateStr; }
}

export function formatDateTime(dateStr: string): string {
  try { return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm', { locale: es }); } catch { return dateStr; }
}

export function formatTime(dateStr: string): string {
  try { return format(parseISO(dateStr), 'HH:mm', { locale: es }); } catch { return dateStr; }
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date());
}

export function daysAgo(dateStr: string): number {
  return differenceInDays(new Date(), parseISO(dateStr));
}

export function timeAgo(dateStr: string): string {
  try { return formatDistanceToNow(parseISO(dateStr), { locale: es, addSuffix: true }); } catch { return dateStr; }
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function getMemberStatusLabel(status: MemberStatus): string {
  const labels: Record<MemberStatus, string> = {
    active: 'Activo',
    expiring_soon: 'Por vencer',
    expired: 'Vencido',
    blocked: 'Bloqueado',
    temporary_access: 'Acceso temporal',
    pending_activation: 'Pendiente de activación',
    archived: 'Archivado',
  };
  return labels[status];
}

export function getAccessResultLabel(result: AccessResult): string {
  const labels: Record<AccessResult, string> = {
    authorized: 'Autorizado',
    expiring_soon: 'Por vencer',
    expired: 'Vencido',
    blocked: 'Bloqueado',
    invalid_qr: 'QR inválido',
    temporary_access: 'Acceso temporal',
    manual: 'Manual',
  };
  return labels[result];
}

// Único punto de conversión entre el estado de un miembro (MemberStatus) y el
// resultado de un intento de acceso (AccessResult) — son uniones distintas
// (p. ej. "active" no es un AccessResult válido, el equivalente es
// "authorized") y mezclarlas con un cast directo rompe cualquier código que
// indexe por AccessResult (ver MembershipStatusBadge).
export function getAccessResultFromMemberStatus(status: MemberStatus): AccessResult {
  const map: Record<MemberStatus, AccessResult> = {
    active: 'authorized',
    expiring_soon: 'expiring_soon',
    expired: 'expired',
    blocked: 'blocked',
    temporary_access: 'temporary_access',
    pending_activation: 'invalid_qr',
    archived: 'invalid_qr',
  };
  return map[status];
}

/** Prioridad visual para un vencimiento según los días restantes (>=0). */
export function getExpirationPriority(daysRemaining: number): ExpirationPriority {
  if (daysRemaining <= 0) return 'today';
  if (daysRemaining === 1) return 'tomorrow';
  if (daysRemaining <= 3) return 'soon';
  return 'later';
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };
  return labels[method];
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = { confirmed: 'Confirmado', cancelled: 'Cancelado', corrected: 'Corregido', pending: 'Pendiente' };
  return labels[status];
}

export function getInventoryAreaLabel(area: InventoryArea): string {
  const labels: Record<InventoryArea, string> = {
    cardio: 'Cardio',
    fuerza: 'Fuerza',
    peso_libre: 'Peso libre',
    tienda: 'Tiendita',
  };
  return labels[area];
}

export function getInventoryStatusLabel(status: InventoryStatus): string {
  const labels: Record<InventoryStatus, string> = {
    operating: 'Operando',
    maintenance: 'En mantenimiento',
    out_of_service: 'Fuera de servicio',
  };
  return labels[status];
}

export function generateMemberNumber(prefix: string, count: number): string {
  return `${prefix}-${String(count).padStart(5, '0')}`;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Genera y descarga un CSV a partir de un arreglo de objetos planos. */
export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (typeof window === 'undefined' || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  // BOM al inicio para que Excel detecte UTF-8 y no rompa los acentos.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
