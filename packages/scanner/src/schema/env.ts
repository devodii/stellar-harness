import { z } from 'zod';

export type EnvSource = Record<string, string | undefined>;

export const defineEnv = <TShape extends z.ZodRawShape>(
  shape: TShape,
  source: EnvSource = process.env,
): z.infer<z.ZodObject<TShape>> => {
  const parsed = z.object(shape).safeParse(source);
  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `Invalid or missing environment variables:\n${issues}\n\nCheck .env.example for the full list.`,
  );
};

export const envInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

export const envUrl = (fallback: string) => z.url().default(fallback);
