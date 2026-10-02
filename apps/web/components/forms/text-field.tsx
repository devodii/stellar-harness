'use client';

import * as RHF from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface TextFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  mono?: boolean;
  type?: 'text' | 'email' | 'search';
  autoComplete?: string;
}

export function TextField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  placeholder,
  disabled,
  autoFocus,
  mono = true,
  type = 'text',
  autoComplete,
}: TextFieldProps<TValues, TName>) {
  return (
    <RHF.Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldLayout
          htmlFor={name}
          label={label}
          description={description}
          error={fieldState.error}
          className={className}
        >
          <Input
            id={name}
            type={type}
            autoComplete={autoComplete}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-invalid={!!fieldState.error}
            className={mono ? 'h-8 font-mono text-xs' : 'h-8 text-sm'}
            {...field}
            value={(field.value as string | undefined) ?? ''}
          />
        </FieldLayout>
      )}
    />
  );
}
