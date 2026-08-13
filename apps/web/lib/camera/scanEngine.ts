// Abstracción única de decodificación de QR/códigos de barras: usa la
// BarcodeDetector nativa cuando el navegador la soporta (Chrome/Edge en
// Android y desktop) y cae a @zxing/browser en el resto (Safari, Firefox).
// Ambos caminos exponen la misma interfaz de salida (texto + formato).
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
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

// Fracción del lado más chico del video que ocupa el cuadro de escaneo,
// centrado — debe coincidir con el marco visual de ScannerViewport.tsx
// (mismo valor usado ahí para el overlay). Recortar la detección a esta
// región en vez de analizar el frame completo es lo que hace el escaneo
// más rápido: son muchos menos píxeles que procesar en cada intento, y de
// paso el usuario ya sabe exactamente dónde poner el QR porque coincide con
// lo que ve en pantalla.
export const SCAN_REGION_RATIO = 0.55;

function computeCropRect(video: HTMLVideoElement): { sx: number; sy: number; s: number } | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const s = Math.round(Math.min(vw, vh) * SCAN_REGION_RATIO);
  return { sx: Math.round((vw - s) / 2), sy: Math.round((vh - s) / 2), s };
}

/**
 * Empieza a decodificar continuamente desde un <video> que ya está
 * reproduciendo un stream (no solicita su propio getUserMedia). Solo analiza
 * el cuadro central (ver SCAN_REGION_RATIO), no el frame completo. Devuelve
 * una función para detener la decodificación.
 */
export async function startDecoding(
  video: HTMLVideoElement,
  wantedFormats: ScanFormat[],
  onResult: (result: ScanEngineResult) => void
): Promise<() => void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  /** Dibuja el recorte central del frame actual del video en el canvas
   * compartido y lo devuelve — null si el video todavía no tiene dimensiones
   * (primeros frames tras iniciar el stream). */
  function drawCroppedFrame(): HTMLCanvasElement | null {
    if (!ctx) return null;
    const crop = computeCropRect(video);
    if (!crop) return null;
    if (canvas.width !== crop.s) canvas.width = crop.s;
    if (canvas.height !== crop.s) canvas.height = crop.s;
    ctx.drawImage(video, crop.sx, crop.sy, crop.s, crop.s, 0, 0, crop.s, crop.s);
    return canvas;
  }

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
          const frame = drawCroppedFrame();
          if (frame) {
            const codes = await detector.detect(frame);
            if (!stopped && codes.length > 0) {
              const [first] = codes;
              onResult({
                text: first.rawValue,
                format: NATIVE_TO_SCAN_FORMAT[first.format] ?? null,
              });
            }
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

  // Fallback: @zxing/browser. decodeFromVideoElement no permite recortar la
  // región analizada, así que se arma un loop propio sobre decodeFromCanvas
  // (decodificación de un solo frame) con el mismo recorte central que el
  // camino nativo — NotFoundException es el resultado normal de la mayoría
  // de los frames (todavía no hay QR centrado), no un error real.
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(
    DecodeHintType.POSSIBLE_FORMATS,
    wantedFormats.map((f) => SCAN_FORMAT_TO_ZXING[f])
  );
  const reader = new BrowserMultiFormatReader(hints);
  let stopped = false;
  let raf = 0;
  const tick = async () => {
    if (stopped) return;
    try {
      const frame = drawCroppedFrame();
      if (frame) {
        const result = await reader.decodeFromCanvas(frame);
        if (!stopped && result) {
          onResult({
            text: result.getText(),
            format: ZXING_TO_SCAN_FORMAT[result.getBarcodeFormat()] ?? null,
          });
        }
      }
    } catch (err) {
      if (!(err instanceof NotFoundException)) {
        // Error real (frame corrupto, etc.) — se ignora igual, el próximo
        // tick reintenta solo; nunca debe tumbar el loop de escaneo.
      }
    }
    if (!stopped) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}

export const ACCESS_FORMATS: ScanFormat[] = ['qr_code'];
export const INVENTORY_FORMATS: ScanFormat[] = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];
