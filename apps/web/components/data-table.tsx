'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { cn } from 'cn';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatInt } from '@/lib/format';
import { type MixinProps, splitProps } from '@/lib/mixin';

export interface DataTablePagination {
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
}

export interface DataTableProps<TData, TValue>
  extends MixinProps<'row', React.ComponentProps<typeof TableRow>>,
    MixinProps<'cell', React.ComponentProps<typeof TableCell>>,
    MixinProps<'container', React.ComponentProps<'div'>> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  emptyState: React.ReactNode;
  isLoading?: boolean;
  skeletonRowCount?: number;
  pagination?: DataTablePagination;
  clientPageSize?: number;
  density?: 'compact' | 'regular';
  toolbar?: React.ReactNode;
  className?: string;
}

const DENSITY_CELL = {
  compact: 'px-2 py-1.5 font-mono text-xs',
  regular: 'px-3 py-2 text-sm',
} as const;

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  onRowClick,
  emptyState,
  isLoading,
  skeletonRowCount = 6,
  pagination,
  clientPageSize,
  density = 'compact',
  toolbar,
  className,
  ...mixinProps
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const { row, cell, container } = splitProps(mixinProps, 'row', 'cell', 'container');

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      sorting,
      ...(pagination && {
        pagination: { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize },
      }),
    },
    initialState: clientPageSize ? { pagination: { pageIndex: 0, pageSize: clientPageSize } } : {},
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(pagination
      ? {
          manualPagination: true,
          pageCount: Math.max(1, Math.ceil(pagination.total / pagination.pageSize)),
        }
      : clientPageSize
        ? { getPaginationRowModel: getPaginationRowModel() }
        : {}),
  });

  const rows = table.getRowModel().rows;
  const cellClass = DENSITY_CELL[density];

  return (
    <div {...container} className={cn('space-y-2', container.className, className)}>
      {toolbar}
      {isLoading ? (
        <DataTableSkeleton columnCount={columns.length} rowCount={skeletonRowCount} />
      ) : rows.length === 0 ? (
        emptyState
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className="h-8 px-2 text-xs font-normal tracking-wide text-muted-foreground [font-variant-caps:all-small-caps]"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="inline-flex cursor-pointer items-center gap-1 select-none"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: '▴', desc: '▾' }[header.column.getIsSorted() as string] ?? null}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  {...row}
                  key={r.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={() => onRowClick?.(r.original)}
                  onKeyDown={(event) => {
                    if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      onRowClick(r.original);
                    }
                  }}
                  className={cn(onRowClick && 'cursor-pointer', row.className)}
                >
                  {r.getVisibleCells().map((c) => (
                    <TableCell {...cell} key={c.id} className={cn(cellClass, cell.className)}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {!isLoading && rows.length > 0 && (pagination || table.getPageCount() > 1) && (
        <DataTableFooter
          pageIndex={pagination?.pageIndex ?? table.getState().pagination.pageIndex}
          pageCount={table.getPageCount()}
          total={pagination?.total ?? data.length}
          onPageChange={(index) =>
            pagination ? pagination.onPageChange(index) : table.setPageIndex(index)
          }
        />
      )}
    </div>
  );
}

function DataTableFooter({
  pageIndex,
  pageCount,
  total,
  onPageChange,
}: {
  pageIndex: number;
  pageCount: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
}) {
  return (
    <div className="flex items-center justify-between px-1 font-mono text-xs text-muted-foreground">
      <span>
        page {pageIndex + 1}/{Math.max(pageCount, 1)} · {formatInt(total)} rows
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex <= 0}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex + 1 >= pageCount}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

const slots = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}`, index }));

function DataTableSkeleton({ columnCount, rowCount }: { columnCount: number; rowCount: number }) {
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      {slots(rowCount, 'row-').map((r) => (
        <div key={r.id} className="flex gap-3">
          {slots(columnCount, 'col-').map((c) => (
            <Skeleton
              key={c.id}
              className="h-4 flex-1"
              style={{ opacity: 1 - ((r.index * 7 + c.index * 11) % 40) / 100 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
