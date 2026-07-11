'use client';
// Capa de negocio sobre useCamera(): modo (accesos/inventario), lectura
// continua con anti-duplicados, y el punto único scanCode() que usan por
// igual la cámara, el lector USB y la entrada manual.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useCamera } from './CameraContext';
import { useUsbScanner } from './useUsbScanner';
import { ACCESS_FORMATS, INVENTORY_FORMATS, startDecoding } from './scanEngine';
import { useStore } from '@/lib/store';
import type { AccessLog } from '@/types';
import type { DetectedCode, InventoryScanResult, ScanFormat, ScanMode, ScanSource } from '@/types';

const LOCK_MS_KEY = 'scanner_lock_ms';
const USB_ENABLED_KEY = 'scanner_usb_enabled';
const SOUND_ENABLED_KEY = 'scanner_sound_enabled';
const VIBRATION_ENABLED_KEY = 'scanner_vibration_enabled';
const DEFAULT_LOCK_MS = 2000;

type ScanBusinessResult = { kind: 'access'; log: AccessLog } | { kind: 'inventory'; result: InventoryScanResult };

interface ScannerContextValue {
  mode: ScanMode;
  setMode: (mode: ScanMode) => void;
  reading: boolean;
  pauseReading: () => void;
  resumeReading: () => void;
  lastDetected: DetectedCode | null;
  lastResult: ScanBusinessResult | null;
  clearResult: () => void;
  scanCode: (code: string, source: ScanSource, format: ScanFormat | null) => Promise<void>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  lockMs: number;
  setLockMs: (ms: number) => void;
  usbEnabled: boolean;
  setUsbEnabled: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (v: boolean) => void;
  resetSettings: () => void;
}

const ScannerContext = createContext<ScannerContextValue | null>(null);

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw === null ? fallback : raw === 'true';
}

function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 120);
  } catch {
    // Audio no disponible (autoplay bloqueado, navegador sin soporte) — no es crítico.
  }
}

