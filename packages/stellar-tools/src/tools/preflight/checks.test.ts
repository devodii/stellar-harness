import { ACTION_BY_CODE } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import type { HorizonAccount } from '../../ports';
import { parseAsset } from '../assets';
import { PREFLIGHT_CHECKS } from '../schemas';
import {
  fundedHolder,
  holder,
  issuer,
  MISSING,
  noTrustline,
  USDC,
  USDC_ISSUER,
  withUsdcLine,
} from './__tests__/accounts';
import { evaluatePreflight } from './checks';

const run = (
  source: HorizonAccount | null,
  destination: HorizonAccount | null,
  asset: string,
  amount: string,
) =>
  evaluatePreflight({
    from: source?.id ?? MISSING,
    to: destination?.id ?? MISSING,
    asset: parseAsset(asset),
    amount,
    source,
    destination,
  });

const codes = (evaluation: ReturnType<typeof evaluatePreflight>) =>
  evaluation.blockers.map((b) => b.code);

const check = (evaluation: ReturnType<typeof evaluatePreflight>, name: string) =>
  evaluation.checks.find((c) => c.name === name);

describe('evaluatePreflight', () => {
  it('always reports every check in canonical order', () => {
    const evaluation = run(fundedHolder, noTrustline, USDC, '25');
    expect(evaluation.checks.map((c) => c.name)).toEqual([...PREFLIGHT_CHECKS]);
  });

  it('blocks a USDC payment to an account without a trustline', () => {
    const evaluation = run(fundedHolder, noTrustline, USDC, '25');
    expect(evaluation.blockers).toEqual([{ code: 'op_no_trust', fix: ACTION_BY_CODE.op_no_trust }]);
    expect(check(evaluation, 'source_balance')).toMatchObject({ ok: true });
    expect(check(evaluation, 'destination_limit')).toMatchObject({ ok: false });
  });

  it('subtracts selling liabilities from the recorded live USDC balance', () => {
    const evaluation = run(holder, withUsdcLine(noTrustline), USDC, '1.0000002');
    expect(codes(evaluation)).toEqual(['op_underfunded']);
    expect(check(evaluation, 'source_balance')?.detail).toContain('1.0000001 USDC available');
    expect(codes(run(holder, withUsdcLine(noTrustline), USDC, '1.0000001'))).toEqual([]);
  });

  it('passes a payment that clears every check', () => {
    const evaluation = run(fundedHolder, withUsdcLine(noTrustline), USDC, '25');
    expect(evaluation.blockers).toEqual([]);
    expect(evaluation.checks.every((c) => c.ok)).toBe(true);
  });

  it('blocks XLM payments that would breach the source reserve', () => {
    const evaluation = run(holder, noTrustline, 'XLM', '1');
    expect(codes(evaluation)).toEqual(['op_low_reserve']);
    expect(evaluation.blockers[0]?.fix).toBe(ACTION_BY_CODE.op_low_reserve);
    expect(check(evaluation, 'source_reserve')?.detail).toContain(
      'minimum balance of 2.5000000 XLM',
    );
  });

  it('flags credit payments from a source that cannot pay the fee above its reserve', () => {
    const broke = withUsdcLine(
      { ...noTrustline, balances: [{ asset_type: 'native', balance: '1.0000000' }] },
      { balance: '30.0000000' },
    );
    const evaluation = run(broke, withUsdcLine(holder), USDC, '25');
    expect(codes(evaluation)).toEqual(['tx_insufficient_balance']);
  });

  it('reports only op_no_destination for a credit payment to a missing destination', () => {
    const evaluation = run(fundedHolder, null, USDC, '5');
    expect(codes(evaluation)).toEqual(['op_no_destination']);
    expect(evaluation.checks.filter((c) => !c.ok).map((c) => c.name)).toEqual([
      'destination_exists',
      'destination_trustline',
      'destination_authorized',
      'destination_limit',
    ]);
  });

  it('blocks a missing destination', () => {
    const evaluation = run(fundedHolder, null, 'XLM', '5');
    expect(codes(evaluation)).toEqual(['op_no_destination']);
    expect(check(evaluation, 'destination_exists')?.detail).toContain('create_account');
  });

  it('blocks an unauthorized destination trustline', () => {
    const evaluation = run(
      fundedHolder,
      withUsdcLine(noTrustline, { is_authorized: false }),
      USDC,
      '25',
    );
    expect(codes(evaluation)).toEqual(['op_not_authorized']);
  });

  it('blocks when the destination trustline limit has no headroom', () => {
    const destination = withUsdcLine(noTrustline, {
      limit: '30.0000000',
      balance: '4.0000000',
      buying_liabilities: '2.0000000',
    });
    expect(codes(run(fundedHolder, destination, USDC, '24'))).toEqual([]);
    expect(codes(run(fundedHolder, destination, USDC, '24.0000001'))).toEqual(['op_line_full']);
  });

  it('blocks a missing source and a source without the asset', () => {
    expect(codes(run(null, noTrustline, 'XLM', '1'))).toEqual(['tx_no_source_account']);
    expect(codes(run(noTrustline, withUsdcLine(holder), USDC, '1'))).toEqual(['op_src_no_trust']);
  });

  it('lets the issuer send its own asset and accept it back', () => {
    expect(issuer.id).toBe(USDC_ISSUER);
    expect(codes(run(issuer, withUsdcLine(noTrustline), USDC, '1000'))).toEqual([]);
    expect(codes(run(fundedHolder, issuer, USDC, '25'))).toEqual([]);
  });
});
