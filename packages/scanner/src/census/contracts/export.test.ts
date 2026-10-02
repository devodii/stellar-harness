import { describe, expect, it } from 'vitest';
import {
  archivedExportRows,
  CONTRACT_EXPORT_COLUMNS,
  contractStatus,
  expiring30dExportRows,
  SCF_EXPORT_COLUMNS,
  scfFundedExportRows,
} from './export';
import { contractRow, ttl } from './testing';

const scf = { slug: 'blend', name: 'Blend', round: null };
const rows = [
  contractRow(1, { instance: ttl.archived(), invocations: 3 }),
  contractRow(2, { instance: ttl.archived(), invocations: 90, scf }),
  contractRow(3, { instance: ttl.live(20) }),
  contractRow(4, { instance: ttl.live(5), scf }),
  contractRow(5, { instance: ttl.live(60) }),
  contractRow(6, { instance: null }),
];

describe('contract exports', () => {
  it('lists archived contracts with the brief columns, busiest first', () => {
    const exported = archivedExportRows(rows);
    expect(exported.map((row) => row.contract)).toEqual([rows[1]?.contract, rows[0]?.contract]);
    expect(Object.keys(exported[0] ?? {})).toEqual([...CONTRACT_EXPORT_COLUMNS]);
    expect(exported[0]).toMatchObject({
      wasm: 'ab'.repeat(32),
      family_size: 1,
      created: '2023-11-14T22:13:20.000Z',
      invocations: 90,
      live_until_ledger: 0,
      days_left: 0,
      scf_slug: 'blend',
      scf_round: null,
    });
  });

  it('lists contracts expiring within 30 days, soonest first', () => {
    expect(expiring30dExportRows(rows).map((row) => row.days_left)).toEqual([5, 20]);
  });

  it('lists scf funded contracts with name and status', () => {
    const exported = scfFundedExportRows(rows);
    expect(Object.keys(exported[0] ?? {})).toEqual([...SCF_EXPORT_COLUMNS]);
    expect(exported.map((row) => row.status)).toEqual(['archived', 'expiring_30d']);
    expect(exported[0]?.scf_name).toBe('Blend');
  });

  it('derives a status for every row', () => {
    expect(rows.map(contractStatus)).toEqual([
      'archived',
      'archived',
      'expiring_30d',
      'expiring_30d',
      'expiring_90d',
      'unknown',
    ]);
  });
});
