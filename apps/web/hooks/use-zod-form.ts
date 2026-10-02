import { zodResolver } from '@hookform/resolvers/zod';
import * as RHF from 'react-hook-form';
import type { z } from 'zod';

export function useZodForm<TFieldValues extends RHF.FieldValues>(
  schema: z.ZodType<TFieldValues, TFieldValues>,
  options?: Omit<RHF.UseFormProps<TFieldValues>, 'resolver'>,
) {
  return RHF.useForm<TFieldValues>({
    ...options,
    // zodResolver infers its generics from the schema's internal shape, which TS cannot
    // resolve through an opaque type parameter (@hookform/resolvers 5 with zod 4).
    resolver: zodResolver(schema) as RHF.Resolver<TFieldValues>,
  });
}
