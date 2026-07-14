'use client';
// Servicio global de cámara: un único MediaStream compartido por todo el
// dashboard. Solo gestiona permiso/dispositivo/stream — no sabe nada de QR,
// códigos de barras ni lógica de negocio (eso vive en ScannerContext).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CameraDeviceInfo, CameraStatus } from '@/types';

const PREFERRED_DEVICE_KEY = 'camera_preferred_device_id';

interface CameraContextValue {
  status: CameraStatus;
  stream: MediaStream | null;
  devices: CameraDeviceInfo[];
  selectedDeviceId: string | null;
  error: string | null;
  requestAccess: () => Promise<void>;
  stop: () => void;
  restart: () => Promise<void>;
  switchDevice: (deviceId: string) => Promise<void>;
  /** true una vez que el modal de preparación de recepción se cerró en esta sesión. */
  setupDismissed: boolean;
  dismissSetup: () => void;
  resetSetupPrompt: () => void;
}

const CameraContext = createContext<CameraContextValue | null>(null);

function isSecureContextAvailable() {
  return typeof window !== 'undefined' && window.isSecureContext;
}

function mapGetUserMediaError(err: unknown): { status: CameraStatus; message: string } {
  const name = err instanceof DOMException ? err.name : (err as { name?: string })?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return { status: 'denied', message: 'Permiso de cámara denegado. Puedes reintentarlo cuando quieras.' };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return { status: 'unavailable', message: 'No se detectó ninguna cámara en este dispositivo.' };
    case 'NotReadableError':
    case 'TrackStartError':
      return { status: 'error', message: 'La cámara está siendo usada por otra aplicación o no responde.' };
    case 'OverconstrainedError':
      return { status: 'error', message: 'La cámara seleccionada no soporta la configuración solicitada.' };
    default:
      return { status: 'error', message: err instanceof Error ? err.message : 'No se pudo acceder a la cámara.' };
  }
}

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(PREFERRED_DEVICE_KEY);
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);
  // Vive en este contexto (montado una sola vez en el layout raíz) y no en el
  // propio modal, porque cada página vuelve a montar <AppShell> al navegar.
  const [setupDismissed, setSetupDismissed] = useState(false);
  // Ref para evitar getUserMedia duplicado si dos componentes llaman
  // requestAccess() casi al mismo tiempo (ej. modal inicial + panel de Inicio).
  const acquiringRef = useRef<Promise<void> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    const cams = list
      .filter((d) => d.kind === 'videoinput')
      .map((d, i): CameraDeviceInfo => ({
        deviceId: d.deviceId,
        label: d.label || `Cámara ${i + 1}`,
        kind: 'videoinput',
      }));
    setDevices(cams);
    return cams;
  }, []);

  const stopInternal = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const attachTrackHandlers = useCallback((s: MediaStream) => {
    s.getVideoTracks().forEach((track) => {
      track.onended = () => {
        // Pérdida de stream: dispositivo desconectado, cámara tomada por otra
        // app, o el usuario revocó el permiso desde el navegador.
        if (streamRef.current === s) {
          streamRef.current = null;
          setStream(null);
          setStatus('error');
          setError('Se perdió la conexión con la cámara.');
        }
      };
    });
  }, []);

  const acquire = useCallback(
    async (deviceId?: string) => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable');
        setError('Este navegador no soporta acceso a la cámara.');
        return;
      }
      if (!isSecureContextAvailable()) {
        setStatus('unavailable');
        setError('El acceso a la cámara requiere una conexión segura (HTTPS).');
        return;
      }

      setStatus('requesting');
      setError(null);

      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } };

      try {
        // Un solo stream: si ya había uno vivo, se detiene antes de pedir el nuevo.
        stopInternal();
        const newStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
        attachTrackHandlers(newStream);
        streamRef.current = newStream;
        setStream(newStream);
        setStatus('active');

        const cams = await refreshDevices();
        const activeDeviceId = newStream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId ?? null;
        if (activeDeviceId) {
          setSelectedDeviceId(activeDeviceId);
          try {
            window.localStorage.setItem(PREFERRED_DEVICE_KEY, activeDeviceId);
          } catch {
            // no-op
          }
        }
        void cams;
      } catch (err) {
        const mapped = mapGetUserMediaError(err);
        setStatus(mapped.status);
        setError(mapped.message);
      }
    },
    [attachTrackHandlers, refreshDevices, stopInternal]
  );

  const requestAccess = useCallback(async () => {
    if (acquiringRef.current) return acquiringRef.current;
    if (streamRef.current) {
      setStatus('active');
      return;
    }
    const promise = acquire(selectedDeviceId ?? undefined).finally(() => {
      acquiringRef.current = null;
    });
    acquiringRef.current = promise;
    return promise;
  }, [acquire, selectedDeviceId]);

  const stop = useCallback(() => {
    stopInternal();
    setStatus('idle');
    setError(null);
  }, [stopInternal]);

  const restart = useCallback(async () => {
    await acquire(selectedDeviceId ?? undefined);
  }, [acquire, selectedDeviceId]);

  const switchDevice = useCallback(
    async (deviceId: string) => {
      await acquire(deviceId);
    },
    [acquire]
  );

  // El navegador solo entrega labels legibles después de tener permiso —
  // se refresca la lista en cuanto el stream queda activo.
  useEffect(() => {
    if (status === 'active') refreshDevices();
  }, [status, refreshDevices]);

  // Al desmontar el árbol completo (ej. recarga de página) se libera el stream.
  useEffect(() => stopInternal, [stopInternal]);

  const dismissSetup = useCallback(() => setSetupDismissed(true), []);
  const resetSetupPrompt = useCallback(() => setSetupDismissed(false), []);

  const value = useMemo(
    () => ({ status, stream, devices, selectedDeviceId, error, requestAccess, stop, restart, switchDevice, setupDismissed, dismissSetup, resetSetupPrompt }),
    [status, stream, devices, selectedDeviceId, error, requestAccess, stop, restart, switchDevice, setupDismissed, dismissSetup, resetSetupPrompt]
  );

  return <CameraContext.Provider value={value}>{children}</CameraContext.Provider>;
}

export function useCamera() {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error('useCamera debe usarse dentro de <CameraProvider>');
  return ctx;
}
