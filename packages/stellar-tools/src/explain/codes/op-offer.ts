import { type CodeEntry, entry } from '../code-info';

export const OP_OFFER_CODES = {
  op_sell_no_trust: entry(
    'trust',
    'No trustline for selling asset',
    'The account has no trustline for the asset it is offering to sell.',
  ),
  op_buy_no_trust: entry(
    'trust',
    'No trustline for buying asset',
    'The account has no trustline for the asset it wants to buy.',
  ),
  sell_not_authorized: entry(
    'trust',
    'Not authorized to sell',
    'The issuer has not authorized the account to hold the asset being sold.',
  ),
  buy_not_authorized: entry(
    'trust',
    'Not authorized to buy',
    'The issuer has not authorized the account to hold the asset being bought.',
  ),
  op_sell_no_issuer: entry(
    'account',
    'Selling asset issuer missing',
    'The issuer of the asset being sold does not exist.',
  ),
  buy_no_issuer: entry(
    'account',
    'Buying asset issuer missing',
    'The issuer of the asset being bought does not exist.',
  ),
  op_offer_not_found: entry(
    'offer',
    'Offer not found',
    'The offer id to update or delete does not exist or belongs to another account.',
  ),
} satisfies Record<string, CodeEntry>;
