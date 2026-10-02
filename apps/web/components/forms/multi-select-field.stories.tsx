import { OPERATIONS } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { MultiSelectField } from './multi-select-field';
import { FieldStory } from './story-utils';

const OPTIONS = OPERATIONS.map((value) => ({ value, label: value }));

const meta: Meta = {
  title: 'components/forms/MultiSelectField',
};
export default meta;

type Story = StoryObj;

export const Empty: Story = {
  render: () => (
    <FieldStory schema={z.object({ type: z.array(z.string()) })} defaultValues={{ type: [] }}>
      {(control) => (
        <MultiSelectField control={control} name="type" label="operations" options={OPTIONS} />
      )}
    </FieldStory>
  ),
};

export const Preselected: Story = {
  render: () => (
    <FieldStory
      schema={z.object({ type: z.array(z.string()) })}
      defaultValues={{ type: ['extend_ttl', 'restore'] }}
    >
      {(control) => (
        <MultiSelectField control={control} name="type" label="operations" options={OPTIONS} />
      )}
    </FieldStory>
  ),
};
