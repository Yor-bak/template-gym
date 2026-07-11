'use client';
import { Search, X } from 'lucide-react';

interface FilterOption { value: string; label: string; }

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: { key: string; label: string; value: string; options: FilterOption[]; onChange: (v: string) => void }[];
  onClear?: () => void;
}

export function FilterBar({ search, onSearchChange, searchPlaceholder = 'Buscar...', filters = [], onClear }: FilterBarProps) {
  const hasFilters = search || filters.some(f => f.value);
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-2 focus:border-[var(--primary)]"
        />
      </div>
      {filters.map(f => (
        <select key={f.key} value={f.value} onChange={e => f.onChange(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-2 focus:border-[var(--primary)]">
          <option value="">{f.label}</option>
          {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
      {hasFilters && onClear && (
        <button onClick={onClear} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <X className="w-4 h-4" /> Limpiar
        </button>
      )}
    </div>
  );
}
