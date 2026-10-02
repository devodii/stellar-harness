import type { z } from 'zod';
import { ApiErrorBody } from './api-schemas';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export const fetchJson = async <T extends z.ZodType>(
  url: string,
  schema: T,
  init?: RequestInit,
): Promise<z.infer<T>> => {
  const response = await fetch(url, { headers: { accept: 'application/json' }, ...init });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorBody.safeParse(body);
    throw parsed.success
      ? new ApiError(parsed.data.error.code, parsed.data.error.message, response.status)
      : new ApiError('INTERNAL', `Request failed with ${response.status}`, response.status);
  }
  return schema.parse(body);
};

export const toSearchParams = (
  values: Record<string, string | number | string[] | undefined>,
): URLSearchParams => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === '') continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
  }
  return params;
};
