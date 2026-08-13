'use client';
// Preview de video compartido + marco de escaneo. El <video> real vive aquí
// pero apunta siempre al mismo MediaStream de useCamera() — no crea streams
// nuevos, sin importar cuántas veces se monte este componente en la página.
import { useEffect } from 'react';
import { Camera, ShieldAlert, VideoOff, AlertTriangle } from 'lucide-react';
import { useCamera } from '@/lib/camera/CameraContext';
import { useScanner } from '@/lib/camera/ScannerContext';
import { SCAN_REGION_RATIO } from '@/lib/camera/scanEngine';

interface ScannerViewportProps {
  size?: 'lg' | 'md' | 'sm';
  onActivate?: () => void;
}

const SIZE_CLASS: Record<NonNullable<ScannerViewportProps['size']>, string> = {
  lg: 'aspect-video',
  md: 'aspect-video',
  sm: 'aspect-square',
};

export function ScannerViewport({ size = 'lg', onActivate }: ScannerViewportProps) {
  const camera = useCamera();
  const scanner = useScanner();

  useEffect(() => {
    const video = scanner.videoRef.current;
    if (!video) return;
    if (camera.stream) {
      if (video.srcObject !== camera.stream) video.srcObject = camera.stream;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [camera.stream, scanner.videoRef]);

  const showVideo = camera.status === 'active';

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${SIZE_CLASS[size]}`}>
      <video ref={scanner.videoRef} className={`w-full h-full object-cover ${showVideo ? '' : 'invisible'}`} muted playsInline />

      {showVideo && (
        // El marco visual usa la misma proporción (SCAN_REGION_RATIO) que la
        // región que realmente se analiza en scanEngine.ts — así lo que el
        // usuario ve coincide exactamente con la zona sensible al QR, en vez
        // del casi-todo-el-video de antes (que hacía el escaneo lento porque
        // se procesaban muchos más píxeles de los necesarios).
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative border-2 border-white/70 rounded-xl"
            style={{ height: `${SCAN_REGION_RATIO * 100}%`, aspectRatio: '1 / 1' }}
          >
            <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-xl" />
            <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-xl" />
            <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-xl" />
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-xl" />
          </div>
        </div>
      )}

      {showVideo && !scanner.reading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="px-3 py-1.5 bg-yellow-500 text-yellow-950 text-xs font-semibold rounded-lg">Lectura pausada</span>
        </div>
      )}

      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <div>
            {camera.status === 'denied' && (
              <>
                <ShieldAlert className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-[#f3f1ea] text-sm font-medium">Permiso de cámara rechazado</p>
                <p className="text-gray-400 text-xs mt-1">{camera.error}</p>
              </>
            )}
            {camera.status === 'unavailable' && (
              <>
                <VideoOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-[#f3f1ea] text-sm font-medium">Cámara no disponible</p>
                <p className="text-gray-400 text-xs mt-1">{camera.error ?? 'Usa la entrada manual mientras tanto.'}</p>
              </>
            )}
            {camera.status === 'error' && (
              <>
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-[#f3f1ea] text-sm font-medium">Error de cámara</p>
                <p className="text-gray-400 text-xs mt-1">{camera.error}</p>
              </>
            )}
            {(camera.status === 'idle' || camera.status === 'requesting') && (
              <>
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-[#f3f1ea] text-sm font-medium">{camera.status === 'requesting' ? 'Solicitando permiso...' : 'Cámara desactivada'}</p>
                {camera.status === 'idle' && (
                  <button
                    onClick={onActivate ?? camera.requestAccess}
                    className="mt-3 px-4 py-2 btn-primary text-sm rounded-lg"
                  >
                    Activar cámara
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
