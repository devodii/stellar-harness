import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ACCOUNT_ID, CONTRACT_ID } from '../__fixtures__/findings';
import { TOOL_NAMES } from './names';
import {
  BuildPaymentPreflightInput,
  ExplainFailureInput,
  GetAccountOutput,
  GetContractTtlOutput,
  GetTransactionOutput,
  ProbeAnchorInput,
  SimulateExtendTtlInput,
  TOOL_SCHEMAS,
} from './schemas';

describe('tool schemas', () => {
  it('has input and output schemas for every tool name', () => {
    expect(Object.keys(TOOL_SCHEMAS).sort()).toEqual([...TOOL_NAMES].sort());
  });

  it.each(TOOL_NAMES)('exports an object json schema for %s input', (name) => {
    const json = z.toJSONSchema(TOOL_SCHEMAS[name].input, { io: 'input' });
    expect(json.type).toBe('object');
  });

  it('accepts exactly one explainFailure source', () => {
    expect(ExplainFailureInput.safeParse({ codes: { tx: 'tx_bad_seq', ops: [] } }).success).toBe(
      true,
    );
    expect(ExplainFailureInput.safeParse({ hash: 'a'.repeat(64) }).success).toBe(true);
    expect(ExplainFailureInput.safeParse({}).success).toBe(false);
    expect(ExplainFailureInput.safeParse({ hash: 'a'.repeat(64), resultXdr: 'AAAA' }).success).toBe(
      false,
    );
  });

  it('applies input defaults', () => {
    expect(ProbeAnchorInput.parse({ domain: 'example.com' }).runAnchorTests).toBe(false);
    expect(SimulateExtendTtlInput.parse({ contractId: CONTRACT_ID }).days).toBe(365);
  });

  it('rejects malformed identifiers and amounts', () => {
    expect(ProbeAnchorInput.safeParse({ domain: 'https://example.com/' }).success).toBe(false);
    expect(
      BuildPaymentPreflightInput.safeParse({
        from: ACCOUNT_ID,
        to: 'GBAD',
        asset: 'USDC',
        amount: '25',
      }).success,
    ).toBe(false);
    expect(
      BuildPaymentPreflightInput.safeParse({
        from: ACCOUNT_ID,
        to: ACCOUNT_ID,
        asset: `USDC:${ACCOUNT_ID}`,
        amount: '25.5',
      }).success,
    ).toBe(true);
  });

  it('parses representative outputs', () => {
    expect(
      GetAccountOutput.parse({
        address: ACCOUNT_ID,
        exists: true,
        sequence: '123',
        balances: [{ asset: 'XLM', balance: '10.0000000' }],
        thresholds: { low: 0, med: 2, high: 2 },
        signers: [{ key: ACCOUNT_ID, weight: 1 }],
        flags: {
          authRequired: false,
          authRevocable: false,
          authImmutable: false,
          authClawbackEnabled: false,
        },
        homeDomain: null,
        subentryCount: 1,
        numSponsoring: 0,
        numSponsored: 0,
      }).exists,
    ).toBe(true);

    expect(
      GetTransactionOutput.parse({
        hash: 'b'.repeat(64),
        ledger: 59_000_000,
        createdAt: '2026-10-01T00:00:00Z',
        successful: false,
        source: ACCOUNT_ID,
        feeCharged: 100,
        maxFee: 1000,
        operationCount: 1,
        operations: [{ type: 'payment' }],
        memoType: 'none',
        timebounds: { minTime: null, maxTime: '2026-10-01T00:05:00Z' },
        resultCodes: { tx: 'tx_failed', ops: ['op_no_trust'] },
        feeBump: null,
      }).successful,
    ).toBe(false);

    const absent = {
      present: false,
      liveUntilLedgerSeq: null,
      ledgersLeft: null,
      daysLeft: null,
      archived: true,
    };
    expect(
      GetContractTtlOutput.parse({
        contractId: CONTRACT_ID,
        wasmHash: null,
        instance: absent,
        code: absent,
        invocations: null,
        snapshotLedger: 59_000_000,
        ledgerCloseSeconds: 5.8,
      }).instance.archived,
    ).toBe(true);
  });
});
