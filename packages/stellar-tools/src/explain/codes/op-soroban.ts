import { type CodeEntry, entry } from '../code-info';

export const OP_SOROBAN_CODES = {
  function_trapped: entry(
    'soroban',
    'Contract trapped',
    'The contract call failed during execution: the contract returned an error, panicked or failed an authorization check.',
  ),
  resource_limit_exceeded: entry(
    'soroban',
    'Resource limit exceeded',
    'The call used more CPU, memory, ledger reads or writes than the transaction declared. Simulate again and use the returned resource limits.',
  ),
  entry_archived: entry(
    'soroban',
    'Entry archived',
    'The call touched a contract instance, code or storage entry whose TTL has expired. Restore the entry, then extend its TTL.',
  ),
  insufficient_refundable_fee: entry(
    'soroban',
    'Refundable fee too low',
    'The refundable fee did not cover rent and events for this call. Simulate again and raise the resource fee.',
  ),
} satisfies Record<string, CodeEntry>;
