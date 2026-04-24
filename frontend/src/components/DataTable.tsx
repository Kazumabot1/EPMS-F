import type { ReactNode } from 'react';

type Column<T> = {
  key: keyof T | string;
  title: string;
  render?: (item: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  rowKey: (item: T) => string;
  emptyText?: string;
};

const DataTable = <T,>({ columns, data, rowKey, emptyText = 'No records found.' }: DataTableProps<T>) => {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-4 py-3 text-left font-semibold text-slate-600">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={rowKey(item)} className="border-t border-slate-100">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-slate-700">
                    {column.render ? column.render(item) : String(item[column.key as keyof T] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
