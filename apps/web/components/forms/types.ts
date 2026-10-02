import type * as RHF from 'react-hook-form';

export type FieldProps<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>> = {
  control: RHF.Control<TValues>;
  name: TName;
  label: string;
  description?: string;
  className?: string;
};

export type FieldOption<TValue extends string = string> = {
  value: TValue;
  label: string;
};
