import type { DecodeEnvelopeSummary, DecodeResultCodes, Fetcher, HorizonPort } from '../ports';

export type HorizonToolContext = { horizon: HorizonPort };

export type TransactionToolContext = {
  fetch: Fetcher;
  rpcUrl: string;
  horizonUrl: string;
  decodeResultCodes: DecodeResultCodes;
  decodeEnvelopeSummary: DecodeEnvelopeSummary;
};

export type NetworkToolContext = HorizonToolContext & TransactionToolContext;
