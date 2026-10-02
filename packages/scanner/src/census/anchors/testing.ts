import { readFileSync } from 'node:fs';

export { fakeFetcher, fakeHorizon, jsonRoute } from '@harness/stellar-tools/anchors/testing';

export const readFixture = (relative: string): string =>
  readFileSync(new URL(`./__fixtures__/${relative}`, import.meta.url), 'utf8');

export const readJsonFixture = <T = unknown>(relative: string): T =>
  JSON.parse(readFixture(relative)) as T;
