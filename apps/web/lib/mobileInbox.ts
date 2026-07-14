'use client';
// Envío de facturas/comprobantes a la app móvil del cliente. En modo demo se
// persisten en localStorage (la "bandeja" que la app móvil leería vía el
// backend compartido en producción). Expone además un hook para consultarlas.
import { useEffect, useState } from 'react';

const KEY = 'mobile_app_invoices';
const EVENT = 'mobile-invoices-changed';

export interface MobileInvoice {
  id: string;
  memberId: string;
  memberName: string;
  saleId: string;
  total: number;
  itemsSummary: string;
  method: string;
  sentAt: string;
}

function readAll(): MobileInvoice[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]') as MobileInvoice[];
  } catch {
    return [];
  }
}

export function sendInvoiceToMobile(invoice: MobileInvoice): void {
  try {
    const all = readAll();
    window.localStorage.setItem(KEY, JSON.stringify([invoice, ...all]));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // no-op
  }
}

export function useMobileInvoices(memberId?: string): MobileInvoice[] {
  const [invoices, setInvoices] = useState<MobileInvoice[]>([]);
  useEffect(() => {
    const sync = () => setInvoices(readAll());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return memberId ? invoices.filter(i => i.memberId === memberId) : invoices;
}
