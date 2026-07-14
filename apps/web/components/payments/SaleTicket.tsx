'use client';
import { X, Printer, Copy, Check, Receipt } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency, formatDate, formatTime, getPaymentMethodLabel } from '@/lib/utils';
import type { InventorySale } from '@/types';

interface SaleTicketProps {
  sale: InventorySale;
  onClose: () => void;
  onNewSale: () => void;
}

export function SaleTicket({ sale, onClose, onNewSale }: SaleTicketProps) {
  const [copied, setCopied] = useState(false);
  const folio = sale.id.replace('isale_', '').slice(-8).toUpperCase();

  const summaryText = [
    `Ticket #${folio}`,
    `${formatDate(sale.soldAt)} ${formatTime(sale.soldAt)}`,
    ...sale.items.map((i) => `${i.quantity} × ${i.productName} — ${formatCurrency(i.subtotal)}`),
    `Total: ${formatCurrency(sale.total)}`,
    `Método: ${getPaymentMethodLabel(sale.method)}`,
    sale.memberName ? `Cliente: ${sale.memberName}` : 'Cliente: mostrador',
    `Responsable: ${sale.registeredBy}`,
  ].join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard no disponible — no es crítico.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Venta completada</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 font-mono text-xs text-gray-700 space-y-2">
          <div className="text-center">
            <p className="font-semibold text-gray-900">Folio #{folio}</p>
            <p className="text-gray-400">{formatDate(sale.soldAt)} · {formatTime(sale.soldAt)}</p>
          </div>
          <div className="border-t border-dashed border-gray-200 pt-2 space-y-1">
            {sale.items.map((i, idx) => (
              <div key={idx} className="flex justify-between gap-2">
                <span className="truncate">{i.quantity} × {i.productName}</span>
                <span className="shrink-0">{formatCurrency(i.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          <div className="border-t border-dashed border-gray-200 pt-2 space-y-0.5 text-gray-500">
            <p>Método: {getPaymentMethodLabel(sale.method)}</p>
            <p>Cliente: {sale.memberName ?? 'Mostrador'}</p>
            <p>Responsable: {sale.registeredBy}</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 grid grid-cols-2 gap-2">
          <button onClick={handleCopy} className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar resumen'}
          </button>
          <button onClick={() => window.print()} className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
          <button onClick={onNewSale} className="col-span-2 py-2 text-sm font-medium btn-primary rounded-lg">
            Nueva venta
          </button>
          <button onClick={onClose} className="col-span-2 py-2 text-xs text-gray-400 hover:text-gray-600">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
