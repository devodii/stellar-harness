import { type AppError, appError, ErrorCode, err, ok, type Result } from '@harness/schema';
import { type PilotBody, PilotResponse } from './api-schemas';
import { ApiError, fetchJson } from './http';

export type RequestPilot = (body: PilotBody) => Promise<Result<PilotResponse, AppError>>;

const toRequestError = (error: unknown): AppError => {
  if (error instanceof ApiError) {
    const code = ErrorCode.safeParse(error.code);
    return appError(code.success ? code.data : 'INTERNAL', error.message);
  }
  return appError('UPSTREAM_FAILED', 'The request did not go through. Try again.');
};

export const requestPilot: RequestPilot = async (body) => {
  try {
    return ok(
      await fetchJson('/api/pilot', PilotResponse, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  } catch (error) {
    return err(toRequestError(error));
  }
};

export const waitingLabel = (count: number): string => `received · ${count} waiting`;
