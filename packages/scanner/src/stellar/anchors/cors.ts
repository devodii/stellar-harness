import type { AppError } from '../../schema';
import type { HttpResponse } from './ports';
import type { CorsCheck, CorsTarget, StageRecord } from './schemas';
import { SKIP_REASONS, skippedStage, stageRecord } from './stage';

export type CorsInput = {
  target: CorsTarget;
  url: string;
  response: HttpResponse | null;
  fetchError: AppError | null;
};

const TLS_ERROR = /certificate|self[- ]signed|\btls\b|\bssl\b|CERT_|UNABLE_TO_VERIFY|EPROTO/i;

const tlsFromResponse = (
  url: string,
  response: HttpResponse,
): Pick<CorsCheck, 'tls' | 'tlsError'> => {
  if (response.tls) return { tls: response.tls.ok, tlsError: response.tls.error ?? null };
  const https = (response.url || url).startsWith('https://');
  return { tls: https, tlsError: https ? null : 'not_https' };
};

export const corsCheck = ({ target, url, response, fetchError }: CorsInput): CorsCheck | null => {
  if (response) {
    const origin = response.headers['access-control-allow-origin'];
    return { target, url, cors: Boolean(origin?.trim()), ...tlsFromResponse(url, response) };
  }
  if (fetchError && TLS_ERROR.test(fetchError.message)) {
    return { target, url, cors: false, tls: false, tlsError: fetchError.message };
  }
  return null;
};

const problems = (check: CorsCheck): string[] => [
  ...(check.cors ? [] : [`${check.target}: missing_cors`]),
  ...(check.tls === false ? [`${check.target}: tls ${check.tlsError ?? 'invalid'}`] : []),
];

export type CorsOutcome = { record: StageRecord; checks: CorsCheck[] };

export const checkCors = (inputs: CorsInput[]): CorsOutcome => {
  const checks = inputs.map(corsCheck).filter((c): c is CorsCheck => c !== null);
  if (checks.length === 0) {
    return { record: skippedStage('cors', SKIP_REASONS.notApplicable), checks };
  }
  const issues = checks.flatMap(problems);
  return {
    record: stageRecord('cors', issues.length === 0, null, 0, issues.join('; ') || null),
    checks,
  };
};

export const brokenCors = (checks: CorsCheck[]): CorsCheck[] =>
  checks.filter((c) => !c.cors || c.tls === false);
