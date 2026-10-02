import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { z } from 'zod';
import { FilterBar, type FilterField } from './filter-bar';
import { JsonView } from './json-view';

const schema = z.object({
  type: z.array(z.string()),
  severity: z.string(),
  tag: z.string(),
});
type Filters = z.infer<typeof schema>;

const EMPTY: Filters = { type: [], severity: '', tag: '' };

const FIELDS: FilterField<Filters>[] = [
  {
    kind: 'multi',
    name: 'type',
    label: 'type',
    options: ['alpha_cluster', 'beta_cluster', 'gamma_expiring'].map((v) => ({
      value: v,
      label: v,
    })),
  },
  {
    kind: 'select',
    name: 'severity',
    label: 'severity',
    options: ['critical', 'high', 'medium'].map((v) => ({ value: v, label: v })),
  },
  { kind: 'text', name: 'tag', label: 'tag', placeholder: 'scf_funded' },
];

function FilterBarDemo({ initial }: { initial: Filters }) {
  const [values, setValues] = React.useState<Filters>(initial);
  return (
    <div className="space-y-4">
      <FilterBar
        schema={schema}
        defaultValues={initial}
        emptyValues={EMPTY}
        fields={FIELDS}
        onChange={setValues}
      />
      <JsonView value={values} />
    </div>
  );
}

const meta: Meta<typeof FilterBarDemo> = {
  component: FilterBarDemo,
  title: 'components/FilterBar',
  args: { initial: EMPTY },
};
export default meta;

type Story = StoryObj<typeof FilterBarDemo>;

export const Empty: Story = {};

export const Prefilled: Story = {
  args: { initial: { type: ['beta_cluster'], severity: 'high', tag: 'anchor' } },
};
