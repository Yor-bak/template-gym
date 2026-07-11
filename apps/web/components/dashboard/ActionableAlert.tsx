import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertPriority = 'high' | 'medium' | 'low';

interface ActionableAlertProps {
  message: string;
  priority: AlertPriority;
  actionLabel: string;
  onAction: () => void;
}

const META: Record<AlertPriority, { icon: typeof AlertOctagon; className: string; label: string }> = {
  high: { icon: AlertOctagon, className: 'border-red-200 bg-red-50 text-red-700', label: 'Prioridad alta' },
  medium: { icon: AlertTriangle, className: 'border-yellow-200 bg-yellow-50 text-yellow-700', label: 'Prioridad media' },
  low: { icon: Info, className: 'border-blue-200 bg-blue-50 text-blue-700', label: 'Prioridad baja' },
};

// Alerta accionable: nunca solo informativa, siempre trae un botón funcional.
export function ActionableAlert({ message, priority, actionLabel, onAction }: ActionableAlertProps) {
  const meta = META[priority];
  const Icon = meta.icon;
  return (
    <div className={cn('rounded-lg border p-3', meta.className)}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-snug">{message}</p>
          <span className="text-[10px] uppercase tracking-wide opacity-70">{meta.label}</span>
        </div>
      </div>
      <button
        onClick={onAction}
        className="mt-2 w-full text-xs font-medium py-1.5 rounded-md bg-white/70 hover:bg-white border border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {actionLabel}
      </button>
    </div>
  );
}
