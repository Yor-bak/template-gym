import { cn } from '@/lib/utils';

type BadgeVariant = 'active' | 'expiring_soon' | 'expired' | 'blocked' | 'temporary_access' | 'already_entered' | 'pending_activation' | 'archived' | 'authorized' | 'invalid_qr' | 'manual' | 'confirmed' | 'cancelled' | 'corrected' | 'pending' | 'operating' | 'maintenance' | 'out_of_service' | 'low_stock';

const styles: Record<BadgeVariant, string> = {
  active: 'bg-green-100 text-green-800',
  expiring_soon: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  blocked: 'bg-gray-900 text-white',
  temporary_access: 'bg-blue-100 text-blue-800',
  already_entered: 'bg-orange-100 text-orange-800',
  pending_activation: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-100 text-gray-500',
  authorized: 'bg-green-100 text-green-800',
  invalid_qr: 'bg-red-100 text-red-800',
  manual: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  corrected: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-600',
  operating: 'bg-green-100 text-green-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  out_of_service: 'bg-red-100 text-red-800',
  low_stock: 'bg-orange-100 text-orange-600',
};

const labels: Record<BadgeVariant, string> = {
  active: 'Activo', expiring_soon: 'Por vencer', expired: 'Vencido', blocked: 'Bloqueado',
  temporary_access: 'Acceso temporal', already_entered: 'Ya ingresó', pending_activation: 'Pendiente', archived: 'Archivado',
  authorized: 'Autorizado', invalid_qr: 'QR inválido', manual: 'Manual',
  confirmed: 'Confirmado', cancelled: 'Cancelado', corrected: 'Corregido', pending: 'Pendiente',
  operating: 'Operando', maintenance: 'En mantenimiento', out_of_service: 'Fuera de servicio', low_stock: 'Bajo stock',
};

export function StatusBadge({ status, className }: { status: BadgeVariant; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', styles[status] ?? 'bg-gray-100 text-gray-600', className)}>
      {labels[status] ?? status}
    </span>
  );
}
