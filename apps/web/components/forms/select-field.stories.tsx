import { SEVERITIES } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { SelectField } from './select-field';
import { FieldStory } from './story-utils';

const OPTIONS = SEVERITIES.map((value) => ({ value, label: value }));

const meta: Meta = {
  title: 'components/forms/SelectField',
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ severity: z.string() })} defaultValues={{ severity: '' }}>
      {(control) => (
        <SelectField control={control} name="severity" label="severity" options={OPTIONS} />
      )}
    </FieldStory>
  ),
};

export const WithAnyOption: Story = {
  render: () => (
    <FieldStory schema={z.object({ severity: z.string() })} defaultValues={{ severity: '' }}>
      {(control) => (
        <SelectField
          control={control}
          name="severity"
          label="severity"
          options={OPTIONS}
          anyLabel="any severity"
          description="Leave on any to include every severity."
        />
      )}
    </FieldStory>
  ),
};
