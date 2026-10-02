'use client';

import { CaretUpDownIcon } from '@phosphor-icons/react/ssr';
import { cn } from 'cn';
import * as React from 'react';
import * as RHF from 'react-hook-form';
import { CheckMark } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FieldLayout } from './field-layout';
import type { FieldOption, FieldProps } from './types';

export interface MultiSelectFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  options: FieldOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

const summarize = (selected: string[], options: FieldOption[], placeholder: string) => {
  if (selected.length === 0) return placeholder;
  const first = options.find((option) => option.value === selected[0])?.label ?? selected[0];
  return selected.length === 1 ? first : `${first} +${selected.length - 1}`;
};

export function MultiSelectField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  options,
  placeholder = 'Any',
  searchPlaceholder = 'Search…',
  disabled,
}: MultiSelectFieldProps<TValues, TName>) {
  const [open, setOpen] = React.useState(false);

  return (
    <RHF.Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected: string[] = Array.isArray(field.value) ? field.value : [];
        const toggle = (value: string) =>
          field.onChange(
            selected.includes(value)
              ? selected.filter((item) => item !== value)
              : [...selected, value],
          );

        return (
          <FieldLayout
            htmlFor={name}
            label={label}
            description={description}
            error={fieldState.error}
            className={className}
          >
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={name}
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  aria-invalid={!!fieldState.error}
                  disabled={disabled}
                  onBlur={field.onBlur}
                  className="h-8 w-full justify-between px-3 font-mono text-xs font-normal"
                >
                  <span
                    className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}
                  >
                    {summarize(selected, options, placeholder)}
                  </span>
                  <CaretUpDownIcon className="size-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-(--radix-popover-trigger-width) min-w-56 p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder={searchPlaceholder} className="text-xs" />
                  <CommandList>
                    <CommandEmpty>No matches.</CommandEmpty>
                    <CommandGroup>
                      {options.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          onSelect={() => toggle(option.value)}
                          className="font-mono text-xs"
                        >
                          <CheckMark
                            className={cn(
                              'size-3.5',
                              selected.includes(option.value) ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FieldLayout>
        );
      }}
    />
  );
}
