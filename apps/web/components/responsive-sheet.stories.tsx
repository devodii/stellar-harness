import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { JsonView } from './json-view';
import { ResponsiveSheet } from './responsive-sheet';
import { Button } from './ui/button';

function SheetDemo({ withFooter = true }: { withFooter?: boolean }) {
  const [open, setOpen] = React.useState(true);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Open sheet
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="OP_NO_TRUST_CLUSTER"
        description={<div className="text-xs">Synthetic finding for the story.</div>}
        footer={withFooter ? <Button type="button">Open in chat</Button> : undefined}
      >
        <JsonView value={{ count: 12, firstLedger: 1000001, lastLedger: 1000300 }} />
      </ResponsiveSheet>
    </>
  );
}

const meta: Meta<typeof SheetDemo> = {
  component: SheetDemo,
  title: 'components/ResponsiveSheet',
};
export default meta;

type Story = StoryObj<typeof SheetDemo>;

export const Default: Story = {};

export const WithoutFooter: Story = { args: { withFooter: false } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
