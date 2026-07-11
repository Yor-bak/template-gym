'use client';
// Mini sección de control del escáner: cámara seleccionada, modo de lectura,
// último código/resultado, controles (pausar/cambiar cámara/reiniciar/entrada
// manual en Inventario) y el simulador de escenarios en modo demo. Se usa tal
// cual tanto en el panel "Escáner en vivo" de Inicio como en el Monitor de
// Acceso — una sola implementación, sin lógica duplicada.
import { useRouter } from 'next/navigation';
import { PauseCircle, PlayCircle, RotateCcw, Monitor, Sparkles } from 'lucide-react';
import { useCamera } from '@/lib/camera/CameraContext';
import { useScanner } from '@/lib/camera/ScannerContext';
import { isDemoMode } from '@/lib/data/config';
import { useInventoryCart } from '@/lib/cart/InventoryCartContext';
import { ManualCodeEntry } from './ManualCodeEntry';
import { ProductScanResult } from './ProductScanResult';
import { InventoryCartPanel } from './InventoryCartPanel';
import { MembershipStatusPopup } from '@/components/access/MembershipStatusPopup';
import { DEMO_ACCESS_CODES, DEMO_INVENTORY_CODES } from '@/lib/data/mock/scannerDemo';
import { cn } from '@/lib/utils';

interface ScannerMiniPanelProps {
  /** Si se pasa, muestra el botón "Abrir Monitor de Acceso" (solo tiene sentido fuera de esa página). */
  onOpenMonitor?: () => void;
  className?: string;
}

export function ScannerMiniPanel({ onOpenMonitor, className }: ScannerMiniPanelProps) {
  const camera = useCamera();
  const scanner = useScanner();
  const cart = useInventoryCart();
  const router = useRouter();
  const demo = isDemoMode();

  const selectedDeviceLabel = camera.devices.find((d) => d.deviceId === camera.selectedDeviceId)?.label ?? 'Predeterminada';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-gray-400">Cámara seleccionada</p>
          <p className="font-medium text-gray-900 truncate">{selectedDeviceLabel}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-gray-400">Modo de lectura</p>
          <p className="font-medium text-gray-900">{scanner.mode === 'access' ? 'Accesos (QR)' : 'Inventario (código de barras)'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5 col-span-2">
          <p className="text-gray-400">Último código detectado</p>
          <p className="font-medium text-gray-900 font-mono truncate">
            {scanner.lastDetected?.text ?? 'Sin último código detectado todavía'}
          </p>
        </div>
      </div>

      {scanner.mode === 'inventory' && cart.lastFeedback && (
        <ProductScanResult
          feedback={cart.lastFeedback}
          onRegisterNew={() => router.push('/inventory')}
          onDismiss={cart.clearFeedback}
        />
      )}

      {scanner.mode === 'inventory' && <InventoryCartPanel />}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => (scanner.reading ? scanner.pauseReading() : scanner.resumeReading())}
          disabled={camera.status !== 'active'}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40"
        >
          {scanner.reading ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
          {scanner.reading ? 'Pausar' : 'Reactivar'}
        </button>
        <select
          value={camera.selectedDeviceId ?? ''}
          onChange={(e) => camera.switchDevice(e.target.value)}
          disabled={camera.devices.length < 2}
          className="text-xs border border-gray-200 rounded-lg px-2 py-2 disabled:opacity-40"
        >
          {camera.devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
          ))}
        </select>
        <button onClick={() => camera.restart()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
          <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
        </button>
        {/* El ingreso manual solo tiene sentido en Inventario: en modo Accesos QR
            sólo se aceptan lecturas reales de QR de miembro. */}
        {scanner.mode === 'inventory' && <ManualCodeEntry />}
        {onOpenMonitor && (
          <button onClick={onOpenMonitor} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 ml-auto">
            <Monitor className="w-3.5 h-3.5" /> Abrir Monitor de Acceso
          </button>
        )}
      </div>

      {demo && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Simular código (solo modo demo)</p>
          <div className="flex flex-wrap gap-1.5">
            {(scanner.mode === 'access' ? DEMO_ACCESS_CODES : DEMO_INVENTORY_CODES).map((c) => (
              <button
                key={c.code}
                onClick={() => scanner.scanCode(c.code, 'simulation', scanner.mode === 'access' ? 'qr_code' : 'code_128')}
                className="px-2 py-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {scanner.lastResult?.kind === 'access' && (
        <MembershipStatusPopup
          key={scanner.lastResult.log.id}
          log={scanner.lastResult.log}
          onClose={scanner.clearResult}
          autoCloseSecs={6}
          onRegisterPayment={(memberId) => router.push(`/members/${memberId}`)}
        />
      )}
    </div>
  );
}
