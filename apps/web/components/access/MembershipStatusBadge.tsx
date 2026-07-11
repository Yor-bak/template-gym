import { CheckCircle2, AlertTriangle, XCircle, Ban, Clock, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccessResult } from '@/types';

const META: Record<AccessResult, { label: string; icon: typeof CheckCircle2; className: string }> = {
  authorized: { label: 'Al día', icon: CheckCircle2, className: 'bg-green-100 text-green-800' },
  expiring_soon: { label: 'Por vencer', icon: AlertTriangle, className: 'bg-yellow-100 text-yellow-800' },
  expired: { label: 'Vencido', icon: XCircle, className: 'bg-red-100 text-red-800' },
  blocked: { label: 'Bloqueado', icon: Ban, className: 'bg-gray-900 text-white' },
  temporary_access: { label: 'Acceso temporal', icon: Clock, className: 'bg-blue-100 text-blue-800' },
  invalid_qr: { label: 'QR inválido', icon: XCircle, className: 'bg-red-100 text-red-800' },
  manual: { label: 'Registro manual', icon: Clock, className: 'bg-blue-100 text-blue-800' },
};

// Respaldo defensivo: si algún día llega un valor fuera de AccessResult (dato
// incompleto, backend nuevo, etc.) el badge nunca debe romper la página —
// pero esto no reemplaza corregir la causa cuando el valor sí es incorrecto.
const FALLBACK_META = { label: 'Estado desconocido', icon: HelpCircle, className: 'bg-gray-100 text-gray-600' };

/** Badge con ícono + texto (nunca solo color) para el estado de membresía de un escaneo. */
export function MembershipStatusBadge({ result, className }: { result: AccessResult; className?: string }) {
  const meta = META[result] ?? FALLBACK_META;
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium', meta.className, className)}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}
