import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  /** Porcentaje de cambio. null/undefined = sin comparativo disponible. */
  value: number | null | undefined;
  /** Ej. "vs. ayer", "vs. mes anterior". */
  label: string;
  className?: string;
}

// Texto y símbolo siempre visibles (nunca solo color), para positivo/negativo/neutro.
export function TrendIndicator({ value, label, className }: TrendIndicatorProps) {
  if (value === null || value === undefined) {
    return <p className={cn('text-xs text-gray-400', className)}>Sin datos {label}</p>;
  }

  const rounded = Math.round(value);
  const isNeutral = rounded === 0;
  const isPositive = rounded > 0;

  return (
    <p
      className={cn(
        'text-xs font-medium',
        isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600',
        className
      )}
    >
      {isNeutral ? 'Sin cambio' : `${isPositive ? '+' : ''}${rounded}%`} {label}
    </p>
  );
}
