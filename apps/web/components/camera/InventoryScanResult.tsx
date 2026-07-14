'use client';
// Resultado de búsqueda/edición de producto por código, usado en la página de
// Inventario ("Escanear producto"). La venta ya no pasa por aquí: el flujo de
// venta vive en el carrito (InventoryCartContext / ProductScanResult) montado
// en el Escáner en vivo de Inicio y en el Monitor de Acceso.
import { Package, AlertTriangle, PackageX, Plus, Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { InventoryScanResult as InventoryScanResultType } from '@/types';

interface Props {
  result: InventoryScanResultType;
  isAdmin: boolean;
  onEdit?: (itemId: string) => void;
  onRegisterNew?: (code: string) => void;
  onClose: () => void;
}

export function InventoryScanResult({ result, isAdmin, onEdit, onRegisterNew, onClose }: Props) {
  if (result.type === 'not_found') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <PackageX className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">Producto no encontrado</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{result.code}</p>
          </div>
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
        </div>
        {onRegisterNew && (
          <button
            onClick={() => onRegisterNew(result.code)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm btn-primary rounded-lg"
          >
            <Plus className="w-4 h-4" /> Registrar producto con este código
          </button>
        )}
      </div>
    );
  }

  const { item } = result;
  const low = item.minStock !== undefined && item.quantity <= item.minStock;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{item.name}</p>
          <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
        </div>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        {isAdmin && (
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-xs text-gray-400">Precio de venta</p>
            <p className="font-semibold text-gray-900">{item.salePrice !== undefined ? formatCurrency(item.salePrice) : '—'}</p>
          </div>
        )}
        <div className={`rounded-lg p-2.5 ${low ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <p className="text-xs text-gray-400">Stock</p>
          <p className={`font-semibold ${low ? 'text-orange-600' : 'text-gray-900'}`}>{item.quantity}</p>
        </div>
      </div>

      {low && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Stock bajo (mínimo: {item.minStock})
        </div>
      )}

      {isAdmin && onEdit && (
        <div className="mt-3">
          <button onClick={() => onEdit(item.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
            <Pencil className="w-4 h-4" /> Editar
          </button>
        </div>
      )}
    </div>
  );
}
