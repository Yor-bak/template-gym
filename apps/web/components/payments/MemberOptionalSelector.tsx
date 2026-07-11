'use client';
import { useMemo, useState } from 'react';
import { Search, X, User } from 'lucide-react';
import { useStore } from '@/lib/store';
import { normalizePhone } from '@/lib/utils';
import type { Member } from '@/types';

interface MemberOptionalSelectorProps {
  memberId: string;
  onChange: (memberId: string) => void;
}

// Búsqueda por nombre, teléfono o número de miembro — nunca obligatoria
// ("Continuar sin cliente" es simplemente no seleccionar nada).
export function MemberOptionalSelector({ memberId, onChange }: MemberOptionalSelectorProps) {
  const { members } = useStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = members.find((m) => m.id === memberId);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const qDigits = normalizePhone(query);
    return members
      .filter((m) => m.status !== 'archived')
      .filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.memberNumber.toLowerCase().includes(q) ||
        (qDigits.length > 0 && normalizePhone(m.phone).includes(qDigits))
      )
      .slice(0, 6);
  }, [members, query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <User className="w-4 h-4" />
          {selected.firstName} {selected.lastName} <span className="text-blue-500 text-xs">({selected.memberNumber})</span>
        </div>
        <button onClick={() => onChange('')} className="text-blue-400 hover:text-blue-700"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar por nombre, teléfono o número (opcional)..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {matches.map((m: Member) => (
            <button
              key={m.id}
              onMouseDown={() => { onChange(m.id); setQuery(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
            >
              <span className="text-gray-900">{m.firstName} {m.lastName}</span>
              <span className="text-gray-400 text-xs">{m.memberNumber}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-1">Déjalo vacío para continuar como venta de mostrador.</p>
    </div>
  );
}