export function ScannerProvider({ children }: { children: React.ReactNode }) {
  const camera = useCamera();
  const { inventory, validateAccessCode } = useStore();

  const [mode, setMode] = useState<ScanMode>('access');
  const [reading, setReading] = useState(true);
  const [lastDetected, setLastDetected] = useState<DetectedCode | null>(null);
  const [lastResult, setLastResult] = useState<ScanBusinessResult | null>(null);
  const [lockMs, setLockMsState] = useState(DEFAULT_LOCK_MS);
  const [usbEnabled, setUsbEnabledState] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [vibrationEnabled, setVibrationEnabledState] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);
  const modeRef = useRef(mode);
  const readingRef = useRef(reading);
  const lockMsRef = useRef(lockMs);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    readingRef.current = reading;
  }, [reading]);
  useEffect(() => {
    lockMsRef.current = lockMs;
  }, [lockMs]);

  useEffect(() => {
    setLockMsState(Number(window.localStorage.getItem(LOCK_MS_KEY)) || DEFAULT_LOCK_MS);
    setUsbEnabledState(readBool(USB_ENABLED_KEY, true));
    setSoundEnabledState(readBool(SOUND_ENABLED_KEY, true));
    setVibrationEnabledState(readBool(VIBRATION_ENABLED_KEY, true));
  }, []);

  const setLockMs = useCallback((ms: number) => {
    setLockMsState(ms);
    try {
      window.localStorage.setItem(LOCK_MS_KEY, String(ms));
    } catch {
      // no-op
    }
  }, []);
  const setUsbEnabled = useCallback((v: boolean) => {
    setUsbEnabledState(v);
    try {
      window.localStorage.setItem(USB_ENABLED_KEY, String(v));
    } catch {
      // no-op
    }
  }, []);
  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v);
    try {
      window.localStorage.setItem(SOUND_ENABLED_KEY, String(v));
    } catch {
      // no-op
    }
  }, []);
  const setVibrationEnabled = useCallback((v: boolean) => {
    setVibrationEnabledState(v);
    try {
      window.localStorage.setItem(VIBRATION_ENABLED_KEY, String(v));
    } catch {
      // no-op
    }
  }, []);
  const resetSettings = useCallback(() => {
    setLockMs(DEFAULT_LOCK_MS);
    setUsbEnabled(true);
    setSoundEnabled(true);
    setVibrationEnabled(true);
  }, [setLockMs, setUsbEnabled, setSoundEnabled, setVibrationEnabled]);

  const clearResult = useCallback(() => setLastResult(null), []);

  const scanCode = useCallback(
    async (code: string, source: ScanSource, format: ScanFormat | null) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      const now = Date.now();
      const last = lastCodeRef.current;
      // Anti-duplicados: mismo código dentro de la ventana de bloqueo se ignora.
      if (last && last.code === trimmed && now - last.at < lockMsRef.current) return;
      lastCodeRef.current = { code: trimmed, at: now };

      setLastDetected({ text: trimmed, format, source, timestamp: now });

      if (soundEnabled) playBeep();
      if (vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(80);

      if (modeRef.current === 'access') {
        const log = await validateAccessCode(trimmed, source);
        setLastResult({ kind: 'access', log });
      } else {
        const item = inventory.find((i) => i.area === 'tienda' && i.sku === trimmed);
        setLastResult({
          kind: 'inventory',
          result: item ? { type: 'found', item } : { type: 'not_found', code: trimmed },
        });
      }
    },
    [inventory, validateAccessCode, soundEnabled, vibrationEnabled]
  );

  const pauseReading = useCallback(() => setReading(false), []);
  const resumeReading = useCallback(() => setReading(true), []);

  // Escaneo continuo: se decodifica el <video> mientras la cámara esté activa,
  // el modo de lectura no esté pausado y la pestaña esté visible.
  useEffect(() => {
    if (camera.status !== 'active' || !reading || !videoRef.current) return;
    let stopFn: (() => void) | null = null;
    let cancelled = false;
    const formats = mode === 'access' ? ACCESS_FORMATS : INVENTORY_FORMATS;

    startDecoding(videoRef.current, formats, (result) => {
      void scanCode(result.text, 'camera', result.format);
    }).then((fn) => {
      if (cancelled) fn();
      else stopFn = fn;
    });

    return () => {
      cancelled = true;
      stopFn?.();
    };
  }, [camera.status, camera.stream, reading, mode, scanCode]);

  // Pestaña oculta: se pausa la decodificación (no el stream) para ahorrar CPU.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setReading(false);
      else setReading(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Cierra automáticamente un resultado abierto tras un tiempo. En modo
  // Acceso también pausa la lectura y la reanuda al cerrar (el flujo pedido:
  // detectar → bloquear → procesar → popup → cerrar → reanudar; la
  // reanudación vive en el cleanup, no solo en el timeout, para cubrir tanto
  // el auto-cierre como el cierre manual del popup sin dejar el escáner
  // pausado permanentemente). En modo Inventario NO pausamos: el carrito
  // requiere poder escanear varios productos seguidos sin esperar.
  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.kind === 'access') {
      pauseReading();
      const t = setTimeout(() => setLastResult(null), 6000);
      return () => {
        clearTimeout(t);
        resumeReading();
      };
    }
    const t = setTimeout(() => setLastResult(null), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult]);

  useUsbScanner(usbEnabled, useCallback((code) => void scanCode(code, 'usb_scanner', mode === 'access' ? 'qr_code' : null), [scanCode, mode]));

  const value = useMemo(
    () => ({
      mode,
      setMode,
      reading,
      pauseReading,
      resumeReading,
      lastDetected,
      lastResult,
      clearResult,
      scanCode,
      videoRef,
      lockMs,
      setLockMs,
      usbEnabled,
      setUsbEnabled,
      soundEnabled,
      setSoundEnabled,
      vibrationEnabled,
      setVibrationEnabled,
      resetSettings,
    }),
    [mode, reading, pauseReading, resumeReading, lastDetected, lastResult, clearResult, scanCode, lockMs, setLockMs, usbEnabled, setUsbEnabled, soundEnabled, setSoundEnabled, vibrationEnabled, setVibrationEnabled, resetSettings]
  );

  return <ScannerContext.Provider value={value}>{children}</ScannerContext.Provider>;
}

export function useScanner() {
  const ctx = useContext(ScannerContext);
  if (!ctx) throw new Error('useScanner debe usarse dentro de <ScannerProvider>');
  return ctx;
}
