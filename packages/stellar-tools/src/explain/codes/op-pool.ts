import { type CodeEntry, entry } from '../code-info';

export const OP_POOL_CODES = {
  op_bad_price: entry(
    'liquidity_pool',
    'Price out of bounds',
    'The pool price moved outside the minimum and maximum price the deposit allows.',
  ),
  op_pool_full: entry(
    'liquidity_pool',
    'Pool full',
    'The deposit would push pool reserves or shares past the maximum the protocol allows.',
  ),
  op_under_minimum: entry(
    'liquidity_pool',
    'Under minimum',
    'The withdrawal would return less than the minimum amounts the operation requires.',
  ),
} satisfies Record<string, CodeEntry>;
