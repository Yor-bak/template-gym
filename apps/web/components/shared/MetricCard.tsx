import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { TrendIndicator } from './TrendIndicator';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number | null; label: string };
  onClick?: () => void;
}

export function MetricCard({ title, value, subtitle, icon: Icon, iconColor = 'text-blue-600', trend, onClick }: MetricCardProps) {
  return (
    <div
      className={cn('bg-white rounded-lg border border-gray-200 p-4', onClick && 'cursor-pointer hover:border-[#3a4018] transition-colors')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={cn('font-heading font-extrabold text-[26px] leading-none mt-1', iconColor)}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && <TrendIndicator value={trend.value} label={trend.label} className="mt-1" />}
        </div>
        <div className="p-2 rounded-lg bg-[var(--surface-elevated)]">
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </div>
  );
}
