'use client';

import * as RHF from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldLayout } from './field-layout';
import type { FieldOption, FieldProps } from './types';

const ANY = '__any__';

export interface SelectFieldProps<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>
  extends FieldProps<TValues, TName> {
  options: FieldOption[];
  placeholder?: string;
  anyLabel?: string;
  disabled?: boolean;
}

export function SelectField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  options,
  placeholder = 'Select…',
  anyLabel,
  disabled,
}: SelectFieldProps<TValues, TName>) {
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
          <Select
            value={(field.value as string | undefined) || (anyLabel ? ANY : '')}
            onValueChange={(value) => field.onChange(value === ANY ? '' : value)}
            disabled={disabled}
          >
            <SelectTrigger
              id={name}
              aria-invalid={!!fieldState.error}
              onBlur={field.onBlur}
              className="h-8 w-full font-mono text-xs"
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {anyLabel && (
                <SelectItem value={ANY} className="font-mono text-xs">
                  {anyLabel}
                </SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value} className="font-mono text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLayout>
      )}
    />
  );
}
