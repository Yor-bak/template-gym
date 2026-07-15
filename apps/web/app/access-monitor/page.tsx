'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { ScannerViewport } from '@/components/camera/ScannerViewport';
import { ScannerMiniPanel } from '@/components/camera/ScannerMiniPanel';
import { useCamera } from '@/lib/camera/CameraContext';
import { useScanner } from '@/lib/camera/ScannerContext';
import { useStore } from '@/lib/store';

export default function AccessMonitorPage() {
  const { accessLogs } = useStore();
  const camera = useCamera();
  const scanner = useScanner();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  // Este es el monitor "completo" de recepción: siempre trabaja en modo accesos
  // — no ofrece cambiar a Inventario (ScannerMiniPanel no incluye ese control aquí).
  useEffect(() => {
    scanner.setMode('access');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const localLogs = accessLogs.slice(0, 20);
  const todayAuthorized = localLogs.filter(a => a.timestamp.startsWith(today) && ['authorized', 'expiring_soon', 'temporary_access'].includes(a.result)).length;
  const todayRejected = localLogs.filter(a => a.timestamp.startsWith(today) && ['expired', 'blocked', 'invalid_qr'].includes(a.result)).length;

  return (
    <AppShell>
      <Header
        title="Monitor de Acceso"
        subtitle="Recepción — Entrada principal"
        actions={
          <div className="flex items-center gap-3">
            <ConnectionIndicator connected={true} />
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Status Bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-3xl font-mono font-bold text-gray-900">{currentTime}</p>
            <p className="text-xs text-gray-400 mt-1">Hora actual</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{todayAuthorized}</p>
            <p className="text-xs text-green-600 mt-1">Entradas hoy</p>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{todayRejected}</p>
            <p className="text-xs text-red-500 mt-1">Rechazados hoy</p>
          </div>
        </div>

        {/* Escáner de cámara real — misma mini sección de control que en Inicio */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Escáner de acceso</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ScannerViewport size="lg" onActivate={camera.requestAccess} />
            <ScannerMiniPanel />
          </div>
        </div>

        {/* Live Access List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Accesos en vivo</h2>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="divide-y divide-gray-50">
            {localLogs.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No hay accesos registrados</p>
            ) : localLogs.map(log => {
              const isOk = ['authorized', 'expiring_soon', 'temporary_access'].includes(log.result);
              return (
                <div key={log.id} className={`flex items-center gap-4 px-5 py-3 ${isOk ? 'hover:bg-green-50' : 'hover:bg-red-50'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOk ? 'bg-green-500' : 'bg-red-500'}`} />
                  {log.memberName ? (
                    <MemberAvatar firstName={log.memberName.split(' ')[0]} lastName={log.memberName.split(' ')[1] ?? 'M'} size="sm" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs shrink-0">?</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{log.memberName ?? 'Desconocido'}</p>
                    <p className="text-xs text-gray-400">{log.memberNumber ?? log.rawQrCode ?? '—'}</p>
                  </div>
                  <StatusBadge status={log.result} />
                  <span className="text-xs text-gray-400 shrink-0">{log.timestamp.split('T')[1]?.slice(0, 5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
