'use client';

import * as RHF from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface TextFieldProps<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>
  extends FieldProps<TValues, TName> {
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  mono?: boolean;
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
