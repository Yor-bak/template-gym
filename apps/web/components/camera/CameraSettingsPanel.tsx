'use client';
import { PauseCircle, PlayCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { useCamera } from '@/lib/camera/CameraContext';
import { useScanner } from '@/lib/camera/ScannerContext';
import { CameraStatus, effectiveCameraStatus } from './CameraStatus';

export function CameraSettingsPanel({ compact }: { compact?: boolean }) {
  const camera = useCamera();
  const scanner = useScanner();

  return (
    <div className={compact ? 'w-80 p-4 space-y-3' : 'space-y-4'}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Estado</span>
        <CameraStatus status={effectiveCameraStatus(camera.status, scanner.reading)} />
      </div>

      {camera.status === 'error' && camera.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{camera.error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Cámara</label>
        <select
          value={camera.selectedDeviceId ?? ''}
          onChange={(e) => camera.switchDevice(e.target.value)}
          disabled={camera.devices.length === 0}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:bg-gray-50"
        >
          {camera.devices.length === 0 && <option value="">Sin cámaras detectadas</option>}
          {camera.devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {camera.status === 'idle' || camera.status === 'denied' || camera.status === 'error' || camera.status === 'unavailable' ? (
          <button onClick={() => camera.requestAccess()} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium btn-primary rounded-lg">
            {camera.status === 'denied' ? 'Reintentar permiso' : 'Activar cámara'}
          </button>
        ) : (
          <>
            <button
              onClick={() => (scanner.reading ? scanner.pauseReading() : scanner.resumeReading())}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              {scanner.reading ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
              {scanner.reading ? 'Pausar lectura' : 'Reanudar lectura'}
            </button>
            <button onClick={() => camera.restart()} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
              <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
            </button>
          </>
        )}
      </div>

      {camera.status === 'active' && (
        <button onClick={() => camera.stop()} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
          Desactivar cámara
        </button>
      )}
    </div>
  );
}
