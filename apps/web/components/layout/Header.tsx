'use client';
import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useCamera } from '@/lib/camera/CameraContext';
import { useScanner } from '@/lib/camera/ScannerContext';
import { CameraStatus, effectiveCameraStatus } from '@/components/camera/CameraStatus';
import { CameraSettingsPanel } from '@/components/camera/CameraSettingsPanel';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

function CameraIndicator() {
  const camera = useCamera();
  const scanner = useScanner();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="hover:opacity-80">
        <CameraStatus status={effectiveCameraStatus(camera.status, scanner.reading)} compact />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
          <CameraSettingsPanel compact />
        </div>
      )}
    </div>
  );
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-heading font-extrabold uppercase tracking-wide text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <CameraIndicator />
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--danger)] rounded-full" />
        </button>
      </div>
    </header>
  );
}
