'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { X, Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

// Requiere HTTPS (o localhost) — los navegadores solo dan acceso a la cámara
// en contextos seguros. Desde el celular hace falta el túnel/dominio real.
export function BarcodeScannerModal({ onDetected, onClose }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no soporta acceso a la cámara.');
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('El acceso a la cámara requiere una conexión segura (HTTPS).');
      return;
    }

    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current as HTMLVideoElement,
        (result, _err, controls) => {
          if (cancelled) return;
          controlsRef.current = controls;
          if (result) {
            controls.stop();
            onDetected(result.getText());
          }
        }
      )
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo acceder a la cámara.');
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Escanear código de barras</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative bg-black aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {!error && <div className="absolute inset-8 border-2 border-white/70 rounded-lg pointer-events-none" />}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-white text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 text-center">
          <p className="text-xs text-gray-400">Apunta la cámara al código de barras del producto</p>
        </div>
      </div>
    </div>
  );
}
