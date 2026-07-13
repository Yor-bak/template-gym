// Utilidad mínima para exportar datos tabulares a CSV y disparar la descarga
// en el navegador. Incluye BOM UTF-8 para que Excel respete los acentos.

type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const lines = [headers, ...rows].map(row => row.map(escapeCell).join(','));
  const csv = '﻿' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
