import { type CodeEntry, entry } from '../code-info';

export const OP_SPONSORSHIP_CODES = {
  op_does_not_exist: entry(
    'claimable_balance',
    'Entry does not exist',
    'The claimable balance or sponsored entry referenced by the operation does not exist.',
  ),
  op_cannot_claim: entry(
    'claimable_balance',
    'Cannot claim',
    'The account is not a claimant, or the claim predicate is not satisfied yet.',
  ),
  op_already_sponsored: entry(
    'sponsorship',
    'Already sponsored',
    'The account is already being sponsored inside this transaction.',
  ),
  op_recursive: entry(
    'sponsorship',
    'Recursive sponsorship',
    'The sponsored account is itself sponsoring, which would create a sponsorship loop.',
  ),
  op_not_sponsored: entry(
    'sponsorship',
    'Not sponsored',
    'End sponsoring was called without a matching begin sponsoring.',
  ),
  op_not_sponsor: entry(
    'sponsorship',
    'Not the sponsor',
    'Only the current sponsor can revoke or transfer this sponsorship.',
  ),
  op_only_transferable: entry(
    'sponsorship',
    'Only transferable',
    'The sponsorship cannot be removed, only transferred to another sponsor.',
  ),
  op_not_clawback_enabled: entry(
    'clawback',
    'Clawback not enabled',
    'Clawback is not enabled on this trustline or claimable balance.',
  ),
  op_not_issuer: entry(
    'clawback',
    'Not the issuer',
    'Only the asset issuer can claw back this claimable balance.',
  ),
} satisfies Record<string, CodeEntry>;
