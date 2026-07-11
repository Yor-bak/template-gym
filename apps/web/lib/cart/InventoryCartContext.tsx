'use client';
// Carrito de venta de tienda: vive en un Context montado una sola vez (ver
// app/layout.tsx, dentro de ScannerProvider) para sobrevivir navegación y
// renders. Reacciona automáticamente a los escaneos en modo inventario
// (useScanner().lastResult) — escanear agrega directo al carrito, sin un
// botón intermedio de "Agregar a venta".
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useScanner } from '@/lib/camera/ScannerContext';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import type { CartFeedback, CartLine, InventorySale, PaymentMethod } from '@/types';

interface InventoryCartContextValue {
  items: CartLine[];
  subtotal: number;
  totalUnits: number;
  totalProducts: number;
  lastFeedback: CartFeedback | null;
  clearFeedback: () => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeProduct: (productId: string) => void;
  clearCart: () => void;
  completeSale: (input: { method: PaymentMethod; memberId?: string; notes?: string }) => Promise<InventorySale>;
}

const InventoryCartContext = createContext<InventoryCartContextValue | null>(null);

export function InventoryCartProvider({ children }: { children: React.ReactNode }) {
  const scanner = useScanner();
  const { inventory, completeInventorySale } = useStore();
  useAuth(); // el responsable de la venta lo resuelve el store con el usuario autenticado — no se elige aquí.

  const [items, setItems] = useState<CartLine[]>([]);
  const [lastFeedback, setLastFeedback] = useState<CartFeedback | null>(null);
  const inventoryRef = useRef(inventory);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  const addFromScan = useCallback((code: string) => {
    const item = inventoryRef.current.find((i) => i.area === 'tienda' && i.sku === code);
    if (!item) {
      setLastFeedback({ type: 'not_found', code });
      return;
    }
    if (item.status !== 'operating') {
      setLastFeedback({ type: 'inactive', productName: item.name });
      return;
    }
    if (item.salePrice === undefined) {
      setLastFeedback({ type: 'no_price', productName: item.name });
      return;
    }
    setItems((prev) => {
      const existing = prev.find((l) => l.productId === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          setLastFeedback({ type: 'max_stock', productName: item.name, maxStock: item.quantity });
          return prev;
        }
        setLastFeedback({ type: 'incremented', productName: item.name, quantity: existing.quantity + 1 });
        return prev.map((l) => (l.productId === item.id ? { ...l, quantity: l.quantity + 1, maxStock: item.quantity } : l));
      }
      if (item.quantity <= 0) {
        setLastFeedback({ type: 'max_stock', productName: item.name, maxStock: 0 });
        return prev;
      }
      setLastFeedback({ type: 'added', productName: item.name });
      return [...prev, { productId: item.id, productName: item.name, barcode: item.sku, unitPrice: item.salePrice!, quantity: 1, maxStock: item.quantity }];
    });
  }, []);

  // Único punto de reacción a escaneos de inventario — el escáner (cámara,
  // USB o manual) siempre pasa por scanner.scanCode(), que ya deduplica.
  useEffect(() => {
    if (scanner.lastResult?.kind !== 'inventory') return;
    const result = scanner.lastResult.result;
    addFromScan(result.type === 'found' ? result.item.sku ?? '' : result.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanner.lastResult]);

  const clearFeedback = useCallback(() => setLastFeedback(null), []);

  const incrementQuantity = useCallback((productId: string) => {
    setItems((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        if (l.quantity >= l.maxStock) {
          setLastFeedback({ type: 'max_stock', productName: l.productName, maxStock: l.maxStock });
          return l;
        }
        return { ...l, quantity: l.quantity + 1 };
      })
    );
  }, []);

  const decrementQuantity = useCallback((productId: string) => {
    setItems((prev) =>
      prev.flatMap((l) => {
        if (l.productId !== productId) return [l];
        if (l.quantity <= 1) return []; // baja a 0 → se quita la línea
        return [{ ...l, quantity: l.quantity - 1 }];
      })
    );
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev.flatMap((l) => {
        if (l.productId !== productId) return [l];
        if (quantity <= 0) return [];
        return [{ ...l, quantity: Math.min(quantity, l.maxStock) }];
      })
    );
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setItems((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const completeSale = useCallback(
    async ({ method, memberId, notes }: { method: PaymentMethod; memberId?: string; notes?: string }) => {
      const sale = await completeInventorySale({
        items: items.map((l) => ({ itemId: l.productId, quantity: l.quantity })),
        method,
        memberId,
        notes,
      });
      clearCart();
      return sale;
    },
    [items, completeInventorySale, clearCart]
  );

  const subtotal = items.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const totalUnits = items.reduce((s, l) => s + l.quantity, 0);
  const totalProducts = items.length;

  const value = useMemo(
    () => ({ items, subtotal, totalUnits, totalProducts, lastFeedback, clearFeedback, incrementQuantity, decrementQuantity, setQuantity, removeProduct, clearCart, completeSale }),
    [items, subtotal, totalUnits, totalProducts, lastFeedback, clearFeedback, incrementQuantity, decrementQuantity, setQuantity, removeProduct, clearCart, completeSale]
  );

  return <InventoryCartContext.Provider value={value}>{children}</InventoryCartContext.Provider>;
}

export function useInventoryCart() {
  const ctx = useContext(InventoryCartContext);
  if (!ctx) throw new Error('useInventoryCart debe usarse dentro de <InventoryCartProvider>');
  return ctx;
}
