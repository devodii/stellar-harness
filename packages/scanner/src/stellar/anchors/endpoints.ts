import { hostOf } from './domain';
import type { AnchorToml, StageRecord } from './schemas';
import { stageRecord } from './stage';

export const SEP_ENDPOINT_FIELDS = {
  TRANSFER_SERVER: 'transferServer',
  TRANSFER_SERVER_SEP0024: 'transferServerSep24',
  DIRECT_PAYMENT_SERVER: 'directPaymentServer',
  ANCHOR_QUOTE_SERVER: 'anchorQuoteServer',
  WEB_AUTH_ENDPOINT: 'webAuthEndpoint',
  KYC_SERVER: 'kycServer',
} as const satisfies Record<string, keyof AnchorToml>;

export type SepEndpointField = keyof typeof SEP_ENDPOINT_FIELDS;

const FIELDS = Object.entries(SEP_ENDPOINT_FIELDS) as [
  SepEndpointField,
  (typeof SEP_ENDPOINT_FIELDS)[SepEndpointField],
][];

export const sepEndpoints = (toml: AnchorToml): { field: SepEndpointField; url: string }[] =>
  FIELDS.flatMap(([field, key]) => {
    const url = toml[key];
    return url ? [{ field, url }] : [];
  });

export const endpointHosts = (toml: AnchorToml): string[] => [
  ...new Set(
    sepEndpoints(toml)
      .map(({ url }) => hostOf(url))
      .filter((host): host is string => host !== null),
  ),
];

export type EndpointsOutcome = { record: StageRecord; endpoints: SepEndpointField[] };

export const checkEndpoints = (toml: AnchorToml): EndpointsOutcome => {
  const endpoints = sepEndpoints(toml).map(({ field }) => field);
  const ok = endpoints.length > 0;
  return {
    record: stageRecord('endpoints', ok, null, 0, ok ? null : 'no_sep_endpoints'),
    endpoints,
  };
};
