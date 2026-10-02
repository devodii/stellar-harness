import { Networks } from '@stellar/stellar-sdk';
import type { DecodeEnvelopeSummary, DecodeResultCodes } from '../ports';
import type { EnvelopeSummary as EnvelopePort } from '../tools/decoder-schemas';
import { decodeEnvelopeSummary, type EnvelopeSummary } from './envelope';
import { decodeResultCodes } from './result-codes';

export const toEnvelopePort = (summary: EnvelopeSummary): EnvelopePort => ({
  sourceAccount: summary.source,
  feeSource: summary.feeSource,
  ...(summary.innerHash ? { innerHash: summary.innerHash } : {}),
  sequence: summary.seq,
  maxFee: summary.fee,
  operationCount: summary.opTypes.length,
  memoType: summary.memoType,
  opTypes: summary.opTypes,
  operations: summary.operations,
  feeBump: summary.feeBump,
  ...(summary.timeBounds
    ? {
        timeBounds: {
          minTime: String(summary.timeBounds.minTime),
          maxTime: String(summary.timeBounds.maxTime),
        },
      }
    : {}),
});

export const decodeEnvelopePort: DecodeEnvelopeSummary = (envelopeXdr) =>
  toEnvelopePort(decodeEnvelopeSummary(envelopeXdr, Networks.PUBLIC));

export type PortDecoders = {
  decodeResultCodes: DecodeResultCodes;
  decodeEnvelopeSummary: DecodeEnvelopeSummary;
};

export const portDecoders: PortDecoders = {
  decodeResultCodes,
  decodeEnvelopeSummary: decodeEnvelopePort,
};
