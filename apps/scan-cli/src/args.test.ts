import { describe, expect, it } from 'vitest';
import { commandSteps, parseScanArgs } from './args';
import { parseDuration } from './duration';

describe('parseDuration', () => {
  it('parses days, hours and minutes', () => {
    expect(parseDuration('7d')).toBe(604_800);
    expect(parseDuration('24h')).toBe(86_400);
    expect(parseDuration('30m')).toBe(1_800);
  });

  it('rejects malformed values', () => {
    expect(() => parseDuration('7 days')).toThrow(/Invalid duration/);
  });
});

describe('parseScanArgs', () => {
  it('parses every flag', () => {
    expect(
      parseScanArgs([
        'failures',
        '--limit',
        '20',
        '--window',
        '1d',
        '--no-cache',
        '--new-snapshot',
        '--concurrency',
        'horizon.stellar.org=4',
        '--concurrency',
        'mainnet.sorobanrpc.com=6',
      ]),
    ).toEqual({
      command: 'failures',
      limit: 20,
      windowSeconds: 86_400,
      noCache: true,
      newSnapshot: true,
      concurrency: { 'horizon.stellar.org': 4, 'mainnet.sorobanrpc.com': 6 },
    });
  });

  it('rejects unknown commands and bad flags', () => {
    expect(() => parseScanArgs(['nope'])).toThrow(/usage/);
    expect(() => parseScanArgs(['anchors', '--limit', '0'])).toThrow(/--limit/);
    expect(() => parseScanArgs(['anchors', '--concurrency', 'x'])).toThrow(/--concurrency/);
  });

  it('runs anchors first when scanning everything', () => {
    expect(commandSteps('all')[0]).toBe('anchors');
    expect(commandSteps('all').at(-1)).toBe('report');
    expect(commandSteps('rent')).toEqual(['rent']);
  });
});
