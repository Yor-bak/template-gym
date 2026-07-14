'use client';
import { useState, useEffect, useCallback } from 'react';
import { Monitor } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { AccessPopup } from '@/components/access/AccessPopup';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { useStore } from '@/lib/store';
import { daysUntil } from '@/lib/utils';
import type { AccessLog } from '@/types';

// Mapea el status de negocio del miembro (members.status) al resultado que
// vería un lector de acceso real. Mientras no exista el backend en FastAPI,
// esta es la "validate_access" local: sin RPC, sin red.
function resultFromMemberStatus(status: string): AccessLog['result'] {
  switch (status) {
    case 'active':
      return 'authorized';
    case 'expiring_soon':
      return 'expiring_soon';
    case 'expired':
      return 'expired';
    case 'blocked':
      return 'blocked';
    case 'temporary_access':
      return 'temporary_access';
    default:
      return 'invalid_qr';
  }
}

export default function AccessMonitorPage() {
  const { members, memberships, accessLogs, addAccessLog } = useStore();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [activePopup, setActivePopup] = useState<AccessLog | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [connected, setConnected] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const localLogs = accessLogs.slice(0, 20);
  const todayAuthorized = localLogs.filter(a => a.timestamp.startsWith(today) && ['authorized', 'expiring_soon', 'temporary_access'].includes(a.result)).length;
  const todayRejected = localLogs.filter(a => a.timestamp.startsWith(today) && ['expired', 'blocked', 'invalid_qr'].includes(a.result)).length;

  const handleSimulateScan = useCallback(async () => {
    if (!connected || scanning) return;
    setScanning(true);
    try {
      const member = selectedMemberId ? members.find(m => m.id === selectedMemberId) : undefined;
      const rawQrCode = member ? undefined : `QR-SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const result = member ? resultFromMemberStatus(member.status) : 'invalid_qr';
      const timestamp = new Date().toISOString();
      const days = member?.expirationDate ? daysUntil(member.expirationDate) : undefined;
      const membership = member ? memberships.find(ms => ms.id === member.membershipId) : undefined;

      const entry: AccessLog = {
        id: `sim-${Date.now()}`,
        gymId: member?.gymId ?? '',
        memberId: member?.id,
        memberNumber: member?.memberNumber,
        memberName: member ? `${member.firstName} ${member.lastName}` : undefined,
        membershipName: membership?.name,
        result,
        timestamp,
        reader: 'Entrada principal',
        membershipExpirationDate: member?.expirationDate,
        daysUntilExpiration: days != null && days >= 0 ? days : undefined,
        daysSinceExpiration: days != null && days < 0 ? Math.abs(days) : undefined,
        lastPaymentDate: member?.lastPaymentDate,
        blockReason: member?.blockReason,
        rawQrCode,
      };

      await addAccessLog(entry);
      setActivePopup(entry);
    } finally {
      setScanning(false);
    }
  }, [connected, scanning, selectedMemberId, members, memberships, addAccessLog]);

  const activeMembers = members.filter(m => m.status !== 'archived');

  return (
    <AppShell>
      <Header
        title="Monitor de Acceso"
        subtitle="Recepción — Entrada principal"
        actions={
          <div className="flex items-center gap-3">
            <button onClick={() => setConnected(c => !c)} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5">
              Simular {connected ? 'desconexión' : 'conexión'}
            </button>
            <ConnectionIndicator connected={connected} />
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

        {/* Simulate scan panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Simular escaneo QR</h2>
          <div className="flex gap-3 flex-wrap">
            <select
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              className="flex-1 min-w-48 text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— QR inválido / desconocido —</option>
              {activeMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.memberNumber} — {m.firstName} {m.lastName} ({m.status === 'active' ? 'activo' : m.status === 'expired' ? 'vencido' : m.status === 'blocked' ? 'bloqueado' : m.status})
                </option>
              ))}
            </select>
            <button
              onClick={handleSimulateScan}
              disabled={!connected || scanning}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              {scanning ? 'Escaneando...' : 'Simular escaneo'}
            </button>
          </div>
          {!connected && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              Sistema sin conexión. Los escaneos no están disponibles. Puedes registrar acceso manual.
            </div>
          )}
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
                  <StatusBadge status={log.result as any} />
                  <span className="text-xs text-gray-400 shrink-0">{log.timestamp.split('T')[1]?.slice(0, 5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Access Popup */}
      <AccessPopup
        log={activePopup}
        onClose={() => setActivePopup(null)}
        autoCloseSecs={6}
        onRegisterPayment={(memberId) => {
          window.location.href = `/members/${memberId}`;
        }}
        onTemporaryAccess={(memberId) => {
          window.location.href = `/members/${memberId}`;
        }}
      />
    </AppShell>
  );
}
