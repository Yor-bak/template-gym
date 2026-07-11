'use client';
import { useMemo, useState } from 'react';
import { Clock, TrendingUp, CalendarDays, Users, Moon } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { AccessLog, AccessResult } from '@/types';

type PeriodKey = '7d' | '1m' | '3m' | '6m' | '1y';
const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: '7d', label: '7 días', days: 7 },
  { key: '1m', label: '1 mes', days: 30 },
  { key: '3m', label: '3 meses', days: 90 },
  { key: '6m', label: '6 meses', days: 180 },
  { key: '1y', label: '1 año', days: 365 },
];

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5:00 - 22:00, horario de operación

// Solo cuentan como afluencia los accesos exitosos de entrada — nunca
// rechazos, QR inválidos ni intentos fallidos.
const SUCCESS_RESULTS: AccessResult[] = ['authorized', 'expiring_soon', 'temporary_access'];

const ACCESS_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos los accesos exitosos' },
  { value: 'authorized', label: 'Autorizado' },
  { value: 'expiring_soon', label: 'Por vencer' },
  { value: 'temporary_access', label: 'Acceso temporal' },
];

function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7; // 0=Lunes ... 6=Domingo
}

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

interface Cell {
  day: number;
  hour: number;
  total: number;
  occurrences: number;
  avg: number;
}

