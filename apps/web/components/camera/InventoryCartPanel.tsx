'use client';
import { useState } from 'react';
import { ShoppingCart, Trash2, X } from 'lucide-react';
import { useInventoryCart } from '@/lib/cart/InventoryCartContext';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { InventoryCartItem } from './InventoryCartItem';
import { CheckoutModal } from '@/components/payments/CheckoutModal';
import { SaleTicket } from '@/components/payments/SaleTicket';
import { formatCurrency } from '@/lib/utils';
import type { InventorySale } from '@/types';

// Carrito compacto embebido en el Escáner en vivo (modo Inventario). El
// contexto (useInventoryCart) ya persiste entre renders/secciones — este
// componente solo lo muestra y dispara el checkout.
export function InventoryCartPanel() {
  const { items, subtotal, totalUnits, totalProducts, incrementQuantity, decrementQuantity, removeProduct, clearCart } = useInventoryCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<InventorySale | null>(null);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <ShoppingCart className="w-4 h-4 text-blue-600" />
          Carrito · {totalUnits} unidad{totalUnits === 1 ? '' : 'es'} · {totalProducts} producto{totalProducts === 1 ? '' : 's'}
        </div>
        {items.length > 0 && (
          <button onClick={() => clearCart()} title="Vaciar carrito" className="text-gray-400 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-center text-xs text-gray-400 py-6 px-3">Escanea productos para comenzar una venta.</p>
      ) : (
        <>
          <div className="max-h-56 overflow-y-auto px-3">
            {items.map((line) => (
              <InventoryCartItem key={line.productId} line={line} onIncrement={incrementQuantity} onDecrement={decrementQuantity} onRemove={removeProduct} />
            ))}
          </div>
          <div className="px-3 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total</span>
            <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
          <div className="p-3 pt-0 flex gap-2">
            <button
              onClick={() => setCancelConfirmOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <X className="w-3.5 h-3.5" /> Cancelar venta
            </button>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="flex-1 py-2 text-xs font-medium btn-primary rounded-lg"
            >
              Confirmar venta
            </button>
          </div>
        </>
      )}

      {checkoutOpen && (
        <CheckoutModal
          onClose={() => setCheckoutOpen(false)}
          onCompleted={(sale) => { setCheckoutOpen(false); setCompletedSale(sale); }}
        />
      )}

      {completedSale && (
        <SaleTicket
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
          onNewSale={() => setCompletedSale(null)}
        />
      )}

      <ConfirmationDialog
        open={cancelConfirmOpen}
        title="¿Deseas cancelar esta venta?"
        description="Los productos agregados se eliminarán del carrito. No se descuenta inventario ni se registra ningún ingreso."
        confirmLabel="Cancelar venta"
        cancelLabel="Continuar venta"
        variant="warning"
        onConfirm={() => { clearCart(); setCancelConfirmOpen(false); }}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </div>
  );
}
