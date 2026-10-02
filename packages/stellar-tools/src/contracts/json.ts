import { appError, err, ok, type Result } from '@harness/schema';
import type { z } from 'zod';
import type { Fetcher } from './ports';

export const getJson = async <T extends z.ZodType>(
  fetch: Fetcher,
  url: string,
  schema: T,
): Promise<Result<z.infer<T> | null>> => {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) return response;
  const { status, body } = response.value;
  if (status === 404) return ok(null);
  if (status < 200 || status >= 300) {
    return err(appError('UPSTREAM_FAILED', `GET ${url} returned ${status}`, { url, status }));
  }
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return err(appError('UPSTREAM_FAILED', `GET ${url} returned invalid JSON`, { url }));
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return err(
      appError('UPSTREAM_FAILED', `GET ${url} returned an unexpected shape`, {
        url,
        issue: parsed.error.issues[0]?.message,
        path: parsed.error.issues[0]?.path.join('.'),
      }),
    );
  }
  return ok(parsed.data);
};
