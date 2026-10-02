import { ACTION_BY_CODE } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { invokeTool } from '../tool';
import { explainFailure } from './explain-failure';

const hash = 'c'.repeat(64);

describe('explainFailure tool', () => {
  it('explains codes without any network context', async () => {
    const result = await invokeTool(
      explainFailure,
      { codes: { tx: 'tx_failed', ops: ['op_underfunded'] } },
      {},
    );
    expect(result).toMatchObject({
      ok: true,
      data: { preventable: true, suggestedAction: ACTION_BY_CODE.op_underfunded },
    });
  });

  it('decodes result xdr through the context decoder', async () => {
    const result = await invokeTool(
      explainFailure,
      { resultXdr: 'AAAA' },
      { decodeResultCodes: () => ({ tx: 'tx_too_late', ops: [] }) },
    );
    expect(result.ok && result.data.codes.tx).toBe('tx_too_late');
  });

  it('looks a hash up through the context transaction reader', async () => {
    const result = await invokeTool(
      explainFailure,
      { hash },
      { getTransaction: async () => ({ resultCodes: { tx: 'tx_bad_auth', ops: [] } }) },
    );
    expect(result.ok && result.data.suggestedAction).toBe(ACTION_BY_CODE.tx_bad_auth);
  });

  it('fails clearly when the decoder is not wired', async () => {
    const result = await invokeTool(explainFailure, { resultXdr: 'AAAA' }, {});
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL', message: expect.stringMatching(/not configured/) },
    });
  });

  it('fails clearly when the transaction reader is not wired', async () => {
    const result = await invokeTool(explainFailure, { hash }, {});
    expect(result).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
  });

  it('surfaces upstream errors from the context as error results', async () => {
    const result = await invokeTool(
      explainFailure,
      { hash },
      {
        getTransaction: async () => {
          throw new Error('horizon down');
        },
      },
    );
    expect(result).toMatchObject({ ok: false, error: { message: 'horizon down' } });
  });

  it('rejects input with two sources', async () => {
    const result = await invokeTool(
      explainFailure,
      { hash, codes: { tx: 'tx_bad_seq', ops: [] } },
      {},
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
});
