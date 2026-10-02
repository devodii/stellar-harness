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

export const decodeEnvelopePort =
  (networkPassphrase: string): DecodeEnvelopeSummary =>
  (envelopeXdr) =>
    toEnvelopePort(decodeEnvelopeSummary(envelopeXdr, networkPassphrase));

export type PortDecoders = {
  decodeResultCodes: DecodeResultCodes;
  decodeEnvelopeSummary: DecodeEnvelopeSummary;
};

export const createPortDecoders = (networkPassphrase: string): PortDecoders => ({
  decodeResultCodes,
  decodeEnvelopeSummary: decodeEnvelopePort(networkPassphrase),
});
