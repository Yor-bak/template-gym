'use client';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CartLine } from '@/types';

interface InventoryCartItemProps {
  line: CartLine;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
}

export function InventoryCartItem({ line, onIncrement, onDecrement, onRemove }: InventoryCartItemProps) {
  const atMax = line.quantity >= line.maxStock;
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{line.productName}</p>
        <p className="text-xs text-gray-400 font-mono">{line.barcode ?? '—'} · {formatCurrency(line.unitPrice)} c/u</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onDecrement(line.productId)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Disminuir cantidad">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-medium text-gray-900">{line.quantity}</span>
        <button
          onClick={() => onIncrement(line.productId)}
          disabled={atMax}
          title={atMax ? 'No hay más existencias disponibles' : 'Aumentar cantidad'}
          className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="w-16 text-right text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(line.unitPrice * line.quantity)}</p>
      <button onClick={() => onRemove(line.productId)} className="p-1 text-gray-300 hover:text-red-600 shrink-0" title="Eliminar producto">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
