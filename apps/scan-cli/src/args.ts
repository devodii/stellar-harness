import { parseArgs } from 'node:util';
import { parseDuration } from './duration';

export const CENSUSES = ['anchors', 'failures', 'contracts', 'rent', 'github', 'report'] as const;
export type Census = (typeof CENSUSES)[number];
export type Command = Census | 'all';

export const ALL_ORDER: readonly Census[] = [
  'anchors',
  'contracts',
  'rent',
  'failures',
  'github',
  'report',
];

export type ScanArgs = {
  command: Command;
  limit?: number;
  windowSeconds?: number;
  noCache: boolean;
  newSnapshot: boolean;
  concurrency: Record<string, number>;
};

export const USAGE = `usage: harness-scan <${[...CENSUSES, 'all'].join('|')}> [--limit N] [--window 7d] [--no-cache] [--new-snapshot] [--concurrency host=N]`;

const isCommand = (value: string): value is Command =>
  value === 'all' || (CENSUSES as readonly string[]).includes(value);

const parseConcurrency = (entries: string[]): Record<string, number> =>
  Object.fromEntries(
    entries.map((entry) => {
      const [host, raw] = entry.split('=');
      const value = Number(raw);
      if (!host || !Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid --concurrency "${entry}", expected host=N`);
      }
      return [host, value];
    }),
  );

export const parseScanArgs = (argv: string[]): ScanArgs => {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      limit: { type: 'string' },
      window: { type: 'string' },
      'no-cache': { type: 'boolean', default: false },
      'new-snapshot': { type: 'boolean', default: false },
      concurrency: { type: 'string', multiple: true, default: [] },
    },
  });

  const [command] = positionals;
  if (!command || !isCommand(command)) throw new Error(USAGE);

  const limit = values.limit === undefined ? undefined : Number(values.limit);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error(`Invalid --limit "${values.limit}"`);
  }

  return {
    command,
    limit,
    windowSeconds: values.window === undefined ? undefined : parseDuration(values.window),
    noCache: values['no-cache'],
    newSnapshot: values['new-snapshot'],
    concurrency: parseConcurrency(values.concurrency),
  };
};

export const commandSteps = (command: Command): readonly Census[] =>
  command === 'all' ? ALL_ORDER : [command];
