'use client';
// Reemplaza a InventoryScanResult: ya no hay botón "Agregar a venta" — escanear
// agrega directo al carrito (useInventoryCart) y esto solo muestra el feedback
// de esa acción (agregado / incrementado / sin existencias / no encontrado / etc).
import { useEffect } from 'react';
import { CheckCircle2, PackageX, AlertTriangle, Ban, Plus } from 'lucide-react';
import type { CartFeedback } from '@/types';

interface ProductScanResultProps {
  feedback: CartFeedback;
  onRegisterNew: (code: string) => void;
  onDismiss: () => void;
}

export function ProductScanResult({ feedback, onRegisterNew, onDismiss }: ProductScanResultProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  if (feedback.type === 'not_found') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <PackageX className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">Producto no encontrado</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{feedback.code}</p>
          </div>
          <button onClick={onDismiss} className="text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
        </div>
        <button
          onClick={() => onRegisterNew(feedback.code)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm btn-primary rounded-lg"
        >
          <Plus className="w-4 h-4" /> Registrar producto con este código
        </button>
      </div>
    );
  }

  const content = (() => {
    switch (feedback.type) {
      case 'added':
        return { icon: CheckCircle2, tone: 'text-green-600 bg-green-50', text: `${feedback.productName} agregada al carrito.` };
      case 'incremented':
        return { icon: CheckCircle2, tone: 'text-green-600 bg-green-50', text: `${feedback.productName} — cantidad: ${feedback.quantity}.` };
      case 'max_stock':
        return {
          icon: AlertTriangle,
          tone: 'text-orange-600 bg-orange-50',
          text: feedback.maxStock === 0
            ? `${feedback.productName} no tiene existencias disponibles.`
            : 'No hay existencias suficientes para agregar otra unidad.',
        };
      case 'inactive':
        return { icon: Ban, tone: 'text-gray-500 bg-gray-100', text: `${feedback.productName} no está disponible para venta.` };
      case 'no_price':
        return { icon: Ban, tone: 'text-gray-500 bg-gray-100', text: `${feedback.productName} no tiene un precio de venta configurado.` };
    }
  })();

  const Icon = content.icon;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${content.tone}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <p className="flex-1 text-sm text-gray-800">{content.text}</p>
        <button onClick={onDismiss} className="text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
      </div>
    </div>
  );
}
