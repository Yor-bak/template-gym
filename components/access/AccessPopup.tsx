'use client';
import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, CreditCard, UserX } from 'lucide-react';
import type { AccessLog } from '@/types';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';

interface AccessPopupProps {
  log: AccessLog | null;
  onClose: () => void;
  autoCloseSecs?: number;
  onRegisterPayment?: (memberId: string) => void;
  onTemporaryAccess?: (memberId: string) => void;
}

export function AccessPopup({ log, onClose, autoCloseSecs = 6, onRegisterPayment, onTemporaryAccess }: AccessPopupProps) {
  useEffect(() => {
    if (!log) return;
    const t = setTimeout(onClose, autoCloseSecs * 1000);
    return () => clearTimeout(t);
  }, [log, onClose, autoCloseSecs]);

  if (!log) return null;

  const isAuthorized = log.result === 'authorized' || log.result === 'expiring_soon' || log.result === 'temporary_access';
  const isRejected = !isAuthorized;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden border-4 ${isAuthorized ? 'border-green-500' : 'border-red-500'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Color Header */}
        <div className={`px-6 py-5 flex items-center gap-4 ${isAuthorized ? 'bg-green-500' : 'bg-red-500'}`}>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            {isAuthorized
              ? <CheckCircle className="w-8 h-8 text-white" />
              : log.result === 'blocked' ? <UserX className="w-8 h-8 text-white" />
              : <XCircle className="w-8 h-8 text-white" />
            }
          </div>
          <div>
            <p className="text-white text-xl font-bold">
              {isAuthorized ? 'Acceso Autorizado' : 'Acceso Rechazado'}
            </p>
            <p className="text-white/80 text-sm">
              {log.result === 'expiring_soon' && `Membresía vence en ${log.daysUntilExpiration} días`}
              {log.result === 'expired' && `Venció hace ${log.daysSinceExpiration} días`}
              {log.result === 'blocked' && 'Usuario bloqueado'}
              {log.result === 'invalid_qr' && 'Código QR no reconocido'}
              {log.result === 'temporary_access' && 'Acceso temporal activo'}
              {log.result === 'authorized' && `Vence: ${log.membershipExpirationDate ? formatDate(log.membershipExpirationDate) : '—'}`}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white p-6">
          {log.memberId ? (
            <>
              <div className="flex items-center gap-4 mb-5">
                <MemberAvatar firstName={log.memberName?.split(' ')[0] ?? 'M'} lastName={log.memberName?.split(' ')[1] ?? 'M'} size="xl" />
                <div>
                  <p className="text-xl font-semibold text-gray-900">{log.memberName}</p>
                  <p className="text-sm text-gray-500">{log.memberNumber}</p>
                  <p className="text-sm text-blue-600 font-medium">{log.membershipName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Hora de acceso</p>
                  <p className="font-medium text-gray-900">{formatTime(log.timestamp)}</p>
                </div>
                {log.membershipExpirationDate && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Vencimiento</p>
                    <p className="font-medium text-gray-900">{formatDate(log.membershipExpirationDate)}</p>
                  </div>
                )}
                {log.daysUntilExpiration !== undefined && (
                  <div className={`rounded-lg p-3 ${log.daysUntilExpiration <= 3 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                    <p className="text-gray-400 text-xs">Días restantes</p>
                    <p className={`font-medium ${log.daysUntilExpiration <= 3 ? 'text-yellow-700' : 'text-gray-900'}`}>{log.daysUntilExpiration} días</p>
                  </div>
                )}
                {log.lastPaymentDate && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Último pago</p>
                    <p className="font-medium text-gray-900">{formatDate(log.lastPaymentDate)}</p>
                  </div>
                )}
              </div>
              {log.blockReason && (
                <div className="mt-3 bg-red-50 rounded-lg p-3 text-sm">
                  <p className="text-red-700 font-medium">Motivo de bloqueo</p>
                  <p className="text-red-600">{log.blockReason}</p>
                </div>
              )}
              {log.result === 'expiring_soon' && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Recuerda al miembro que debe renovar pronto.</span>
                </div>
              )}
              {(log.result === 'expired' || log.result === 'blocked') && onRegisterPayment && (
                <div className="mt-4 flex gap-3">
                  {log.result === 'expired' && (
                    <>
                      <button onClick={() => { onRegisterPayment(log.memberId!); onClose(); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                        <CreditCard className="w-4 h-4" /> Registrar pago
                      </button>
                      {onTemporaryAccess && (
                        <button onClick={() => { onTemporaryAccess(log.memberId!); onClose(); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                          <Clock className="w-4 h-4" /> Acceso temporal
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-700 font-medium">Código QR no registrado</p>
              <p className="text-gray-400 text-sm mt-1">No se encontró ningún miembro con este código.</p>
              {log.rawQrCode && <p className="text-xs text-gray-300 mt-2 font-mono">{log.rawQrCode}</p>}
            </div>
          )}
          <button onClick={onClose} className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-gray-600">
            Cerrar ({autoCloseSecs}s)
          </button>
        </div>
      </div>
    </div>
  );
}
