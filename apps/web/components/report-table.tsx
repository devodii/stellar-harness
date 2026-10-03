import { cn } from 'cn';
import type * as React from 'react';

export interface ReportColumn<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
  wrap?: boolean;
}

export interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
}

export function ReportTable<T>({ columns, rows, rowKey, empty = 'No rows.' }: ReportTableProps<T>) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full font-mono text-xs">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={cn(
                  'px-3 py-2 font-normal whitespace-nowrap text-muted-foreground',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t">
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={cn(
                    'px-3 py-1.5 align-top',
                    column.wrap ? 'min-w-64 whitespace-normal' : 'whitespace-nowrap',
                    column.align === 'right' && 'text-right tabular-nums',
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
