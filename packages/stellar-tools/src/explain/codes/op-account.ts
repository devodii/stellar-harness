import { type CodeEntry, entry } from '../code-info';

export const OP_ACCOUNT_CODES = {
  op_too_many_signers: entry(
    'options',
    'Too many signers',
    'The account already has the maximum of 20 signers.',
  ),
  op_bad_flags: entry(
    'options',
    'Bad flags',
    'The same flag is both set and cleared, or the flag combination is invalid.',
  ),
  op_invalid_inflation: entry(
    'options',
    'Invalid inflation destination',
    'The inflation destination account does not exist.',
  ),
  op_cant_change: entry(
    'options',
    'Cannot change',
    'The account is immutable (AUTH_IMMUTABLE), so its flags cannot be changed.',
  ),
  op_unknown_flag: entry(
    'options',
    'Unknown flag',
    'The operation sets a flag the protocol does not recognise.',
  ),
  op_threshold_out_of_range: entry(
    'options',
    'Threshold out of range',
    'A threshold or signer weight is outside 0 to 255.',
  ),
  op_bad_signer: entry(
    'options',
    'Bad signer',
    'The signer is the account own master key or is otherwise invalid as a signer.',
  ),
  op_invalid_home_domain: entry(
    'options',
    'Invalid home domain',
    'The home domain is longer than 32 characters or contains invalid characters.',
  ),
  op_auth_revocable_required: entry(
    'options',
    'Revocable required',
    'Clawback can only be enabled on an account that also has AUTH_REVOCABLE set.',
  ),
  op_invalid_limit: entry(
    'trust',
    'Invalid trustline limit',
    'The new trustline limit is below the current balance plus buying liabilities.',
  ),
  op_self_not_allowed: entry(
    'trust',
    'Self trust not allowed',
    'An issuer cannot create or authorize a trustline to its own asset.',
  ),
  op_trust_line_missing: entry(
    'trust',
    'Trustline missing',
    'A pool share trustline needs trustlines for both pool assets first.',
  ),
  op_cannot_delete: entry(
    'trust',
    'Cannot delete trustline',
    'The trustline cannot be removed while it still has a balance, liabilities or is used by a pool share trustline.',
  ),
  op_not_auth_maintain_liabilities: entry(
    'trust',
    'Not authorized to maintain liabilities',
    'The trustline is not authorized to keep its existing offers or liabilities.',
  ),
  op_not_required: entry(
    'trust',
    'Authorization not required',
    'The issuer does not require authorization, so there is nothing to allow or revoke.',
  ),
  op_cant_revoke: entry(
    'trust',
    'Cannot revoke',
    'The issuer is not AUTH_REVOCABLE, so it cannot revoke authorization.',
  ),
  op_invalid_state: entry(
    'trust',
    'Invalid trustline state',
    'The requested combination of trustline authorization flags is not valid.',
  ),
  op_no_account: entry(
    'destination',
    'Merge destination missing',
    'The account merge destination does not exist.',
  ),
  op_immutable_set: entry(
    'account',
    'Account immutable',
    'An account with AUTH_IMMUTABLE set cannot be merged.',
  ),
  op_has_sub_entries: entry(
    'account',
    'Account has subentries',
    'The account still has trustlines, offers, signers or data entries and cannot be merged until they are removed.',
  ),
  op_seq_num_too_far: entry(
    'sequence',
    'Sequence too far ahead',
    'The account sequence number is too high for it to be merged and recreated safely.',
  ),
  op_dest_full: entry(
    'limit',
    'Destination full',
    'The merge destination cannot receive the XLM because its balance would overflow.',
  ),
  op_is_sponsor: entry(
    'sponsorship',
    'Account is a sponsor',
    'The account sponsors other entries and cannot be merged until those sponsorships end.',
  ),
  op_not_time: entry(
    'time',
    'Inflation not due',
    'Inflation can no longer run or it is not yet time for the next run.',
  ),
  op_not_supported_yet: entry(
    'data',
    'Data not supported',
    'Data entries are not supported by the current protocol version.',
  ),
  op_data_name_not_found: entry(
    'data',
    'Data entry not found',
    'The data entry to delete does not exist on the account.',
  ),
  op_data_invalid_name: entry(
    'data',
    'Invalid data name',
    'The data entry name is empty or longer than 64 bytes.',
  ),
  op_bad_seq: entry(
    'sequence',
    'Bad bump sequence',
    'The bump sequence target is not a valid sequence number.',
  ),
} satisfies Record<string, CodeEntry>;
