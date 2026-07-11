'use client';
import { useMemo, useState } from 'react';
import { X, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import type { PaymentMethod } from '@/types';

interface InventorySaleModalProps {
  onClose: () => void;
  onSuccess?: (saleSummary: string) => void;
}

export function InventorySaleModal({ onClose, onSuccess }: InventorySaleModalProps) {
  const { inventory, members, completeInventorySale } = useStore();
  const storeItems = useMemo(() => inventory.filter(i => i.area === 'tienda'), [inventory]);

  const [itemId, setItemId] = useState(storeItems[0]?.id ?? '');
  const [quantity, setQuantity] = useState('1');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [memberId, setMemberId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const item = storeItems.find(i => i.id === itemId);
  const qty = Number(quantity) || 0;
  const unitPrice = item?.salePrice ?? 0;
  const total = unitPrice * qty;
  const outOfStock = !item || item.quantity <= 0;
  const exceedsStock = !!item && qty > item.quantity;
  const remainingAfterSale = item ? item.quantity - qty : 0;
  const willBeLowStock = !!item && item.minStock !== undefined && qty > 0 && !exceedsStock && remainingAfterSale <= item.minStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!item) return;
    if (qty <= 0) { setError('La cantidad debe ser mayor a cero.'); return; }
    if (exceedsStock || outOfStock) { setError('No hay existencias suficientes para completar la venta.'); return; }

    setSaving(true);
    try {
      const sale = await completeInventorySale({ items: [{ itemId: item.id, quantity: qty }], method, memberId: memberId || undefined });
      onSuccess?.(`Venta registrada: ${qty} × ${item.name} — ${formatCurrency(sale.total)}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Registrar venta de inventario</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {storeItems.length === 0 ? (
            <p className="text-sm text-gray-500">No hay productos registrados en el área de Tiendita del Inventario.</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                <select value={itemId} onChange={e => setItemId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                  {storeItems.map(i => (
                    <option key={i.id} value={i.id} disabled={i.quantity <= 0}>
                      {i.name}{i.sku ? ` (${i.sku})` : ''} — stock: {i.quantity}{i.quantity <= 0 ? ' — sin existencias' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                  <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (opcional)</label>
                <select value={memberId} onChange={e => setMemberId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">— Venta de mostrador —</option>
                  {members.filter(m => m.status !== 'archived').map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.memberNumber})</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm flex items-center justify-between">
                <span className="text-gray-500">Precio unitario × cantidad</span>
                <span className="font-semibold text-gray-900">{formatCurrency(unitPrice)} × {qty || 0} = {formatCurrency(total)}</span>
              </div>

              {outOfStock && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  No hay existencias suficientes para completar la venta.
                </div>
              )}
              {!outOfStock && exceedsStock && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  Solo hay {item?.quantity} unidades disponibles.
                </div>
              )}
              {willBeLowStock && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  Esta venta dejará el stock en {remainingAfterSale}, por debajo o igual al mínimo ({item?.minStock}).
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving || storeItems.length === 0 || outOfStock || exceedsStock} className="flex-1 py-2.5 btn-primary text-sm rounded-lg disabled:opacity-60">
              {saving ? 'Registrando...' : 'Registrar venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
