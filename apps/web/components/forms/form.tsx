'use client';

import type { AppError, Result } from '@harness/schema';
import { cn } from 'cn';
import type * as React from 'react';
import type * as RHF from 'react-hook-form';
import { InlineAlert } from '@/components/inline-alert';

export interface FormProps<TValues extends RHF.FieldValues> {
  form: RHF.UseFormReturn<TValues>;
  onSubmit: (values: TValues) => Promise<Result<unknown, AppError> | undefined>;
  children: React.ReactNode;
  className?: string;
}

const isFieldErrors = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((message) => typeof message === 'string');

export function Form<TValues extends RHF.FieldValues>({
  form,
  onSubmit,
  children,
  className,
}: FormProps<TValues>) {
  const rootError = form.formState.errors.root?.message;

  const handle = async (values: TValues) => {
    const result = await onSubmit(values);
    if (!result || result.ok) return;

    const fieldErrors = result.error.meta?.fieldErrors;
    if (isFieldErrors(fieldErrors) && Object.keys(fieldErrors).length > 0) {
      for (const [field, message] of Object.entries(fieldErrors)) {
        form.setError(field as RHF.Path<TValues>, { message });
      }
      return;
    }
    form.setError('root', { message: result.error.message });
  };

  return (
    <form onSubmit={form.handleSubmit(handle)} noValidate className={cn('space-y-4', className)}>
      <fieldset
        disabled={form.formState.isSubmitting}
        className="m-0 min-w-0 space-y-4 border-0 p-0"
      >
        {rootError && (
          <InlineAlert tone="destructive" resetKey={form.formState.submitCount} dismissible>
            {rootError}
          </InlineAlert>
        )}
        {children}
      </fieldset>
    </form>
  );
}
