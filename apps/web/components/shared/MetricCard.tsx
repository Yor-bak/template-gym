import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
}

export function MetricCard({ title, value, subtitle, icon: Icon, iconColor = 'text-blue-600', trend, onClick }: MetricCardProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', onClick && 'cursor-pointer hover:border-blue-300 transition-colors')} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg bg-gray-50', iconColor.replace('text-', 'bg-').replace('600', '50'))}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </div>
  );
}
