import { describe, expect, it } from 'vitest';
import { classifyFetchError, failureKindOf, httpError } from './errors';

const undiciError = (code: string, message: string) =>
  new TypeError('fetch failed', { cause: Object.assign(new Error(message), { code }) });

describe('classifyFetchError', () => {
  it('flags certificate failures as non-retryable tls', () => {
    for (const code of [
      'CERT_HAS_EXPIRED',
      'DEPTH_ZERO_SELF_SIGNED_CERT',
      'ERR_TLS_CERT_ALTNAME_INVALID',
      'ERR_SSL_WRONG_VERSION_NUMBER',
    ]) {
      expect(classifyFetchError(undiciError(code, 'bad cert'))).toMatchObject({
        kind: 'tls',
        code,
        retryable: false,
      });
    }
  });

  it('keeps the underlying message', () => {
    expect(
      classifyFetchError(undiciError('CERT_HAS_EXPIRED', 'certificate has expired')).message,
    ).toBe('certificate has expired');
  });

  it('treats an unknown host as permanent and EAI_AGAIN as transient', () => {
    expect(classifyFetchError(undiciError('ENOTFOUND', 'nope'))).toMatchObject({
      kind: 'dns',
      retryable: false,
    });
    expect(classifyFetchError(undiciError('EAI_AGAIN', 'later'))).toMatchObject({
      kind: 'dns',
      retryable: true,
    });
  });

  it('recognises timeouts', () => {
    const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    expect(classifyFetchError(timeout)).toMatchObject({ kind: 'timeout', retryable: true });
  });

  it('treats resets as retryable network failures', () => {
    expect(classifyFetchError(undiciError('ECONNRESET', 'reset'))).toMatchObject({
      kind: 'network',
      retryable: true,
    });
  });
});

describe('httpError', () => {
  const base = { url: 'https://h/x', host: 'h', attempts: 1 };

  it('maps statuses to app error codes', () => {
    expect(httpError('x', { ...base, kind: 'http', status: 404 }).code).toBe('NOT_FOUND');
    expect(httpError('x', { ...base, kind: 'http', status: 429 }).code).toBe('RATE_LIMITED');
    expect(httpError('x', { ...base, kind: 'http', status: 503 }).code).toBe('UPSTREAM_FAILED');
    expect(httpError('x', { ...base, kind: 'timeout' }).code).toBe('UPSTREAM_TIMEOUT');
  });

  it('exposes the failure kind for callers', () => {
    expect(failureKindOf(httpError('x', { ...base, kind: 'tls' }))).toBe('tls');
    expect(failureKindOf({ code: 'INTERNAL', message: 'x' })).toBeNull();
  });
});
