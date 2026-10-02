import { describe, expect, it } from 'vitest';
import { createPorts } from './adapters';
import horizon from './core/__fixtures__/horizon.json';
import rpc from './core/__fixtures__/rpc.json';
import { createExpertClient } from './core/expert';
import { createHorizonClient } from './core/horizon';
import { createRpcClient } from './core/rpc';
import { createStellarlightClient } from './core/stellarlight';
import { jsonResponse, mockHttp, rpcMethodOf } from './core/test-utils';

const RPC_URL = 'https://rpc.test';
const HORIZON_URL = 'https://horizon.test';

const setup = () => {
  const { http, calls } = mockHttp((url, init) => {
    if (url.startsWith(RPC_URL)) {
      const method = rpcMethodOf(init) as keyof typeof rpc;
      return jsonResponse(rpc[method]);
    }
    if (url.includes('/operations')) return jsonResponse(horizon.accountOperations);
    if (url.includes('/accounts/')) return jsonResponse(horizon.account);
    return jsonResponse({}, 404);
  });
  const clients = {
    config: {} as never,
    http,
    rpc: createRpcClient({ http, url: RPC_URL }),
    horizon: createHorizonClient({ http, url: HORIZON_URL }),
    expert: createExpertClient({ http, url: 'https://expert.test' }),
    stellarlight: createStellarlightClient({ http, url: 'https://light.test' }),
  };
  return { ports: createPorts(clients), calls };
};

describe('createPorts', () => {
  it('re-encodes ledger entries as base64 xdr', async () => {
    const { ports } = setup();
    const result = await ports.rpc.getLedgerEntries(
      rpc.getLedgerEntries.result.entries.map((e) => e.key),
    );
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.entries[0]?.xdr).toBe(rpc.getLedgerEntries.result.entries[0]?.xdr);
  });

  it('reads the first operation funder', async () => {
    const { ports } = setup();
    const result = await ports.horizon.firstOperation(horizon.account.id);
    expect(result.ok).toBe(true);
  });

  it('exposes the final url and status through the fetcher', async () => {
    const { ports } = setup();
    const result = await ports.fetch(`${HORIZON_URL}/missing`);
    expect(result).toMatchObject({
      ok: true,
      value: { status: 404, url: `${HORIZON_URL}/missing` },
    });
  });
});
