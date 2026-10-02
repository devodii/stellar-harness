import { describe, expect, it } from 'vitest';
import archived from './__fixtures__/rpc-ledger-entries-archived.json';
import router from './__fixtures__/rpc-ledger-entries-router.json';
import {
  codeKeyXdr,
  decodeLedgerKey,
  instanceKeyXdr,
  parseInstanceExecutable,
  wasmHashFromInstanceEntry,
} from './keys';

const ROUTER = 'CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH';
const ROUTER_WASM = '4c3db3ebd2d6a2ab23de1f622eaabb39501539b4611b68622ec4e47f76c4ba07';

describe('ledger keys', () => {
  it('builds the instance key the RPC accepted', () => {
    expect(instanceKeyXdr(ROUTER)).toBe(router.request.keys[0]);
  });

  it('builds the code key the RPC accepted', () => {
    expect(codeKeyXdr(ROUTER_WASM)).toBe(router.request.keys[1]);
  });

  it('round trips a key through base64', () => {
    const key = decodeLedgerKey(instanceKeyXdr(ROUTER));
    expect(key.type).toBe('contractData');
  });
});

describe('parseInstanceExecutable', () => {
  it('extracts the wasm hash from a live instance entry', () => {
    const [instance] = router.result.entries;
    expect(wasmHashFromInstanceEntry(instance?.xdr ?? '')).toBe(ROUTER_WASM);
  });

  it('extracts the wasm hash from an archived instance entry', () => {
    const [instance] = archived.result.entries;
    expect(parseInstanceExecutable(instance?.xdr ?? '')).toEqual({
      kind: 'wasm',
      wasmHash: '07097f83dae3b746db7dba3263d9cc334efb88a9a7d5450fb96ca19f33d284b0',
    });
  });

  it('returns null for undecodable input', () => {
    expect(parseInstanceExecutable('not-xdr')).toBeNull();
  });
});
