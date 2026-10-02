'use client';

import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/ssr';
import { cn } from 'cn';
import * as React from 'react';
import type * as RHF from 'react-hook-form';
import type { z } from 'zod';
import { MultiSelectField } from '@/components/forms/multi-select-field';
import { SelectField } from '@/components/forms/select-field';
import { TextField } from '@/components/forms/text-field';
import type { FieldOption } from '@/components/forms/types';
import { Button } from '@/components/ui/button';
import { useZodForm } from '@/hooks/use-zod-form';

type FieldBase<TValues extends RHF.FieldValues> = {
  name: RHF.Path<TValues>;
  label: string;
  className?: string;
};

export type FilterField<TValues extends RHF.FieldValues> = FieldBase<TValues> &
  (
    | { kind: 'select'; options: FieldOption[]; anyLabel?: string }
    | { kind: 'multi'; options: FieldOption[] }
    | { kind: 'text'; placeholder?: string }
  );

export interface FilterBarProps<TValues extends RHF.FieldValues> {
  schema: z.ZodType<TValues, TValues>;
  defaultValues: RHF.DefaultValues<TValues>;
  emptyValues: RHF.DefaultValues<TValues>;
  fields: FilterField<TValues>[];
  onChange: (values: TValues) => void;
  debounceMs?: number;
  className?: string;
}

export function FilterBar<TValues extends RHF.FieldValues>({
  schema,
  defaultValues,
  emptyValues,
  fields,
  onChange,
  debounceMs = 250,
  className,
}: FilterBarProps<TValues>) {
  const form = useZodForm(schema, { defaultValues, mode: 'onChange' });
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const subscription = form.watch(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        void form.handleSubmit((values) => onChangeRef.current(values))();
      }, debounceMs);
    });
    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [form, debounceMs]);

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className={cn('flex flex-wrap items-end gap-3', className)}
      aria-label="Filters"
    >
      {fields.map((field) => {
        const common = {
          control: form.control,
          name: field.name,
          label: field.label,
          className: cn('w-full sm:w-52', field.className),
        };
        if (field.kind === 'select') {
          return (
            <SelectField
              key={field.name}
              {...common}
              options={field.options}
              anyLabel={field.anyLabel ?? 'any'}
            />
          );
        }
        if (field.kind === 'multi') {
          return <MultiSelectField key={field.name} {...common} options={field.options} />;
        }
        return <TextField key={field.name} {...common} placeholder={field.placeholder} />;
      })}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 text-xs text-muted-foreground"
        onClick={() => form.reset(emptyValues)}
        disabled={JSON.stringify(form.watch()) === JSON.stringify(emptyValues)}
      >
        <ArrowCounterClockwiseIcon className="size-3.5" />
        Reset
      </Button>
    </form>
  );
}
