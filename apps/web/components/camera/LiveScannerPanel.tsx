'use client';
import { useRouter } from 'next/navigation';
import { ScanLine } from 'lucide-react';
import { useCamera } from '@/lib/camera/CameraContext';
import { useScanner } from '@/lib/camera/ScannerContext';
import { ScannerViewport } from './ScannerViewport';
import { CameraStatus, effectiveCameraStatus } from './CameraStatus';
import { ScannerModeSelector } from './ScannerModeSelector';
import { ScannerMiniPanel } from './ScannerMiniPanel';

export function LiveScannerPanel() {
  const camera = useCamera();
  const scanner = useScanner();
  const router = useRouter();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Escáner en vivo</h2>
        </div>
        <div className="flex items-center gap-2">
          <ScannerModeSelector mode={scanner.mode} onChange={scanner.setMode} />
          <CameraStatus status={effectiveCameraStatus(camera.status, scanner.reading)} />
        </div>
      </div>

      {/* El video va arriba a todo el ancho del panel (dominante, 16:9 vía
          ScannerViewport) y los controles quedan debajo en una franja
          compacta — mismo componente/estado, solo cambia la composición. */}
      <div className="p-4">
        <ScannerViewport size="lg" />
      </div>
      <ScannerMiniPanel
        className="p-4 border-t border-gray-100"
        onOpenMonitor={() => router.push('/access-monitor')}
      />
    </div>
  );
}
