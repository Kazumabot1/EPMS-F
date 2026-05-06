/** Shared KPI template UI helpers (Tailwind class strings). EPMS violet-aligned. */

export function kpiStatusBadgeClass(status: string): string {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';
  switch (status) {
    case 'ACTIVE':
      return `${base} bg-emerald-50 text-emerald-800 ring-emerald-600/15`;
    case 'FINALIZED':
      return `${base} bg-sky-50 text-sky-900 ring-sky-600/15`;
    case 'SENT':
      return `${base} bg-violet-50 text-violet-900 ring-violet-600/15`;
    case 'ARCHIVED':
      return `${base} bg-gray-100 text-gray-600 ring-gray-400/20`;
    case 'DRAFT':
    default:
      return `${base} bg-violet-50/80 text-violet-900 ring-violet-500/20`;
  }
}

export type KpiTemplateDurationMonths = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const KPI_TEMPLATE_DURATION_OPTIONS: Array<{ value: KpiTemplateDurationMonths; label: string }> = [
  { value: 3, label: '3 months' },
  { value: 4, label: '4 months' },
  { value: 5, label: '5 months' },
  { value: 6, label: '6 months' },
  { value: 7, label: '7 months' },
  { value: 8, label: '8 months' },
  { value: 9, label: '9 months' },
  { value: 10, label: '10 months' },
  { value: 11, label: '11 months' },
  { value: 12, label: '1 year' },
];

export const DEFAULT_KPI_TEMPLATE_DURATION_MONTHS: KpiTemplateDurationMonths = 12;

const toDateInputValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function calculateKpiTemplateEndDate(startDate: string, durationMonths: KpiTemplateDurationMonths): string {
  if (!startDate) return '';
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);
  end.setDate(end.getDate() - 1);
  return toDateInputValue(end);
}

export function inferKpiTemplateDurationMonths(startDate: string, endDate: string): KpiTemplateDurationMonths {
  const matched = KPI_TEMPLATE_DURATION_OPTIONS.find(
    (option) => calculateKpiTemplateEndDate(startDate, option.value) === endDate,
  );
  return matched?.value ?? DEFAULT_KPI_TEMPLATE_DURATION_MONTHS;
}
