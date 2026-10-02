import { type CodeEntry, entry } from '../code-info';

export const OP_PAYMENT_CODES = {
  op_underfunded: entry(
    'balance',
    'Underfunded',
    'The source account does not hold enough of the asset, after liabilities and reserve, to send this amount.',
  ),
  op_src_no_trust: entry(
    'trust',
    'Source has no trustline',
    'The source account has no trustline for the asset it is trying to send.',
  ),
  op_src_not_authorized: entry(
    'trust',
    'Source not authorized',
    'The issuer has not authorized the source account to hold or send this asset.',
  ),
  op_no_destination: entry(
    'destination',
    'Destination missing',
    'The destination account does not exist. Create and fund it first, or use create account for XLM.',
  ),
  op_no_trust: entry(
    'trust',
    'No trustline',
    'The receiving account has no trustline for this asset, so it cannot hold it. A trustline must exist before the asset can be sent.',
  ),
  op_not_authorized: entry(
    'trust',
    'Not authorized',
    'The issuer requires authorization and has not authorized the account for this asset.',
  ),
  op_trustline_frozen: entry(
    'trust',
    'Trustline frozen',
    'The trustline used by this operation is frozen by the network, so it cannot send or receive the asset.',
  ),
  op_line_full: entry(
    'limit',
    'Trustline full',
    'The receiving trustline limit would be exceeded by this amount. Raise the limit or send less.',
  ),
  op_no_issuer: entry('account', 'Issuer missing', 'The asset issuer account does not exist.'),
  op_too_few_offers: entry(
    'path',
    'No path',
    'There is not enough liquidity on the order book or in pools along the path to fill this payment.',
  ),
  op_cross_self: entry(
    'offer',
    'Crosses own offer',
    'The operation would trade against an offer owned by the same account.',
  ),
  op_over_source_max: entry(
    'path',
    'Over source maximum',
    'Filling the payment would cost more than the send maximum the operation allows.',
  ),
  op_under_dest_min: entry(
    'path',
    'Under destination minimum',
    'The path would deliver less than the destination minimum the operation requires.',
  ),
  op_already_exists: entry(
    'destination',
    'Account already exists',
    'Create account was used for an account that already exists. Use a payment instead.',
  ),
  op_low_reserve: entry(
    'reserve',
    'Low reserve',
    'The account would fall below its minimum XLM reserve, either from this payment or from the new entry it creates.',
  ),
} satisfies Record<string, CodeEntry>;
