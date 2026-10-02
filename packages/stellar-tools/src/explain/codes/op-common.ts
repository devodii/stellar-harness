import { type CodeEntry, entry } from '../code-info';

export const OP_COMMON_CODES = {
  op_success: entry('success', 'Success', 'The operation was applied.'),
  op_inner: entry(
    'internal',
    'Inner result',
    'The operation ran and its own result code describes the outcome.',
  ),
  op_bad_auth: entry(
    'auth',
    'Bad operation authorization',
    'The operation source account did not sign with enough weight for this operation threshold.',
  ),
  op_no_source_account: entry(
    'account',
    'Operation source missing',
    'The operation source account does not exist on the network.',
  ),
  op_not_supported: entry(
    'malformed',
    'Operation not supported',
    'The operation type is not supported by the current protocol.',
  ),
  op_too_many_subentries: entry(
    'limit',
    'Too many subentries',
    'The account already has the maximum number of subentries (trustlines, offers, signers, data entries).',
  ),
  op_exceeded_work_limit: entry(
    'limit',
    'Work limit exceeded',
    'The operation needed more work than the network allows in one operation, usually crossing too many offers.',
  ),
  op_too_many_sponsoring: entry(
    'sponsorship',
    'Too many sponsorships',
    'The sponsoring account would exceed the maximum number of entries it can sponsor.',
  ),
  op_malformed: entry(
    'malformed',
    'Malformed operation',
    'The operation parameters are invalid as built, for example a negative amount, a bad asset code or a missing field.',
  ),
} satisfies Record<string, CodeEntry>;
