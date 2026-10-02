import { FINDING_TYPES } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { ANCHOR_FINDING_SEVERITY, ANCHOR_FINDING_STAGE } from './findings';

describe('anchor finding tables', () => {
  const anchorTypes = FINDING_TYPES.filter((type) => type.startsWith('ANCHOR_'));

  it('covers every anchor finding type', () => {
    expect(Object.keys(ANCHOR_FINDING_SEVERITY).sort()).toEqual([...anchorTypes].sort());
    expect(Object.keys(ANCHOR_FINDING_STAGE).sort()).toEqual([...anchorTypes].sort());
  });

  it('uses the brief severities', () => {
    expect(ANCHOR_FINDING_SEVERITY).toMatchObject({
      ANCHOR_TOML_UNREACHABLE: 'critical',
      ANCHOR_INFO_UNREADABLE: 'critical',
      ANCHOR_TOML_MISSING_SIGNING_KEY: 'high',
      ANCHOR_NO_SEP_ENDPOINTS: 'high',
      ANCHOR_SEP10_CHALLENGE_FAILS: 'high',
      ANCHOR_TESTS_FAILED: 'high',
      ANCHOR_ISSUER_FLAGS: 'info',
    });
  });
});
