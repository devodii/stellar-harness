'use client';

import { CheckCircleIcon } from '@phosphor-icons/react/ssr';
import { cn } from 'cn';
import * as React from 'react';
import { Form } from '@/components/forms/form';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { useZodForm } from '@/hooks/use-zod-form';
import { WaitlistBody } from '@/lib/api-schemas';
import { type RequestPilot, waitingLabel } from '@/lib/waitlist';

export const CONNECT_TITLE = 'Connect your organisation';

export const CONNECT_BODY =
  'Register the accounts, contracts and anchor domain you operate. The harness watches them continuously, reports findings the moment they appear, and prepares the fix with its cost. Execution under an OpenZeppelin smart-account policy, with passkey approval, is the next phase. Leave an email to be included in the pilot.';

export interface ConnectFormProps {
  requestPilot: RequestPilot;
  className?: string;
}

export function ConnectForm({ requestPilot, className }: ConnectFormProps) {
  const form = useZodForm(WaitlistBody, { defaultValues: { email: '' } });
  const [waiting, setWaiting] = React.useState<number>();

  const submit = async (values: WaitlistBody) => {
    const result = await requestPilot({ email: values.email.trim() });
    if (result.ok) setWaiting(result.value.count);
    return result;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm leading-relaxed text-muted-foreground">{CONNECT_BODY}</p>
      {waiting === undefined ? (
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
          <Button type="submit" size="sm" className="font-mono">
            request pilot
          </Button>
        </Form>
      ) : (
        <p role="status" className="flex items-center gap-2 font-mono text-xs text-success">
          <CheckCircleIcon className="size-4 shrink-0" aria-hidden />
          {waitingLabel(waiting)}
        </p>
      )}
    </div>
  );
}
