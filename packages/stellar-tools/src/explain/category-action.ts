import type { CodeCategory } from './code-info';

export const CATEGORY_ACTION: Record<CodeCategory, string> = {
  success: 'No action needed.',
  sequence: 'Reload the source account sequence and rebuild the transaction before resubmitting.',
  fee: 'Raise the fee bid within the policy fee cap or fee-bump the transaction.',
  time: 'Rebuild with timebounds that match when the transaction will actually be submitted.',
  auth: 'Check signer weights against the account thresholds and collect the missing signatures.',
  balance: 'Check the source balance net of liabilities and reserve before sending.',
  reserve: 'Top up the XLM reserve before creating new ledger entries.',
  trust: 'Check trustlines and issuer authorization for both accounts before sending.',
  destination: 'Check that the destination account exists, or create and fund it under policy.',
  limit: 'Check the relevant limit before sending; split the amount or raise the limit.',
  offer: 'Reload open offers for the account and rebuild the offer operation.',
  path: 'Re-quote the path with strict send or strict receive and widen the slippage bound.',
  options: 'Review the account options being set against the protocol rules.',
  data: 'Review the data entry name and value against the protocol limits.',
  sponsorship: 'Review begin and end sponsoring pairs and the sponsor account limits.',
  claimable_balance: 'Load the claimable balance and check its claimants and predicates.',
  clawback: 'Check that clawback is enabled on the asset and that the issuer is signing.',
  liquidity_pool: 'Re-read pool reserves and rebuild with current price and minimum bounds.',
  soroban:
    'Simulate the transaction again, restore any archived entries, and use the returned resources.',
  malformed: 'Rebuild the transaction; it is invalid as constructed.',
  account: 'Check that every account the transaction references exists on the network.',
  internal: 'Retry once; if it repeats, report it to the network operators.',
};
