import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MemberStatus, AccessResult, PaymentStatus, PaymentMethod, InventoryArea, InventoryStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
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
