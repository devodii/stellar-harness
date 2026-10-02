import { FINDING_TYPES, Plan } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { ACCOUNT_ID, CONTRACT_ID, makeFinding } from '../__fixtures__/findings';
import { TOOL_NAMES } from '../tools/names';
import { planForFinding, planIdFor } from './plan-fix';
import { PLAN_ACTIONS } from './step';

const policy = { spendCapXlm: 5 };
const knownTools = new Set<string>([...TOOL_NAMES, ...PLAN_ACTIONS]);
const toolsOf = (plan: Plan) => plan.steps.map((step) => step.tool);
const kindsOf = (plan: Plan) => plan.steps.map((step) => step.kind);

describe('planForFinding', () => {
  it.each(FINDING_TYPES)('builds a valid plan for %s', (type) => {
    const finding = makeFinding(type);
    const plan = planForFinding(finding, policy);

    expect(Plan.parse(plan)).toEqual(plan);
    expect(plan.planId).toBe(planIdFor(finding.findingId));
    expect(plan.subject).toBe(finding.subject);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(new Set(plan.steps.map((step) => step.id)).size).toBe(plan.steps.length);

    for (const step of plan.steps) {
      expect(knownTools.has(step.tool)).toBe(true);
      expect(step.status).toBe('pending');
      if (step.kind === 'read' || step.kind === 'simulate') {
        expect(TOOL_NAMES).toContain(step.tool);
      }
      expect(step.tool === 'submitTransaction').toBe(step.kind === 'submit');
    }

    const hasSubmit = plan.steps.some((step) => step.kind === 'submit');
    if (hasSubmit) expect(plan.requiresApproval).toBe(true);
    if (plan.requiresApproval) expect(plan.boundary).toBeDefined();
  });

  it('derives a deterministic plan id from the finding id', () => {
    const finding = makeFinding('TX_BAD_SEQ_CLUSTER');
    expect(planForFinding(finding, policy).planId).toBe(`plan_${finding.findingId.slice(0, 12)}`);
    expect(planForFinding(finding, policy)).toEqual(planForFinding(finding, policy));
  });

  it('plans an expiring contract as ttl read, extend simulation, build and approved submit', () => {
    const plan = planForFinding(makeFinding('CONTRACT_INSTANCE_EXPIRING_30D'), policy);
    expect(toolsOf(plan)).toEqual([
      'getContractTtl',
      'simulateExtendTtl',
      'buildTransaction',
      'submitTransaction',
    ]);
    expect(plan.steps[1]?.args).toEqual({ contractId: CONTRACT_ID, days: 365 });
    expect(plan.steps[2]?.args).toMatchObject({ fromStep: 's2' });
    expect(plan.steps[3]?.args).toMatchObject({ fromStep: 's3' });
    expect(plan.requiresApproval).toBe(true);
    expect(plan.boundary?.rule).toBe('submit_requires_approval');
  });

  it('plans an archived instance as restore then extend', () => {
    const plan = planForFinding(makeFinding('CONTRACT_INSTANCE_ARCHIVED'), policy);
    expect(toolsOf(plan)).toEqual([
      'getContractTtl',
      'simulateRestore',
      'buildTransaction',
      'submitTransaction',
      'simulateExtendTtl',
    ]);
  });

  it('applies the spend cap to rent above the cap', () => {
    const finding = makeFinding('CONTRACT_RENT_12M', { evidence: { xlm12m: 12.5 } });
    const plan = planForFinding(finding, policy);
    expect(plan.estimatedCostXlm).toBe(12.5);
    expect(plan.boundary).toMatchObject({
      rule: 'spend_cap',
      threshold: '5 XLM',
      requested: '12.5 XLM',
    });
  });

  it('sizes channel accounts from same ledger collisions and reads the sample tx', () => {
    const hash = 'a'.repeat(64);
    const finding = makeFinding('TX_BAD_SEQ_CLUSTER', {
      evidence: { count: 400, sameLedgerCollisions: 60, sampleHashes: [hash] },
    });
    const plan = planForFinding(finding, policy);
    expect(plan.steps[0]).toMatchObject({ tool: 'getAccount', args: { address: ACCOUNT_ID } });
    expect(plan.steps[1]).toMatchObject({ tool: 'getTransaction', args: { hash } });
    const create = plan.steps.find((step) => step.args.operation === 'createAccount');
    expect(create?.args.count).toBe(6);
    expect(plan.estimatedCostXlm).toBe(9);
    expect(plan.boundary?.rule).toBe('spend_cap');
    expect(plan.steps.at(-1)?.args.fromStep).toBe(create?.id);
  });

  it('falls back to explaining the code when no sample hash is recorded', () => {
    const plan = planForFinding(makeFinding('OP_NO_TRUST_CLUSTER'), policy);
    expect(plan.steps[1]).toMatchObject({
      tool: 'explainFailure',
      args: { codes: { tx: 'tx_failed', ops: ['op_no_trust'] } },
    });
  });

  it('adds a payment preflight when the cluster evidence names a destination and asset', () => {
    const finding = makeFinding('OP_NO_TRUST_CLUSTER', {
      evidence: { topDestination: ACCOUNT_ID, asset: 'USDC:GA5Z', sampleAmount: '25' },
    });
    const plan = planForFinding(finding, policy);
    expect(plan.steps).toContainEqual(
      expect.objectContaining({ tool: 'buildPaymentPreflight', kind: 'simulate' }),
    );
  });

  it('never submits for anchor findings and re-runs the probe', () => {
    for (const type of FINDING_TYPES.filter((name) => name.startsWith('ANCHOR_'))) {
      const plan = planForFinding(makeFinding(type), policy);
      expect(kindsOf(plan)).not.toContain('submit');
      expect(plan.requiresApproval).toBe(false);
      expect(toolsOf(plan).filter((tool) => tool === 'probeAnchor')).toHaveLength(2);
    }
  });

  it('runs anchor tests only for the anchor tests finding', () => {
    const plan = planForFinding(makeFinding('ANCHOR_TESTS_FAILED'), policy);
    expect(plan.steps[0]?.args).toMatchObject({ runAnchorTests: true });
  });

  it('only reads for repo findings', () => {
    for (const type of FINDING_TYPES.filter((name) => name.startsWith('REPO_'))) {
      expect(new Set(kindsOf(planForFinding(makeFinding(type), policy)))).toEqual(
        new Set(['read']),
      );
    }
  });
});
