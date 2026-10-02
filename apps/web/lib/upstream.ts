import 'server-only';
import { appError } from '@harness/schema';

const TIMEOUT_MS = 5000;

export const fetchUpstream = async (
  label: string,
  url: URL | string,
  init: RequestInit = {},
): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { accept: 'application/json', ...init.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw appError(
      timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILED',
      `${label} request failed: ${error instanceof Error ? error.message : 'unknown'}`,
    );
  }
  if (!response.ok) {
    throw appError('UPSTREAM_FAILED', `${label} returned ${response.status}`, {
      status: response.status,
    });
  }
  return response.json();
};
