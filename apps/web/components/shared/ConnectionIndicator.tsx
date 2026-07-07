'use client';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConnectionIndicator({ connected = true, className }: { connected?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-sm', connected ? 'text-green-600' : 'text-red-500', className)}>
      {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      <span>{connected ? 'Lector conectado' : 'Sin conexión'}</span>
      <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-green-500 animate-pulse' : 'bg-red-500')} />
    </div>
  );
}
