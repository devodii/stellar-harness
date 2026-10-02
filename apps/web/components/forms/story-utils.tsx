'use client';

import type * as React from 'react';
import type * as RHF from 'react-hook-form';
import type { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';

export function FieldStory<TValues extends RHF.FieldValues>({
  schema,
  defaultValues,
  children,
}: {
  schema: z.ZodType<TValues, TValues>;
  defaultValues: RHF.DefaultValues<TValues>;
  children: (control: RHF.Control<TValues>) => React.ReactNode;
}) {
  const form = useZodForm(schema, { defaultValues });
  return <form className="max-w-sm space-y-4">{children(form.control)}</form>;
}
