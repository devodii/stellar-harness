import type { ScanContext } from '../context';
import { anchorsCommand } from './anchors';
import { contractsCommand } from './contracts';
import { failuresCommand } from './failures';
import { githubCommand } from './github';
import { rentCommand } from './rent';
import { reportCommand } from './report';

export type CommandOutcome = { findings: number };

export type CensusCommand = (
  ctx: ScanContext,
  paths: { reportPath: string },
) => Promise<CommandOutcome>;

export const COMMANDS: Record<string, CensusCommand> = {
  anchors: anchorsCommand,
  contracts: contractsCommand,
  failures: failuresCommand,
  rent: rentCommand,
  github: githubCommand,
  report: (ctx, { reportPath }) => reportCommand(ctx, reportPath),
};
