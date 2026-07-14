'use client';
import { useEffect, useRef, useState } from 'react';
import { X, CreditCard, Clock, Info, TestTube2 } from 'lucide-react';
import type { AccessLog } from '@/types';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { MembershipStatusBadge } from './MembershipStatusBadge';
import { formatDate, formatDateTime, formatTime } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';

interface MembershipStatusPopupProps {
  log: AccessLog | null;
  onClose: () => void;
  autoCloseSecs?: number;
  onRegisterPayment?: (memberId: string) => void;
}

const EXPLANATIONS: Record<AccessLog['result'], string> = {
  authorized: 'La membresía está vigente, sin acciones pendientes.',
  expiring_soon: 'La membresía vence pronto — conviene ofrecer la renovación.',
  expired: 'La membresía ya venció. Se puede registrar el pago o dar una prórroga temporal.',
  blocked: 'El acceso de este miembro fue bloqueado manualmente.',
  invalid_qr: 'El código escaneado no corresponde a ningún miembro registrado.',
  temporary_access: 'Este miembro tiene un acceso temporal autorizado, aunque su membresía esté vencida.',
  manual: 'Acceso registrado manualmente por recepción.',
};

// Popup compacto (no fullscreen) para el resultado de un escaneo de acceso.
// Se muestra desde ScannerMiniPanel, reutilizado tanto en Inicio como en el
// Monitor de Acceso — una sola implementación del popup en todo el dashboard.
export function MembershipStatusPopup({ log, onClose, autoCloseSecs = 6, onRegisterPayment }: MembershipStatusPopupProps) {
  const { members, updateMember } = useStore();
  const { user } = useAuth();
  const [showReason, setShowReason] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!log) return;
    closeBtnRef.current?.focus();
    const t = setTimeout(onClose, autoCloseSecs * 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [log, onClose, autoCloseSecs]);

  if (!log) return null;

  const member = log.memberId ? members.find((m) => m.id === log.memberId) : undefined;

  const handleExtension = () => {
    if (!log.memberId) return;
    const until = new Date();
    until.setHours(until.getHours() + 24);
    updateMember(log.memberId, {
      status: 'temporary_access',
      temporaryAccessUntil: until.toISOString(),
      temporaryAccessBy: user ? `${user.firstName} ${user.lastName}` : 'Recepción',
      temporaryAccessReason: 'Prórroga otorgada desde Inicio',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Estado de membresía"
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-400">Escaneado a las {formatTime(log.timestamp)}</span>
          <div className="flex items-center gap-2">
            {log.source === 'simulation' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                <TestTube2 className="w-3 h-3" /> Simulado
              </span>
            )}
            <button ref={closeBtnRef} onClick={onClose} aria-label="Cerrar" className="p-1 text-gray-400 hover:text-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {log.memberId ? (
            <div className="flex items-center gap-3">
              <MemberAvatar firstName={log.memberName?.split(' ')[0] ?? 'M'} lastName={log.memberName?.split(' ')[1] ?? 'M'} size="lg" />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{log.memberName}</p>
                <p className="text-xs text-gray-400">{log.memberNumber}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-700 font-medium">Miembro no identificado</p>
              {log.rawQrCode && <p className="text-xs text-gray-400 font-mono mt-0.5">{log.rawQrCode}</p>}
            </div>
          )}

          <MembershipStatusBadge result={log.result} />

          <div className="grid grid-cols-2 gap-2 text-xs">
            {log.memberId && (
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-400">Membresía</p>
                <p className="font-medium text-gray-900">{log.membershipName ?? 'Sin membresía asignada'}</p>
              </div>
            )}
            {log.memberId && (
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-400">Vencimiento</p>
                <p className="font-medium text-gray-900">
                  {log.membershipExpirationDate ? formatDate(log.membershipExpirationDate) : 'Fecha no disponible'}
                </p>
              </div>
            )}
            {log.daysUntilExpiration !== undefined && (
              <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                <p className="text-gray-400">Días restantes</p>
                <p className="font-medium text-gray-900">{log.daysUntilExpiration} días</p>
              </div>
            )}
            {log.daysSinceExpiration !== undefined && (
              <div className="bg-red-50 rounded-lg p-2 col-span-2">
                <p className="text-red-400">Vencida hace</p>
                <p className="font-medium text-red-700">{log.daysSinceExpiration} días</p>
              </div>
            )}
            {log.result === 'temporary_access' && member?.temporaryAccessUntil && (
              <div className="bg-blue-50 rounded-lg p-2 col-span-2">
                <p className="text-blue-400">Acceso temporal expira</p>
                <p className="font-medium text-blue-700">{formatDateTime(member.temporaryAccessUntil)}</p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{EXPLANATIONS[log.result] ?? 'Sin información adicional.'}</span>
          </div>

          {log.result === 'blocked' && (
            <div>
              {!showReason ? (
                <button onClick={() => setShowReason(true)} className="text-xs text-blue-600 hover:underline">Ver motivo</button>
              ) : (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{log.blockReason ?? 'Sin motivo registrado.'}</p>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          {(log.result === 'expired' || log.result === 'expiring_soon') && onRegisterPayment && log.memberId && (
            <button onClick={() => { onRegisterPayment(log.memberId!); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 btn-primary text-xs font-medium rounded-lg">
              <CreditCard className="w-3.5 h-3.5" /> Registrar pago
            </button>
          )}
          {log.result === 'expired' && log.memberId && (
            <button onClick={handleExtension} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50">
              <Clock className="w-3.5 h-3.5" /> Dar prórroga
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cerrar ({autoCloseSecs}s)
          </button>
        </div>
      </div>
    </div>
  );
}
