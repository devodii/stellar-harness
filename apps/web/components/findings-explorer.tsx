'use client';

import { FINDING_TYPES, type Finding, SEVERITIES } from '@harness/schema';
import { ChatsIcon } from '@phosphor-icons/react/ssr';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { z } from 'zod';
import { DetailDrawer } from '@/components/detail-drawer';
import { FilterBar, type FilterField } from '@/components/filter-bar';
import { FindingDetail } from '@/components/finding-detail';
import { FindingsTable } from '@/components/findings-table';
import { InlineAlert } from '@/components/inline-alert';
import { Button } from '@/components/ui/button';
import { type FindingsFilter, useFindings } from '@/hooks/use-findings';
import { FINDINGS_PAGE_SIZE } from '@/lib/api-schemas';
import { promptHref } from '@/lib/routes';
import { planFixPrompt } from '@/lib/suggestions';

const FilterSchema = z.object({
  type: z.array(z.string()),
  severity: z.array(z.string()),
  tag: z.string(),
});

const EMPTY_FILTER: FindingsFilter = { type: [], severity: [], tag: '' };

const FIELDS: FilterField<FindingsFilter>[] = [
  {
    kind: 'multi',
    name: 'type',
    label: 'type',
    className: 'sm:w-72',
    options: FINDING_TYPES.map((type) => ({ value: type, label: type.toLowerCase() })),
  },
  {
    kind: 'multi',
    name: 'severity',
    label: 'severity',
    options: SEVERITIES.map((severity) => ({ value: severity, label: severity })),
  },
  { kind: 'text', name: 'tag', label: 'tag', placeholder: 'scf_funded' },
];

export function FindingsExplorer() {
  const router = useRouter();
  const [filter, setFilter] = React.useState<FindingsFilter>(EMPTY_FILTER);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<Finding | null>(null);
  const { data, isPending, error } = useFindings(filter, pageIndex, FINDINGS_PAGE_SIZE);

  const applyFilter = React.useCallback((next: FindingsFilter) => {
    setFilter(next);
    setPageIndex(0);
  }, []);

  return (
    <div className="space-y-4">
      <FilterBar
        schema={FilterSchema}
        defaultValues={EMPTY_FILTER}
        emptyValues={EMPTY_FILTER}
        fields={FIELDS}
        onChange={applyFilter}
      />
      {error && (
        <InlineAlert tone="destructive" title="Could not load findings">
          {error.message}
        </InlineAlert>
      )}
      <FindingsTable
        rows={data?.rows ?? []}
        isLoading={isPending}
        onRowClick={setSelected}
        pagination={{
          pageIndex,
          pageSize: FINDINGS_PAGE_SIZE,
          total: data?.total ?? 0,
          onPageChange: setPageIndex,
        }}
      />
      <DetailDrawer
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.type.toLowerCase() ?? ''}
        description={
          selected ? <span className="font-mono text-xs">{selected.subject}</span> : null
        }
        footer={
          selected && (
            <Button
              type="button"
              onClick={() =>
                router.push(
                  promptHref(planFixPrompt(selected.findingId, selected.type, selected.subject)),
                )
              }
            >
              <ChatsIcon className="size-4" />
              Open in chat
            </Button>
          )
        }
      >
        {selected && <FindingDetail finding={selected} />}
      </DetailDrawer>
    </div>
  );
}
