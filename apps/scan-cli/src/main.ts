import { COMMANDS, createScanContext } from '@harness/scanner';
import { commandSteps, parseScanArgs, USAGE } from './args';
import { findWorkspaceRoot, resolveFrom } from './paths';

const main = async (): Promise<number> => {
  let args: ReturnType<typeof parseScanArgs>;
  try {
    args = parseScanArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : USAGE);
    return 2;
  }

  const root = findWorkspaceRoot(process.env.INIT_CWD ?? process.cwd());
  const dataDir = resolveFrom(root, process.env.HARNESS_DATA_DIR ?? './data');
  const ctx = await createScanContext({
    dataDir,
    noCache: args.noCache,
    limit: args.limit,
    windowSeconds: args.windowSeconds,
    concurrency: args.concurrency,
    env: process.env,
  });
  ctx.log(`[scan] snapshot ledger ${ctx.snapshot.snapshotLedger} at ${ctx.snapshot.snapshotTime}`);

  for (const step of commandSteps(args.command)) {
    const command = COMMANDS[step];
    if (!command) {
      ctx.log(`[scan] ${step} is not available yet; skipped`);
      continue;
    }
    ctx.log(`[scan] ${step} started`);
    const outcome = await command(ctx, { reportPath: resolveFrom(root, 'REPORT.md') });
    ctx.log(`[scan] ${step} finished with ${outcome.findings} findings`);
  }

  const totals = ctx.stats();
  ctx.log(
    `[scan] requests ${totals.requests}, network ${totals.network}, cache hits ${totals.cacheHits}, gaps ${ctx.gaps.length}`,
  );
  return 0;
};

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