export function PeakHoursReport({ accessLogs }: { accessLogs: AccessLog[] }) {
  const { gym } = useStore();
  const [period, setPeriod] = useState<PeriodKey>('1m');
  const [dayFilter, setDayFilter] = useState('');
  const [hourFromFilter, setHourFromFilter] = useState('');
  const [hourToFilter, setHourToFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { start, end, days } = useMemo(() => {
    const periodDef = PERIODS.find((p) => p.key === period)!;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (periodDef.days - 1));
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { start: startDate, end: endDate, days: periodDef.days };
  }, [period]);

  const visibleHours = useMemo(() => {
    const from = hourFromFilter ? Number(hourFromFilter) : HOURS[0];
    const to = hourToFilter ? Number(hourToFilter) : HOURS[HOURS.length - 1];
    return HOURS.filter((h) => h >= from && h <= to);
  }, [hourFromFilter, hourToFilter]);

  const visibleDays = useMemo(() => (dayFilter ? [Number(dayFilter)] : [0, 1, 2, 3, 4, 5, 6]), [dayFilter]);

  const { matrix, totalEntries } = useMemo(() => {
    const occurrences = new Array(7).fill(0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      occurrences[weekdayIndex(d)]++;
    }

    const totals: number[][] = Array.from({ length: 7 }, () => HOURS.map(() => 0));
    let total = 0;

    for (const log of accessLogs) {
      if (!SUCCESS_RESULTS.includes(log.result)) continue;
      if (typeFilter && log.result !== typeFilter) continue;
      const ts = new Date(log.timestamp);
      if (ts < start || ts > end) continue;
      const wd = weekdayIndex(ts);
      const hour = ts.getHours();
      const hourIdx = HOURS.indexOf(hour);
      if (hourIdx === -1) continue;
      totals[wd][hourIdx]++;
      total++;
    }

    const cells: Cell[][] = totals.map((row, wd) =>
      row.map((t, hi) => ({ day: wd, hour: HOURS[hi], total: t, occurrences: occurrences[wd], avg: occurrences[wd] > 0 ? t / occurrences[wd] : 0 }))
    );

    return { matrix: cells, totalEntries: total };
  }, [accessLogs, start, end, typeFilter]);

  const filteredCells = useMemo(
    () => matrix.filter((row) => visibleDays.includes(row[0]?.day ?? -1)).flatMap((row) => row.filter((c) => visibleHours.includes(c.hour))),
    [matrix, visibleDays, visibleHours]
  );

  const maxAvg = Math.max(...filteredCells.map((c) => c.avg), 0.0001);
  const overallAvg = filteredCells.length > 0 ? filteredCells.reduce((s, c) => s + c.avg, 0) / filteredCells.length : 0;

  const hourTotals = HOURS.map((hour, hi) => ({ hour, total: matrix.reduce((s, row) => s + row[hi].total, 0) }));
  const peakHour = hourTotals.reduce((best, h) => (h.total > best.total ? h : best), hourTotals[0]);

  const dayTotals = matrix.map((row, wd) => ({ day: wd, total: row.reduce((s, c) => s + c.total, 0) }));
  const peakDay = dayTotals.reduce((best, d) => (d.total > best.total ? d : best), dayTotals[0]);

  const cellsWithData = filteredCells.filter((c) => c.total > 0);
  const quietest = cellsWithData.length > 0 ? cellsWithData.reduce((min, c) => (c.avg < min.avg ? c : min), cellsWithData[0]) : null;

  const avgPerDay = days > 0 ? totalEntries / days : 0;
  const hasEnoughData = totalEntries >= 5;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" /> Histórico de horas pico
        </h2>
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${period === p.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Filtros adicionales */}
        <div className="flex flex-wrap gap-2">
          <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5">
            <option value="">Todos los días</option>
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={label} value={i}>{label}</option>
            ))}
          </select>
          <select value={hourFromFilter} onChange={(e) => setHourFromFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5">
            <option value="">Desde</option>
            {HOURS.map((h) => <option key={h} value={h}>{formatHourLabel(h)}</option>)}
          </select>
          <select value={hourToFilter} onChange={(e) => setHourToFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5">
            <option value="">Hasta</option>
            {HOURS.map((h) => <option key={h} value={h}>{formatHourLabel(h)}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5">
            {ACCESS_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select disabled value="" className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-400 bg-gray-50" title="Preparado para cuando existan varias sucursales">
            <option value="">{gym?.name ?? 'Sucursal única'}</option>
          </select>
        </div>

        {!hasEnoughData ? (
          <p className="text-center text-sm text-gray-400 py-10">Todavía no hay suficientes accesos para calcular las horas pico.</p>
        ) : (
          <>
            {/* Heatmap */}
            <div className="overflow-x-auto">
              <table className="border-separate" style={{ borderSpacing: 3 }}>
                <thead>
                  <tr>
                    <th className="text-xs text-gray-400 font-normal text-left pr-2 sticky left-0 bg-white">&nbsp;</th>
                    {visibleHours.map((h) => (
                      <th key={h} className="text-[10px] text-gray-400 font-normal px-0.5" style={{ minWidth: 22 }}>{h}h</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix
                    .filter((row) => visibleDays.includes(row[0]?.day ?? -1))
                    .map((row) => (
                      <tr key={row[0]?.day}>
                        <td className="text-xs text-gray-600 pr-2 whitespace-nowrap sticky left-0 bg-white">{WEEKDAY_LABELS[row[0]?.day ?? 0]}</td>
                        {row.filter((c) => visibleHours.includes(c.hour)).map((c) => {
                          const ratio = c.avg / maxAvg;
                          const diff = c.avg - overallAvg;
                          const tooltip = `${WEEKDAY_LABELS[c.day]} ${formatHourLabel(c.hour)}\nEntradas: ${c.total}\nPromedio en esta franja: ${c.avg.toFixed(1)}\nPromedio del periodo: ${overallAvg.toFixed(1)}\nDiferencia: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`;
                          return (
                            <td key={c.hour} title={tooltip} className="rounded-sm" style={{ width: 22, height: 22, backgroundColor: c.total > 0 ? `rgba(198, 255, 61, ${Math.max(ratio, 0.12)})` : '#1c1a17' }} />
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Métricas complementarias */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Hora pico</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatHourLabel(peakHour.hour)}–{formatHourLabel(peakHour.hour + 1)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Día más concurrido</p>
                <p className="font-semibold text-gray-900 mt-0.5">{WEEKDAY_LABELS[peakDay.day]}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" /> Promedio diario</p>
                <p className="font-semibold text-gray-900 mt-0.5">{avgPerDay.toFixed(1)} entradas</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 flex items-center gap-1"><Moon className="w-3 h-3" /> Franja más tranquila</p>
                <p className="font-semibold text-gray-900 mt-0.5">{quietest ? `${WEEKDAY_LABELS[quietest.day]} ${formatHourLabel(quietest.hour)}` : '—'}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">Total de entradas en el periodo: <span className="font-medium text-gray-600">{totalEntries}</span></p>
          </>
        )}
      </div>
    </div>
  );
}
