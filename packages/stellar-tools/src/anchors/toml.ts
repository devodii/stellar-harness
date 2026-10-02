import { type AppError, appError, err, ok, type Result } from '@harness/schema';
import { Networks } from '@stellar/stellar-sdk';
import { parse } from 'smol-toml';
import { tomlUrlFor } from './domain';
import type { Fetcher, HttpResponse } from './ports';
import { describeError, fetchText, isRecord } from './request';
import type { AnchorCurrency, AnchorToml, StageRecord } from './schemas';
import { stageRecord, startTimer } from './stage';

export const MAINNET_PASSPHRASE: string = Networks.PUBLIC;
const TEST_PASSPHRASES: string[] = [Networks.TESTNET, Networks.FUTURENET];

export type PassphraseKind = 'mainnet' | 'testnet' | 'nonstandard' | 'absent';

export const passphraseKind = (passphrase: string | null): PassphraseKind => {
  if (passphrase === null) return 'absent';
  if (passphrase === MAINNET_PASSPHRASE) return 'mainnet';
  if (TEST_PASSPHRASES.includes(passphrase)) return 'testnet';
  return 'nonstandard';
};

const text = (value: unknown): string | null => {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const texts = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(text).filter((v): v is string => v !== null) : [];

const currencies = (value: unknown): AnchorCurrency[] =>
  Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((entry) => ({ code: text(entry.code), issuer: text(entry.issuer) }))
        .filter((entry): entry is AnchorCurrency => entry.code !== null)
    : [];

export const extractToml = (doc: Record<string, unknown>): AnchorToml => ({
  signingKey: text(doc.SIGNING_KEY),
  accounts: [...new Set(texts(doc.ACCOUNTS))],
  currencies: currencies(doc.CURRENCIES),
  transferServer: text(doc.TRANSFER_SERVER),
  transferServerSep24: text(doc.TRANSFER_SERVER_SEP0024),
  directPaymentServer: text(doc.DIRECT_PAYMENT_SERVER),
  anchorQuoteServer: text(doc.ANCHOR_QUOTE_SERVER),
  webAuthEndpoint: text(doc.WEB_AUTH_ENDPOINT),
  kycServer: text(doc.KYC_SERVER),
  networkPassphrase: text(doc.NETWORK_PASSPHRASE),
  version: text(doc.VERSION),
});

export const parseToml = (source: string): Result<AnchorToml> => {
  try {
    return ok(extractToml(parse(source)));
  } catch (error) {
    const message = error instanceof Error ? (error.message.split('\n')[0] ?? '') : 'parse error';
    return err(appError('UPSTREAM_FAILED', `invalid_toml: ${message}`));
  }
};

export const issuers = (toml: AnchorToml): string[] => [
  ...new Set(toml.currencies.map((c) => c.issuer).filter((i): i is string => i !== null)),
];

export type TomlOutcome = {
  url: string;
  record: StageRecord;
  toml: AnchorToml | null;
  passphrase: PassphraseKind;
  response: HttpResponse | null;
  fetchError: AppError | null;
};

export const fetchToml = async (domain: string, fetch: Fetcher): Promise<TomlOutcome> => {
  const url = tomlUrlFor(domain);
  const elapsed = startTimer();
  const result = await fetchText(fetch, url);
  if (!result.ok) {
    return {
      url,
      record: stageRecord('toml', false, null, elapsed(), describeError(result.error)),
      toml: null,
      passphrase: 'absent',
      response: null,
      fetchError: result.error,
    };
  }
  const response = result.value;
  const fail = (error: string): TomlOutcome => ({
    url,
    record: stageRecord('toml', false, response.status, response.ms, error),
    toml: null,
    passphrase: 'absent',
    response,
    fetchError: null,
  });
  if (response.status !== 200) return fail(`http_${response.status}`);
  const parsed = parseToml(response.body);
  if (!parsed.ok) return fail(parsed.error.message);
  return {
    url,
    record: stageRecord('toml', true, response.status, response.ms),
    toml: parsed.value,
    passphrase: passphraseKind(parsed.value.networkPassphrase),
    response,
    fetchError: null,
  };
};
