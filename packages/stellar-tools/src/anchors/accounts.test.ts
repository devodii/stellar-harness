import { appError } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { accountTargets, homeDomainMismatches, probeAccounts } from './accounts';
import type { HorizonAccount } from './ports';
import { fakeHorizon, readFixture, readJsonFixture } from './testing';
import { parseToml } from './toml';

const anclapToml = () => {
  const parsed = parseToml(readFixture('toml/anclap.com.toml'));
  if (!parsed.ok) throw new Error('fixture should parse');
  return parsed.value;
};
const ars = readJsonFixture<HorizonAccount>('horizon/account-anclap-ars.json');
const ARS = 'GCYE7C77EB5AWAA25R5XMWNI2EDOKTTFTTPZKM2SR5DI4B4WFD52DARS';
const PEN = 'GA4TDPNUCZPTOHB3TKUYMDCRVATXKEADH7ZEYEBWJKQKE2UBFCYNBPEN';
const OTHER = 'GARDJZ33FTTLVKGABXDS22SYNTP4VCLYARIEWKMZKYHX3RRLPMNR3HOT';

describe('accountTargets', () => {
  it('merges ACCOUNTS and currency issuers', () => {
    expect(accountTargets(anclapToml())).toEqual([
      { id: ARS, roles: ['account', 'issuer'], codes: ['ARS'] },
      { id: PEN, roles: ['account', 'issuer'], codes: ['PEN'] },
      { id: OTHER, roles: ['account'], codes: [] },
    ]);
  });
});

describe('probeAccounts', () => {
  it('flags a home_domain that differs from the probed domain', async () => {
    const horizon = fakeHorizon({
      [ARS]: ars,
      [PEN]: { ...ars, id: PEN, home_domain: 'anclap.com' },
      [OTHER]: { ...ars, id: OTHER, home_domain: undefined },
    });
    const outcome = await probeAccounts('anclap.com', anclapToml(), horizon);
    expect(outcome.record.ok).toBe(false);
    expect(outcome.record.error).toContain('home_domain api.anclap.com != anclap.com');
    expect(homeDomainMismatches('anclap.com', outcome.accounts).map((a) => a.id)).toEqual([ARS]);
    expect(outcome.accounts[0]).toMatchObject({
      found: true,
      signers: 4,
      balances: 1,
      flags: { auth_required: false, auth_clawback_enabled: false },
    });
  });

  it('passes when every account resolves to the domain', async () => {
    const same = { ...ars, home_domain: 'API.anclap.com' };
    const horizon = fakeHorizon({ [ARS]: same, [PEN]: same, [OTHER]: same });
    const outcome = await probeAccounts('api.anclap.com', anclapToml(), horizon);
    expect(outcome.record).toMatchObject({ stage: 'accounts', ok: true, error: null });
  });

  it('records missing accounts and lookup failures', async () => {
    const horizon = fakeHorizon({
      [ARS]: null,
      [PEN]: appError('RATE_LIMITED', 'gave up after 6 attempts'),
      [OTHER]: { ...ars, home_domain: 'anclap.com' },
    });
    const outcome = await probeAccounts('anclap.com', anclapToml(), horizon);
    expect(outcome.accounts.map((a) => a.error)).toEqual([
      'not_found',
      'RATE_LIMITED: gave up after 6 attempts',
      null,
    ]);
    expect(outcome.record.ok).toBe(false);
  });

  it('skips lookups for invalid ids', async () => {
    const toml = { ...anclapToml(), accounts: ['GNOTANACCOUNT'], currencies: [] };
    const horizon = fakeHorizon({});
    const outcome = await probeAccounts('anclap.com', toml, horizon);
    expect(outcome.accounts[0]?.error).toBe('invalid_account_id');
    expect(horizon.calls).toEqual([]);
  });

  it('skips the stage when the toml lists no accounts', async () => {
    const toml = { ...anclapToml(), accounts: [], currencies: [] };
    const outcome = await probeAccounts('anclap.com', toml, fakeHorizon({}));
    expect(outcome.record).toMatchObject({ ok: false, error: 'skipped: no_accounts' });
  });
});
