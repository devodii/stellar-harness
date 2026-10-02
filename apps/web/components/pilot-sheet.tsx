'use client';

import * as React from 'react';
import { Form } from '@/components/forms/form';
import { TextField } from '@/components/forms/text-field';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { Button } from '@/components/ui/button';
import { useZodForm } from '@/hooks/use-zod-form';
import { PilotBody } from '@/lib/api-schemas';
import { requestPilot as defaultRequestPilot, type RequestPilot, waitingLabel } from '@/lib/pilot';

const PILOT_BODY =
  "Connect your organisation's accounts and contracts and the harness will watch them and prepare fixes. Execution under policy is next.";

export function PilotForm({ requestPilot }: { requestPilot: RequestPilot }) {
  const form = useZodForm(PilotBody, { defaultValues: { email: '' } });
  const [waiting, setWaiting] = React.useState<number>();

  const submit = async (values: PilotBody) => {
    const result = await requestPilot({ email: values.email.trim() });
    if (result.ok) setWaiting(result.value.count);
    return result;
  };

  if (waiting !== undefined) {
    return (
      <p role="status" className="font-mono text-xs">
        {waitingLabel(waiting)}
      </p>
    );
  }
  return (
    <Form form={form} onSubmit={submit}>
      <TextField
        control={form.control}
        name="email"
        label="email"
        type="email"
        autoComplete="email"
        placeholder="ops@example.org"
        mono={false}
      />
      <Button type="submit" size="sm" isLoading={form.formState.isSubmitting}>
        request a pilot
      </Button>
    </Form>
  );
}

export function PilotSheet({
  requestPilot = defaultRequestPilot,
}: {
  requestPilot?: RequestPilot;
}) {
  return (
    <ResponsiveSheet
      title="request a pilot"
      trigger={
        <Button variant="link" size="sm" className="px-0">
          request a pilot
        </Button>
      }
      description={<p className="text-sm text-muted-foreground">{PILOT_BODY}</p>}
    >
      <PilotForm requestPilot={requestPilot} />
    </ResponsiveSheet>
  );
}
