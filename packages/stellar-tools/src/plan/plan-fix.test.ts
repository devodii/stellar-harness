import { FINDING_TYPES, Plan, ROADMAP_NOTE } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { ACCOUNT_ID, CONTRACT_ID, makeFinding } from '../__fixtures__/findings';
import { TOOL_NAMES } from '../tools/names';
import { planForFinding, planIdFor } from './plan-fix';
import { HANDOFF_TOOL } from './step';

const toolsOf = (plan: Plan) => plan.steps.map((step) => step.tool);
const kindsOf = (plan: Plan) => plan.steps.map((step) => step.kind);
const authorityOf = (type: (typeof FINDING_TYPES)[number]) =>
  planForFinding(makeFinding(type)).handoff.requiredAuthority;

const FORBIDDEN_WORDS = /approv|policy|submit|sign off/i;

describe('planForFinding', () => {
  it.each(FINDING_TYPES)('builds a valid plan ending in one handoff for %s', (type) => {
    const finding = makeFinding(type);
    const plan = planForFinding(finding);

    expect(Plan.parse(plan)).toEqual(plan);
    expect(plan.planId).toBe(planIdFor(finding.findingId));
    expect(plan.subject).toBe(finding.subject);
    expect(new Set(plan.steps.map((step) => step.id)).size).toBe(plan.steps.length);

    const last = plan.steps.at(-1);
    expect(last).toMatchObject({ kind: 'handoff', tool: HANDOFF_TOOL, args: {} });
    for (const step of plan.steps.slice(0, -1)) {
      expect(['read', 'simulate']).toContain(step.kind);
      expect(TOOL_NAMES).toContain(step.tool);
    }
    expect(plan.steps.every((step) => step.status === 'pending')).toBe(true);

    expect(plan.handoff.roadmapNote).toBe(ROADMAP_NOTE);
    expect(plan.handoff.summary).not.toMatch(/\n/);
    expect(plan.handoff.summary).not.toMatch(FORBIDDEN_WORDS);
    for (const step of plan.steps) expect(step.description).not.toMatch(FORBIDDEN_WORDS);
  });

  it('derives a deterministic plan id from the finding id', () => {
    const finding = makeFinding('TX_BAD_SEQ_CLUSTER');
    expect(planForFinding(finding).planId).toBe(`plan_${finding.findingId.slice(0, 12)}`);
    expect(planForFinding(finding)).toEqual(planForFinding(finding));
  });

  it('plans an expiring contract as ttl read, extend simulation and an any payer handoff', () => {
    const plan = planForFinding(makeFinding('CONTRACT_INSTANCE_EXPIRING_30D'));
    expect(toolsOf(plan)).toEqual(['getContractTtl', 'simulateExtendTtl', HANDOFF_TOOL]);
    expect(plan.steps[1]?.args).toEqual({ contractId: CONTRACT_ID, days: 365 });
    expect(plan.handoff.requiredAuthority).toBe('any_payer');
    expect(plan.handoff.summary).toMatch(/Any account can pay/);
    expect(plan.handoff.estimatedCostXlm).toBeUndefined();
  });

  it('plans an archived instance as restore then extend simulations', () => {
    const plan = planForFinding(makeFinding('CONTRACT_INSTANCE_ARCHIVED'));
    expect(toolsOf(plan)).toEqual([
      'getContractTtl',
      'simulateRestore',
      'simulateExtendTtl',
      HANDOFF_TOOL,
    ]);
    expect(plan.steps[1]?.args).toEqual({ contractId: CONTRACT_ID, entries: 'instance' });
    expect(plan.handoff.requiredAuthority).toBe('any_payer');
  });

  it('carries the 12 month rent from the evidence into the handoff cost', () => {
    const finding = makeFinding('CONTRACT_RENT_12M', { evidence: { xlm12m: 12.5 } });
    expect(planForFinding(finding).handoff.estimatedCostXlm).toBe(12.5);
  });

  it('names the authority that can act for each family of findings', () => {
    expect(authorityOf('CONTRACT_CODE_ARCHIVED')).toBe('any_payer');
    expect(authorityOf('CONTRACT_LIVE_IDLE')).toBe('contract_admin');
    expect(authorityOf('CONTRACT_UNVERIFIED_SOURCE')).toBe('contract_admin');
    for (const type of FINDING_TYPES.filter((name) => /^(TX|OP)_/.test(name))) {
      expect(authorityOf(type)).toBe('account_signer');
    }
    for (const type of FINDING_TYPES.filter((name) => name.startsWith('ANCHOR_'))) {
      expect(authorityOf(type)).toBe('anchor_operator');
    }
    expect(authorityOf('REPO_TTL_ISSUE')).toBe('contract_admin');
    expect(authorityOf('REPO_TX_FAILURE_ISSUE')).toBe('account_signer');
    expect(authorityOf('REPO_ANCHOR_CONFORMANCE_ISSUE')).toBe('anchor_operator');
  });

  it('sizes channel accounts from same ledger collisions and reads the sample tx', () => {
    const hash = 'a'.repeat(64);
    const finding = makeFinding('TX_BAD_SEQ_CLUSTER', {
      evidence: { count: 400, sameLedgerCollisions: 60, sampleHashes: [hash] },
    });
    const plan = planForFinding(finding);
    expect(plan.steps[0]).toMatchObject({ tool: 'getAccount', args: { address: ACCOUNT_ID } });
    expect(plan.steps[1]).toMatchObject({ tool: 'getTransaction', args: { hash } });
    expect(plan.handoff.summary).toMatch(/create 6 channel accounts/);
    expect(plan.handoff.estimatedCostXlm).toBeUndefined();
  });

  it('takes the reserve shortfall from the evidence only', () => {
    expect(planForFinding(makeFinding('OP_LOW_RESERVE_CLUSTER')).handoff.estimatedCostXlm).toBe(
      undefined,
    );
    const finding = makeFinding('OP_LOW_RESERVE_CLUSTER', { evidence: { shortfallXlm: 1.5 } });
    expect(planForFinding(finding).handoff.estimatedCostXlm).toBe(1.5);
  });

  it('falls back to explaining the code when no sample hash is recorded', () => {
    const plan = planForFinding(makeFinding('OP_NO_TRUST_CLUSTER'));
    expect(plan.steps[1]).toMatchObject({
      tool: 'explainFailure',
      args: { codes: { tx: 'tx_failed', ops: ['op_no_trust'] } },
    });
  });

  it('adds a payment preflight when the cluster evidence names a destination and asset', () => {
    const finding = makeFinding('OP_NO_TRUST_CLUSTER', {
      evidence: { topDestination: ACCOUNT_ID, asset: 'USDC:GA5Z', sampleAmount: '25' },
    });
    expect(planForFinding(finding).steps).toContainEqual(
      expect.objectContaining({ tool: 'buildPaymentPreflight', kind: 'simulate' }),
    );
  });

  it('probes anchors once and hands off to the operator', () => {
    for (const type of FINDING_TYPES.filter((name) => name.startsWith('ANCHOR_'))) {
      const plan = planForFinding(makeFinding(type));
      expect(toolsOf(plan)).toEqual(['probeAnchor', HANDOFF_TOOL]);
    }
  });

  it('runs anchor tests only for the anchor tests finding', () => {
    const plan = planForFinding(makeFinding('ANCHOR_TESTS_FAILED'));
    expect(plan.steps[0]?.args).toMatchObject({ runAnchorTests: true });
  });

  it('only reads before the handoff for repo findings', () => {
    for (const type of FINDING_TYPES.filter((name) => name.startsWith('REPO_'))) {
      expect(new Set(kindsOf(planForFinding(makeFinding(type))))).toEqual(
        new Set(['read', 'handoff']),
      );
    }
  });
});
