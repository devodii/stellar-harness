'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import * as RHF from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const PilotForm = z.object({ email: z.email('Enter a valid email.') });
type PilotForm = z.infer<typeof PilotForm>;

export function PilotSheet() {
  const [waiting, setWaiting] = React.useState<number | null>(null);
  const form = RHF.useForm<PilotForm>({
    resolver: zodResolver(PilotForm),
    defaultValues: { email: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    const response = await fetch('/api/pilot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const body = await response.json();
    if (!response.ok) return form.setError('email', { message: body.error });
    setWaiting(body.count);
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" size="sm" className="px-0">
          request a pilot
        </Button>
      </SheetTrigger>
      <SheetContent className="p-6">
        <SheetTitle>Request a pilot</SheetTitle>
        <SheetDescription>
          Connect your organisation&apos;s accounts and contracts and the harness will watch them
          and prepare fixes. Execution under policy is next.
        </SheetDescription>
        {waiting === null ? (
          <form onSubmit={submit} className="space-y-2">
            <RHF.Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              request a pilot
            </Button>
          </form>
        ) : (
          <p className="font-mono text-sm">received · {waiting} waiting</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
