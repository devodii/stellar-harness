import type { AnchorToml, HorizonAccount } from '@harness/stellar-tools/anchors';
import { describe, expect, it } from 'vitest';
import {
  buildDomainList,
  type DomainListOptions,
  ECOSYSTEM_SKIP_NOTE,
  mergeCandidates,
  partnerCandidate,
  transitiveCandidates,
  websiteDomain,
} from './domains';
import { topAssetsUrl } from './expert';
import { KNOWN_ANCHORS } from './known';
import { MEDIUM_FEED_URL } from './scf-recaps';
import type { StellarlightPartner } from './schemas';
import { partnersUrl, projectSearchUrl } from './stellarlight';
import { fakeFetcher, fakeHorizon, jsonRoute, readFixture, readJsonFixture } from './testing';

const SL = 'https://stellarlight.xyz';
const EXPERT = 'https://api.stellar.expert/explorer/public';
const GTN_ISSUER = 'GARFMAHQM4JDI55SK2FGEPLOZU7BTEODS3Y5QNT3VMQQIU3WV2HTBA46';
const opts: DomainListOptions = { stellarlightUrl: SL, expertUrl: EXPERT };

const partners = readJsonFixture<{ partners: StellarlightPartner[] }>(
  'stellarlight/partners-anchor.json',
).partners;
const issuerAccount = (homeDomain: string): HorizonAccount => ({
  id: GTN_ISSUER,
  sequence: '1',
  home_domain: homeDomain,
  subentry_count: 0,
  thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
  flags: {
    auth_required: false,
    auth_revocable: false,
    auth_immutable: false,
    auth_clawback_enabled: false,
  },
  signers: [],
  balances: [],
});

const routes = () => ({
  [partnersUrl(SL, 'anchor')]: jsonRoute(readJsonFixture('stellarlight/partners-anchor.json')),
  [partnersUrl(SL, 'on-off-ramp')]: jsonRoute(
    readJsonFixture('stellarlight/partners-on-off-ramp.json'),
  ),
  [projectSearchUrl(SL, { type: 'Anchor', limit: 100, offset: 0 })]: jsonRoute(
    readJsonFixture('stellarlight/projects-anchor.json'),
  ),
  [MEDIUM_FEED_URL]: { body: readFixture('medium/stellar-community-feed.xml') },
  [projectSearchUrl(SL, { q: 'Minisend', limit: 5 })]: jsonRoute(
    readJsonFixture('stellarlight/project-search-minisend.json'),
  ),
  [topAssetsUrl(EXPERT, 200)]: jsonRoute(readJsonFixture('expert/assets-trustlines.json')),
});

describe('candidates', () => {
  it('prefers the toml host over the website host for partners', () => {
    const moneygram = partners.find((p) => p.slug === 'anchor-moneygram');
    expect(moneygram && partnerCandidate(moneygram)?.domain).toBe('stellar.moneygram.com');
    const bitso = partners.find((p) => p.slug === 'anchor-bitso');
    expect(bitso && partnerCandidate(bitso)?.domain).toBe('bitso.com');
  });

  it('ignores social and code hosting websites', () => {
    expect(websiteDomain('https://github.com/freelii')).toBeNull();
    expect(websiteDomain('https://www.bossmoney.com')).toBe('bossmoney.com');
  });

  it('merges candidates by host and maps countries to iso codes', () => {
    const merged = mergeCandidates([
      {
        domain: 'Zeam.money',
        source: 'stellarlight_partner',
        name: 'Zeam',
        country: 'United Kingdom',
        regions: ['europe'],
      },
      { domain: 'zeam.money', source: 'stellar_expert_asset' },
      { domain: 'zeam.money', source: 'scf_recap', scfRounds: [44], regions: ['africa'] },
    ]);
    expect(merged).toEqual([
      {
        domain: 'zeam.money',
        name: 'Zeam',
        country: 'GB',
        countryName: 'United Kingdom',
        regions: ['africa', 'europe'],
        seps: [],
        scfRounds: [44],
        sources: ['stellarlight_partner', 'stellar_expert_asset', 'scf_recap'],
        slugs: [],
        websiteUrl: null,
        tomlUrl: 'https://zeam.money/.well-known/stellar.toml',
      },
    ]);
  });

  it('adds endpoint hosts of fetched tomls as transitive domains', () => {
    const toml = {
      transferServer: 'https://kbtrading.org/sep6',
      webAuthEndpoint: 'https://kbtrading.org/auth',
      kycServer: 'https://clpx.finance/kyc',
      transferServerSep24: null,
      directPaymentServer: null,
      anchorQuoteServer: null,
    } as AnchorToml;
    expect(transitiveCandidates([toml], ['clpx.finance'])).toEqual([
      { domain: 'kbtrading.org', source: 'transitive' },
    ]);
  });
});

