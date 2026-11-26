export type CsvColumn<T> = { key: keyof T & string; label: string; format?: (row: T) => string };

function cell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => cell(c.label)).join(';');
  const body = rows.map((r) =>
    columns.map((c) => cell(c.format ? c.format(r) : (r as Record<string, unknown>)[c.key])).join(';'),
  );
  return '﻿' + [head, ...body].join('\r\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Centesimi in formato numerico per Excel italiano (es. 12,50). */
export function centsForCsv(cents: number | null | undefined): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}
