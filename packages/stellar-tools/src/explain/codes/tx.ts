import { type CodeEntry, entry } from '../code-info';

export const TX_CODES = {
  tx_success: entry(
    'success',
    'Success',
    'The transaction was applied and every operation succeeded.',
  ),
  tx_fee_bump_inner_success: entry(
    'success',
    'Fee bump inner success',
    'The fee bump was applied and the wrapped transaction succeeded.',
  ),
  tx_failed: entry(
    'internal',
    'Operation failed',
    'One or more operations failed, so the whole transaction was rolled back. The operation codes say which one and why.',
  ),
  tx_too_early: entry(
    'time',
    'Too early',
    'The ledger closed before the transaction minimum time or minimum ledger bound. Submit again once the lower bound has passed.',
  ),
  tx_too_late: entry(
    'time',
    'Too late',
    'The transaction reached the network after its maximum time or ledger bound. It usually waited too long for signatures or sat in a queue behind higher fees.',
  ),
  tx_missing_operation: entry(
    'malformed',
    'No operations',
    'The transaction contains no operations, so there is nothing to apply.',
  ),
  tx_bad_seq: entry(
    'sequence',
    'Bad sequence number',
    'The sequence number is not exactly one above the source account current sequence. This usually means several transactions were built from the same account at once and collided.',
  ),
  tx_bad_auth: entry(
    'auth',
    'Bad authorization',
    'The signatures do not meet the threshold the source account requires, or a signature is invalid or for the wrong network.',
  ),
  tx_insufficient_balance: entry(
    'reserve',
    'Insufficient balance for fee',
    'Paying the fee would take the source account below its minimum XLM reserve.',
  ),
  tx_no_source_account: entry(
    'account',
    'Source account missing',
    'The source account does not exist on the network. It must be created and funded first.',
  ),
  tx_insufficient_fee: entry(
    'fee',
    'Fee too low',
    'The fee bid was below what the network required while the ledger was under surge pricing. Raise the fee or fee-bump the transaction.',
  ),
  tx_bad_auth_extra: entry(
    'auth',
    'Unused signatures',
    'The transaction carries signatures that are not needed by any signer. Remove the extra signatures.',
  ),
  tx_internal_error: entry(
    'internal',
    'Internal error',
    'The network hit an unexpected error applying the transaction. This is not caused by the transaction itself.',
  ),
  tx_not_supported: entry(
    'malformed',
    'Not supported',
    'The transaction type or a feature it uses is not supported by the current protocol.',
  ),
  tx_fee_bump_inner_failed: entry(
    'internal',
    'Fee bump inner failed',
    'The fee bump was valid but the wrapped transaction failed. The inner result codes say why.',
  ),
  tx_bad_sponsorship: entry(
    'sponsorship',
    'Unclosed sponsorship',
    'A begin sponsoring operation was not matched by an end sponsoring operation in the same transaction.',
  ),
  tx_bad_min_seq_age_or_gap: entry(
    'sequence',
    'Sequence age or gap precondition',
    'The minimum sequence age or minimum ledger gap precondition was not met when the transaction was applied.',
  ),
  tx_malformed: entry(
    'malformed',
    'Malformed transaction',
    'The transaction is invalid as built, for example bad preconditions or inconsistent Soroban resources.',
  ),
  tx_soroban_invalid: entry(
    'soroban',
    'Invalid Soroban transaction',
    'The Soroban resource declaration or footprint is invalid for this transaction. Simulate again and use the returned resources.',
  ),
} satisfies Record<string, CodeEntry>;
