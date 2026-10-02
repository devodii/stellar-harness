import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { DetailDrawer } from './detail-drawer';
import { JsonView } from './json-view';
import { Button } from './ui/button';

function DrawerDemo({ withFooter = true }: { withFooter?: boolean }) {
  const [open, setOpen] = React.useState(true);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Open drawer
      </Button>
      <DetailDrawer
        open={open}
        onOpenChange={setOpen}
        title="OP_NO_TRUST_CLUSTER"
        description={<div className="text-xs">Synthetic finding for the story.</div>}
        footer={withFooter ? <Button type="button">Open in chat</Button> : undefined}
      >
        <JsonView value={{ count: 12, firstLedger: 1000001, lastLedger: 1000300 }} />
      </DetailDrawer>
    </>
  );
}

const meta: Meta<typeof DrawerDemo> = {
  component: DrawerDemo,
  title: 'components/DetailDrawer',
};
export default meta;

type Story = StoryObj<typeof DrawerDemo>;

export const Default: Story = {};

export const WithoutFooter: Story = { args: { withFooter: false } };
