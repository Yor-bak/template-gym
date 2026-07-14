'use client';
import { useEffect, useState } from 'react';
import { X, ShoppingCart, AlertTriangle, Smartphone } from 'lucide-react';
import { useInventoryCart } from '@/lib/cart/InventoryCartContext';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { usePaymentConfig } from '@/lib/paymentConfig';
import { sendInvoiceToMobile } from '@/lib/mobileInbox';
import { MemberOptionalSelector } from './MemberOptionalSelector';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import type { InventorySale, PaymentMethod } from '@/types';

interface CheckoutModalProps {
  onClose: () => void;
  onCompleted: (sale: InventorySale) => void;
}

// Revisión antes de confirmar — no descuenta inventario todavía; eso solo
// ocurre al completar (useInventoryCart().completeSale -> store).
export function CheckoutModal({ onClose, onCompleted }: CheckoutModalProps) {
  const { items, subtotal, totalUnits, completeSale } = useInventoryCart();
  const { user } = useAuth();
  const { members } = useStore();
  const { options: methodOptions } = usePaymentConfig();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [memberId, setMemberId] = useState('');
  const [sendInvoice, setSendInvoice] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const now = new Date().toISOString();

  const selectedMember = members.find(m => m.id === memberId);
  const willSendInvoice = sendInvoice && !!selectedMember;

  // Si el método actual quedó deshabilitado en Configuración, cae al primero disponible.
  useEffect(() => {
    if (methodOptions.length > 0 && !methodOptions.some(o => o.value === method)) {
      setMethod(methodOptions[0].value);
    }
  }, [methodOptions, method]);

  const handleComplete = async () => {
    setError(null);
    setSaving(true);
    try {
      const sale = await completeSale({ method, memberId: memberId || undefined, notes: notes.trim() || undefined });
      if (willSendInvoice && selectedMember) {
        sendInvoiceToMobile({
          id: `inv_${Date.now()}`,
          memberId: selectedMember.id,
          memberName: `${selectedMember.firstName} ${selectedMember.lastName}`,
          saleId: sale.id,
          total: sale.total,
          itemsSummary: items.map(l => `${l.quantity} × ${l.productName}`).join(', '),
          method,
          sentAt: new Date().toISOString(),
        });
      }
      onCompleted(sale);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la venta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Confirmar venta</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            {items.map((l) => (
              <div key={l.productId} className="flex justify-between text-sm">
                <span className="text-gray-700">{l.quantity} × {l.productName}</span>
                <span className="font-medium text-gray-900">{formatCurrency(l.unitPrice * l.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-1.5 mt-1.5 flex justify-between text-sm font-semibold text-gray-900">
              <span>Total ({totalUnits} unidades)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
              {methodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (opcional)</label>
            <MemberOptionalSelector memberId={memberId} onChange={setMemberId} />
          </div>

          <div className="border border-gray-200 rounded-lg p-3">
            <label className={`flex items-center justify-between gap-3 ${selectedMember ? 'cursor-pointer' : 'opacity-60'}`}>
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <Smartphone className="w-4 h-4 text-blue-600" />
                Enviar factura a la app móvil del cliente
              </span>
              <input type="checkbox" checked={willSendInvoice} disabled={!selectedMember} onChange={(e) => setSendInvoice(e.target.checked)} className="w-4 h-4" />
            </label>
            {!selectedMember ? (
              <p className="text-xs text-gray-400 mt-2">Selecciona un cliente para enviarle la factura a su app.</p>
            ) : willSendInvoice ? (
              <p className="text-xs text-gray-500 mt-2">Se enviará el comprobante a la app de {selectedMember.firstName} {selectedMember.lastName}.</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-gray-400">Responsable</p>
              <p className="font-medium text-gray-900">{user ? `${user.firstName} ${user.lastName}` : '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-gray-400">Fecha y hora</p>
              <p className="font-medium text-gray-900">{formatDate(now)} {formatTime(now)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Volver al carrito</button>
          <button onClick={handleComplete} disabled={saving || items.length === 0} className="flex-1 py-2.5 btn-primary text-sm rounded-lg disabled:opacity-60">
            {saving ? 'Procesando...' : 'Completar venta'}
          </button>
        </div>
      </div>
    </div>
  );
}
