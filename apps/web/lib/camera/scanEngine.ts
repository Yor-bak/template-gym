// Abstracción única de decodificación de QR/códigos de barras: usa la
// BarcodeDetector nativa cuando el navegador la soporta (Chrome/Edge en
// Android y desktop) y cae a @zxing/browser en el resto (Safari, Firefox).
// Ambos caminos exponen la misma interfaz de salida (texto + formato).
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import type { ScanFormat } from '@/types';

export interface ScanEngineResult {
  text: string;
  format: ScanFormat | null;
}

const ZXING_TO_SCAN_FORMAT: Partial<Record<number, ScanFormat>> = {
  [BarcodeFormat.QR_CODE]: 'qr_code',
  [BarcodeFormat.EAN_13]: 'ean_13',
  [BarcodeFormat.EAN_8]: 'ean_8',
  [BarcodeFormat.UPC_A]: 'upc_a',
  [BarcodeFormat.UPC_E]: 'upc_e',
  [BarcodeFormat.CODE_128]: 'code_128',
  [BarcodeFormat.CODE_39]: 'code_39',
};

const SCAN_FORMAT_TO_ZXING: Record<ScanFormat, BarcodeFormat> = {
  qr_code: BarcodeFormat.QR_CODE,
  ean_13: BarcodeFormat.EAN_13,
  ean_8: BarcodeFormat.EAN_8,
  upc_a: BarcodeFormat.UPC_A,
  upc_e: BarcodeFormat.UPC_E,
  code_128: BarcodeFormat.CODE_128,
  code_39: BarcodeFormat.CODE_39,
};

// Las cadenas de la Shape Detection API (BarcodeDetector) coinciden 1:1 con
// nuestros ScanFormat — se valida igual con un mapa explícito por claridad.
const NATIVE_TO_SCAN_FORMAT: Record<string, ScanFormat> = {
  qr_code: 'qr_code',
  ean_13: 'ean_13',
  ean_8: 'ean_8',
  upc_a: 'upc_a',
  upc_e: 'upc_e',
  code_128: 'code_128',
  code_39: 'code_39',
};

export function hasNativeBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

async function getNativeSupportedFormats(): Promise<string[]> {
  try {
    // @ts-expect-error - BarcodeDetector es experimental, no está en el lib.dom.d.ts todavía
    return await window.BarcodeDetector.getSupportedFormats();
  } catch {
    return [];
  }
}

/**
 * Empieza a decodificar continuamente desde un <video> que ya está
 * reproduciendo un stream (no solicita su propio getUserMedia). Devuelve una
 * función para detener la decodificación.
 */
export async function startDecoding(
  video: HTMLVideoElement,
  wantedFormats: ScanFormat[],
  onResult: (result: ScanEngineResult) => void
): Promise<() => void> {
  if (hasNativeBarcodeDetector()) {
    const supported = await getNativeSupportedFormats();
    const formats = wantedFormats.filter((f) => supported.includes(f));
    if (formats.length > 0) {
      // @ts-expect-error - BarcodeDetector es experimental
      const detector = new window.BarcodeDetector({ formats });
      let stopped = false;
      let raf = 0;
      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(video);
          if (!stopped && codes.length > 0) {
            const [first] = codes;
            onResult({
              text: first.rawValue,
              format: NATIVE_TO_SCAN_FORMAT[first.format] ?? null,
            });
          }
        } catch {
          // Frame ilegible o video no listo todavía — se reintenta en el próximo tick.
        }
        if (!stopped) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => {
        stopped = true;
        cancelAnimationFrame(raf);
      };
    }
  }

  // Fallback: @zxing/browser, ya usado en components/inventory/BarcodeScannerModal.tsx.
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(
    DecodeHintType.POSSIBLE_FORMATS,
    wantedFormats.map((f) => SCAN_FORMAT_TO_ZXING[f])
  );
  const reader = new BrowserMultiFormatReader(hints);
  const controls = await reader.decodeFromVideoElement(video, (result) => {
    if (result) {
      onResult({
        text: result.getText(),
        format: ZXING_TO_SCAN_FORMAT[result.getBarcodeFormat()] ?? null,
      });
    }
  });
  return () => controls.stop();
}

export const ACCESS_FORMATS: ScanFormat[] = ['qr_code'];
export const INVENTORY_FORMATS: ScanFormat[] = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];
