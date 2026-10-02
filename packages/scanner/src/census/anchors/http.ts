import type { z } from 'zod';
import { appError, err, ok, type Result } from '../../schema';
import type { Fetcher } from './ports';

const SOURCE_TIMEOUT_MS = 30_000;

export const getText = async (fetch: Fetcher, url: string): Promise<Result<string>> => {
  const result = await fetch(url, { method: 'GET', timeoutMs: SOURCE_TIMEOUT_MS });
  if (!result.ok) return result;
  const { status, body } = result.value;
  if (status !== 200) {
    return err(appError('UPSTREAM_FAILED', `GET ${url} returned ${status}`, { status }));
  }
  return ok(body);
};

export const getJsonAs = async <T extends z.ZodType>(
  fetch: Fetcher,
  url: string,
  schema: T,
): Promise<Result<z.infer<T>>> => {
  const text = await getText(fetch, url);
  if (!text.ok) return text;
  let json: unknown;
  try {
    json = JSON.parse(text.value);
  } catch {
    return err(appError('UPSTREAM_FAILED', `GET ${url} returned invalid JSON`));
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return err(
      appError('UPSTREAM_FAILED', `GET ${url} returned an unexpected shape`, {
        issue: parsed.error.issues[0]?.message,
      }),
    );
  }
  return ok(parsed.data);
};

export const parseRows = <T extends z.ZodType>(rows: unknown[], schema: T): z.infer<T>[] =>
  rows.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
