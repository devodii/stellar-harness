import { z } from 'zod';

export const PilotBody = z.object({ email: z.email('Enter a valid email.') });
export type PilotBody = z.infer<typeof PilotBody>;

export const PilotResponse = z.object({ count: z.number().int().nonnegative() });
export type PilotResponse = z.infer<typeof PilotResponse>;

export const ApiErrorBody = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
