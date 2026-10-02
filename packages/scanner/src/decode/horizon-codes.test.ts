import { describe, expect, it } from 'vitest';
import horizon from './horizon-codes.json';
import { innerOpCode, OUTER_OP_CODES, TX_CODES } from './result-codes';

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

const { Transaction, Operation, ...operations } = horizon.codes;

describe('result codes match Horizon', () => {
  it.each(Object.entries(Transaction))('maps %s to %s', (member, code) => {
    expect(TX_CODES[member as keyof typeof TX_CODES]).toBe(code);
  });

  it.each(Object.entries(Operation).filter(([member]) => member !== 'opInner'))(
    'maps outer %s to %s',
    (member, code) => {
      expect(OUTER_OP_CODES[member as keyof typeof OUTER_OP_CODES]).toBe(code);
    },
  );

  const cases = Object.entries(operations).flatMap(([type, members]) =>
    Object.entries(members).map(([member, code]) => [lowerFirst(type), member, code] as const),
  );

  it.each(cases)('maps %s result %s to %s', (operation, member, code) => {
    expect(innerOpCode(operation, member)).toBe(code);
  });
});
