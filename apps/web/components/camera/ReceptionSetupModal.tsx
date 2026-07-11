'use client';
import { useEffect } from 'react';
import { Camera, ShieldAlert } from 'lucide-react';
import { useCamera } from '@/lib/camera/CameraContext';

// Se muestra una vez por sesión de dashboard (no en cada página) justo
// después del login. "Continuar sin cámara" cierra el modal sin romper nada:
// el resto de la app sigue funcionando con entrada manual / lector USB. El
// flag "dismissed" vive en CameraContext (montado una sola vez en el layout
// raíz), no en este componente, porque cada página vuelve a montar <AppShell>.
export function ReceptionSetupModal() {
  const camera = useCamera();

  useEffect(() => {
    try {
      if (window.localStorage.getItem('scanner_auto_activate') === 'true' && camera.status === 'idle') {
        camera.requestAccess();
      }
    } catch {
      // no-op
    }
    // Solo al montar — es la preparación inicial de recepción.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (camera.setupDismissed || camera.status === 'active') return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Franja decorativa fija (no botón/CTA): hex literal en vez de
            bg-blue-600, porque esa clase pasa a ser el acento "info" claro
            del sistema oscuro (ver globals.css) y aquí se necesita un
            fondo sólido oscuro para la franja de encabezado. */}
        <div className="px-6 py-5 bg-[#0b1f3a] text-[#f3f1ea] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f3f1ea]/20 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">Preparación de recepción</p>
            <p className="text-xs text-[#f3f1ea]/80">Antes de empezar</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Template Gym necesita acceso a la cámara para leer códigos QR de miembros y códigos de barras del inventario.
          </p>

          {camera.status === 'denied' && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{camera.error ?? 'Permiso rechazado. Puedes reintentarlo o continuar sin cámara.'}</span>
            </div>
          )}

          {camera.status === 'requesting' && <p className="text-xs text-blue-600">Esperando respuesta del navegador...</p>}

          {camera.devices.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Seleccionar cámara</label>
              <select
                value={camera.selectedDeviceId ?? ''}
                onChange={(e) => camera.switchDevice(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                {camera.devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => camera.requestAccess()}
              disabled={camera.status === 'requesting'}
              className="w-full py-2.5 btn-primary text-sm font-medium rounded-lg disabled:opacity-60"
            >
              {camera.status === 'denied' ? 'Reintentar permiso' : 'Activar cámara'}
            </button>
            <button onClick={() => camera.dismissSetup()} className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700">
              Continuar sin cámara
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
