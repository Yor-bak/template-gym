'use client';
import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useScanner } from '@/lib/camera/ScannerContext';

export function ManualCodeEntry() {
  const scanner = useScanner();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const submit = () => {
    if (!value.trim()) return;
    scanner.scanCode(value, 'manual', scanner.mode === 'access' ? 'qr_code' : null);
    setValue('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
      >
        <Keyboard className="w-3.5 h-3.5" /> Ingresar código manualmente
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={scanner.mode === 'access' ? 'Número de miembro (ej. AF-00001)' : 'SKU / código de barras'}
        className="flex-1 min-w-40 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      <button onClick={submit} className="px-3 py-2 text-xs font-medium btn-primary rounded-lg">
        Validar
      </button>
      <button onClick={() => setOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
