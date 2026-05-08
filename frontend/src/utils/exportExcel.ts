/**
 * exportExcel.ts
 * Thin wrapper around SheetJS (xlsx) for one-click Excel export.
 */
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
}

export function exportToExcel<T extends Record<string, unknown>>(
  rows: T[],
  columns: ExportColumn[],
  filename = 'export',
): void {
  const header = columns.map((c) => c.header);

  const data = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      if (val === null || val === undefined) return '';
      return val;
    }),
  );

  const wsData = [header, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const colWidths = columns.map((c) => {
    const maxLen = Math.max(
      c.header.length,
      ...rows.map((row) => String(row[c.key] ?? '').length),
    );

    return { wch: Math.min(maxLen + 2, 50) };
  });

  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export const todayStr = (): string => new Date().toISOString().slice(0, 10);