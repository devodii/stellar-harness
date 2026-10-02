export const STROOPS_PER_UNIT = 10_000_000n;

const AMOUNT_PATTERN = /^(-)?(\d+)(?:\.(\d{1,7}))?$/;

export const toStroops = (amount: string): bigint => {
  const match = AMOUNT_PATTERN.exec(amount.trim());
  if (!match) throw new Error(`Invalid amount "${amount}"`);
  const [, sign, whole = '0', fraction = ''] = match;
  const stroops = BigInt(whole) * STROOPS_PER_UNIT + BigInt(fraction.padEnd(7, '0'));
  return sign ? -stroops : stroops;
};

export const formatStroops = (stroops: bigint): string => {
  const negative = stroops < 0n;
  const abs = negative ? -stroops : stroops;
  const whole = abs / STROOPS_PER_UNIT;
  const fraction = (abs % STROOPS_PER_UNIT).toString().padStart(7, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
};

export const maxStroops = (a: bigint, b: bigint): bigint => (a > b ? a : b);
