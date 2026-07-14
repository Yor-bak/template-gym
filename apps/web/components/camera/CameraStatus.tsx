import { Camera, CameraOff, Loader2, ShieldAlert, AlertTriangle, PauseCircle, VideoOff } from 'lucide-react';
import type { CameraStatus as CameraStatusType } from '@/types';

const STATUS_META: Record<CameraStatusType, { label: string; icon: typeof Camera; className: string }> = {
  idle: { label: 'Cámara desactivada', icon: CameraOff, className: 'text-gray-400 bg-gray-50' },
  requesting: { label: 'Solicitando permiso...', icon: Loader2, className: 'text-blue-600 bg-blue-50' },
  active: { label: 'Cámara activa', icon: Camera, className: 'text-green-600 bg-green-50' },
  denied: { label: 'Permiso rechazado', icon: ShieldAlert, className: 'text-red-600 bg-red-50' },
  unavailable: { label: 'Cámara no disponible', icon: VideoOff, className: 'text-gray-500 bg-gray-100' },
  paused: { label: 'Lectura pausada', icon: PauseCircle, className: 'text-yellow-700 bg-yellow-50' },
  error: { label: 'Error de cámara', icon: AlertTriangle, className: 'text-red-600 bg-red-50' },
};

export function CameraStatus({ status, compact }: { status: CameraStatusType; compact?: boolean }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${meta.className}`}>
      <Icon className={`w-3.5 h-3.5 shrink-0 ${status === 'requesting' ? 'animate-spin' : ''}`} />
      {!compact && meta.label}
    </span>
  );
}

export function cameraStatusLabel(status: CameraStatusType): string {
  return STATUS_META[status].label;
}

/** El estado visual "paused" no viene del stream (que sigue vivo) sino de que
 * la lectura de códigos esté detenida a propósito (botón Pausar, o popup abierto). */
export function effectiveCameraStatus(status: CameraStatusType, reading: boolean): CameraStatusType {
  return status === 'active' && !reading ? 'paused' : status;
}
