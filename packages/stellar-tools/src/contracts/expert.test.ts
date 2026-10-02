import { describe, expect, it } from 'vitest';
import unverified from './__fixtures__/expert-contract-unverified.json';
import verified from './__fixtures__/expert-contract-verified.json';
import page from './__fixtures__/expert-contracts-page.json';
import {
  cursorOf,
  expertContractsUrl,
  fetchExpertContract,
  fetchExpertContractPage,
  resolveExpertHref,
} from './expert';
import { fakeFetcher } from './fakes';

const BASE = 'https://api.stellar.expert/explorer/public';

describe('stellar.expert urls', () => {
  it('builds the first contract page url', () => {
    expect(expertContractsUrl(`${BASE}/`, { limit: 200 })).toBe(
      `${BASE}/contract?limit=200&order=desc`,
    );
  });

  it('resolves a relative next href against the api host', () => {
    const next = resolveExpertHref(BASE, page._links.next.href);
    expect(next).toBe(
      'https://api.stellar.expert/explorer/public/contract?order=desc&limit=200&cursor=CDZUG5AZTYEXU7TXPKK76C6P5MHQU77CZ4M5FA56VLS4OKXOVJ5O4D2O',
    );
    expect(cursorOf(next)).toBe('CDZUG5AZTYEXU7TXPKK76C6P5MHQU77CZ4M5FA56VLS4OKXOVJ5O4D2O');
  });
});

describe('fetchExpertContractPage', () => {
  it('parses records including token, feature and asset contracts', async () => {
    const url = expertContractsUrl(BASE, { limit: 200 });
    const result = await fetchExpertContractPage(fakeFetcher({ [url]: { body: page } }), BASE, url);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.records).toHaveLength(5);
    expect(result.value.invalid).toBe(0);
    expect(result.value.nextUrl).toContain('cursor=CDZUG5AZ');
    const asset = result.value.records.find((record) => record.asset);
    expect(asset?.wasm).toBeUndefined();
    const token = result.value.records.find((record) => record.features);
    expect(token).toMatchObject({ code: 'POOL', features: ['sep41'] });
  });

  it('stops paging on an empty page', async () => {
    const url = expertContractsUrl(BASE, { limit: 200, cursor: 'CAAA' });
    const empty = { _links: page._links, _embedded: { records: [] } };
    const result = await fetchExpertContractPage(
      fakeFetcher({ [url]: { body: empty } }),
      BASE,
      url,
    );
    expect(result).toEqual({ ok: true, value: { records: [], invalid: 0, nextUrl: null } });
  });

  it('counts malformed records instead of failing the page', async () => {
    const url = expertContractsUrl(BASE, { limit: 200 });
    const body = { ...page, _embedded: { records: [...page._embedded.records, { bad: 1 }] } };
    const result = await fetchExpertContractPage(fakeFetcher({ [url]: { body } }), BASE, url);
    expect(result.ok && result.value.invalid).toBe(1);
  });
});

describe('fetchExpertContract', () => {
  it('reads validation status for verified and unverified contracts', async () => {
    const fetch = fakeFetcher({
      [`${BASE}/contract/${verified.contract}`]: { body: verified },
      [`${BASE}/contract/${unverified.contract}`]: { body: unverified },
    });
    const a = await fetchExpertContract(fetch, BASE, verified.contract);
    const b = await fetchExpertContract(fetch, BASE, unverified.contract);
    expect(a.ok && a.value?.validation?.status).toBe('verified');
    expect(b.ok && b.value?.validation?.status).toBe('unverified');
    expect(b.ok && b.value?.invocations).toBe(235213);
  });
});
