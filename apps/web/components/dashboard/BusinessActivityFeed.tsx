import { CreditCard, UserPlus, RefreshCcw, ShoppingCart, Undo2 } from 'lucide-react';
import { formatCurrency, formatTime } from '@/lib/utils';

export type BusinessActivityType = 'payment' | 'new_member' | 'renewal' | 'sale' | 'payment_correction';

export interface BusinessActivityEvent {
  id: string;
  type: BusinessActivityType;
  title: string;
  detail: string;
  amount?: number;
  quantity?: number;
  time: string;
  employee?: string;
}

const META: Record<BusinessActivityType, { icon: typeof CreditCard; className: string }> = {
  payment: { icon: CreditCard, className: 'bg-green-100 text-green-600' },
  renewal: { icon: RefreshCcw, className: 'bg-blue-100 text-blue-600' },
  new_member: { icon: UserPlus, className: 'bg-purple-100 text-purple-600' },
  sale: { icon: ShoppingCart, className: 'bg-amber-100 text-amber-600' },
  payment_correction: { icon: Undo2, className: 'bg-red-100 text-red-600' },
};

// Solo movimientos de negocio del día actual (ventas, altas, pagos, correcciones).
// Los accesos físicos viven en RecentAccessFeed — nunca se mezclan aquí.
export function BusinessActivityFeed({ events }: { events: BusinessActivityEvent[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Actividad reciente</h2>
      </div>
      {events.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Todavía no hay actividad registrada hoy.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {events.map((ev) => {
            const meta = META[ev.type];
            const Icon = meta.icon;
            return (
              <div key={ev.id} className="px-5 py-3 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.className}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500">{ev.title}</p>
                  <p className="text-sm text-gray-800 leading-snug truncate">
                    {ev.detail}
                    {ev.amount !== undefined && <span className="font-medium"> — {formatCurrency(ev.amount)}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatTime(ev.time)}
                    {ev.employee && <span> · {ev.employee}</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
