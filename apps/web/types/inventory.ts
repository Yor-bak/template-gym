export type InventoryArea = 'cardio' | 'fuerza' | 'peso_libre' | 'tienda';
export type InventoryStatus = 'operating' | 'maintenance' | 'out_of_service';

export interface InventoryItem {
  id: string;
  gymId: string;
  area: InventoryArea;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  sku?: string;
  quantity: number;
  minStock?: number;
  unitMeasure?: string;
  location?: string;
  status: InventoryStatus;
  purchaseDate?: string;
  purchasePrice?: number;
  repairPrice?: number;
  salePrice?: number;
  supplier?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  notes?: string;
}
