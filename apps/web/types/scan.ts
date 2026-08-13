import type { InventoryItem } from './inventory';

export type ScanFormat = 'qr_code' | 'ean_13' | 'ean_8' | 'upc_a' | 'upc_e' | 'code_128' | 'code_39';
export type ScanMode = 'access' | 'inventory';
export type ScanSource = 'camera' | 'usb_scanner' | 'manual' | 'simulation';

export interface DetectedCode {
  text: string;
  format: ScanFormat | null;
  source: ScanSource;
  timestamp: number;
}

export type InventoryScanResult =
  | { type: 'found'; item: InventoryItem }
  | { type: 'not_found'; code: string };
