import { FINDING_TYPES } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { MultiSelectField } from './multi-select-field';
import { FieldStory } from './story-utils';

const OPTIONS = FINDING_TYPES.map((value) => ({ value, label: value.toLowerCase() }));

const meta: Meta = {
  title: 'components/forms/MultiSelectField',
};
export default meta;

type Story = StoryObj;

export const Empty: Story = {
  render: () => (
    <FieldStory schema={z.object({ type: z.array(z.string()) })} defaultValues={{ type: [] }}>
      {(control) => (
        <MultiSelectField control={control} name="type" label="type" options={OPTIONS} />
      )}
    </FieldStory>
  ),
};

export const Preselected: Story = {
  render: () => (
    <FieldStory
      schema={z.object({ type: z.array(z.string()) })}
      defaultValues={{ type: ['TX_BAD_SEQ_CLUSTER', 'OP_NO_TRUST_CLUSTER'] }}
    >
      {(control) => (
        <MultiSelectField control={control} name="type" label="type" options={OPTIONS} />
      )}
    </FieldStory>
  ),
};