describe('buildDomainList', () => {
  it('combines partners, projects, scf recaps and top assets', async () => {
    const horizon = fakeHorizon({ [GTN_ISSUER]: issuerAccount('gtn.example') });
    const list = await buildDomainList({ fetch: fakeFetcher(routes()), horizon }, opts);
    const byDomain = new Map(list.domains.map((d) => [d.domain, d]));

    expect(list.scfSource).toBe('medium');
    expect(byDomain.get('clpx.finance')).toMatchObject({ country: 'CL', regions: ['latam'] });
    expect(byDomain.get('stellar.moneygram.com')?.sources).toEqual([
      'stellarlight_partner',
      'stellarlight_project',
    ]);
    expect(byDomain.get('cashabroad.one')?.scfRounds).toEqual([11, 14, 21, 41]);
    expect(byDomain.get('minisend.xyz')).toMatchObject({ sources: ['scf_recap'], scfRounds: [45] });
    expect(byDomain.get('gtn.example')?.sources).toEqual(['stellar_expert_asset']);
    expect(byDomain.get('mint.zeam.money')?.sources).toEqual(['stellarlight_partner']);
    expect(byDomain.get('zeam.money')?.sources).toEqual(['stellar_expert_asset']);
    expect(byDomain.has('github.com')).toBe(false);
    expect(list.unresolvedScfProjects).toEqual(['Pollar (SCF #45)', 'VERSO (SCF #44)']);
    expect(list.gaps).toEqual([]);
  });

  it('falls back to stellarlight scf award data when medium is blocked', async () => {
    const r: Record<string, ReturnType<typeof jsonRoute>> = routes();
    r[MEDIUM_FEED_URL] = { status: 403, body: 'Forbidden' };
    r[projectSearchUrl(SL, { scfAwarded: 1, limit: 100, offset: 0 })] = jsonRoute(
      readJsonFixture('stellarlight/projects-anchor.json'),
    );
    const list = await buildDomainList({ fetch: fakeFetcher(r), horizon: fakeHorizon({}) }, opts);
    expect(list.scfSource).toBe('stellarlight');
    expect(list.gaps[0]).toMatch(/^medium scf recaps: GET .* returned 403/);
    expect(list.domains.find((d) => d.domain === 'upesa.app')?.scfRounds).toEqual([42]);
  });

  it('records gaps for failing sources and keeps going', async () => {
    const list = await buildDomainList(
      { fetch: fakeFetcher({}), horizon: fakeHorizon({}) },
      { ...opts, limit: 5 },
    );
    expect(list.domains).toEqual([]);
    expect(list.scfSource).toBe('none');
    expect(list.gaps).toHaveLength(6);
  });

  it('skips the mainnet-only directory on testnet and seeds known anchors', async () => {
    const testnetExpert = 'https://api.stellar.expert/explorer/testnet';
    const fetch = fakeFetcher({
      [topAssetsUrl(testnetExpert, 200)]: jsonRoute({
        _embedded: {
          records: [
            { asset: `USD-${GTN_ISSUER}-1`, domain: 'testanchor.stellar.org' },
            { asset: `EUR-${GTN_ISSUER}-1` },
          ],
        },
      }),
    });
    const list = await buildDomainList(
      { fetch, horizon: fakeHorizon({ [GTN_ISSUER]: issuerAccount('issuer.example') }) },
      {
        ...opts,
        expertUrl: testnetExpert,
        ecosystemDirectory: false,
        knownDomains: KNOWN_ANCHORS.testnet,
      },
    );
    expect(fetch.calls.map((call) => call.url)).toEqual([topAssetsUrl(testnetExpert, 200)]);
    expect(list.notes).toEqual([ECOSYSTEM_SKIP_NOTE]);
    expect(list.scfSource).toBe('none');
    expect(list.gaps).toEqual([]);
    expect(list.domains.map((d) => [d.domain, d.sources])).toEqual([
      ['testanchor.stellar.org', ['known_anchor', 'stellar_expert_asset']],
      ['anchor-sep-server-dev.stellar.org', ['known_anchor']],
      ['api-dev.vibrantapp.com', ['known_anchor']],
      ['issuer.example', ['stellar_expert_asset']],
    ]);
    expect(list.counts.known_anchor).toBe(3);
  });

  it('records no notes on mainnet', async () => {
    const list = await buildDomainList(
      { fetch: fakeFetcher({}), horizon: fakeHorizon({}) },
      { ...opts, limit: 5 },
    );
    expect(list.notes).toEqual([]);
  });
});
