import type { ScanMode } from '@/types';

interface ScannerModeSelectorProps {
  mode: ScanMode;
  onChange: (mode: ScanMode) => void;
}

const OPTIONS: { key: ScanMode; label: string }[] = [
  { key: 'access', label: 'Accesos QR' },
  { key: 'inventory', label: 'Inventario' },
];

export function ScannerModeSelector({ mode, onChange }: ScannerModeSelectorProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs" role="tablist" aria-label="Modo de escaneo">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={mode === o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${mode === o.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
