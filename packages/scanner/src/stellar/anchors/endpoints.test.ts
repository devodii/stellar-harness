import { describe, expect, it } from 'vitest';
import { checkEndpoints, endpointHosts } from './endpoints';
import { tomlFixture as toml } from './testing';

describe('checkEndpoints', () => {
  it('lists the sep endpoints present in the toml', () => {
    expect(checkEndpoints(toml('stellar.moneygram.com'))).toEqual({
      record: { stage: 'endpoints', ok: true, status: null, ms: 0, error: null },
      endpoints: ['TRANSFER_SERVER_SEP0024', 'WEB_AUTH_ENDPOINT'],
    });
  });

  it('fails when none of the six endpoints exist', () => {
    const outcome = checkEndpoints(toml('moneygram.com'));
    expect(outcome.record).toMatchObject({ ok: false, error: 'no_sep_endpoints' });
    expect(outcome.endpoints).toEqual([]);
  });
});

describe('endpointHosts', () => {
  it('returns distinct endpoint hosts for transitive discovery', () => {
    expect(endpointHosts(toml('clpx.finance'))).toEqual(['kbtrading.org']);
    expect(endpointHosts(toml('ntokens.com'))).toEqual(['ntokens-box.bpventures.us']);
  });
});
