const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86_400 } as const;

export const parseDuration = (value: string): number => {
  const match = /^(\d+(?:\.\d+)?)([smhd])$/.exec(value.trim());
  if (!match) throw new Error(`Invalid duration "${value}", expected e.g. 7d, 24h, 30m`);
  return Number(match[1]) * UNIT_SECONDS[match[2] as keyof typeof UNIT_SECONDS];
};
