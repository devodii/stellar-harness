import { ANCHOR_STAGES, type AnchorStage } from '../../schema';
import { type NetworkSelection, resolveNetwork } from '../core/network';
import { fail } from '../fail';
import { probeAccounts } from './accounts';
import { type CorsInput, checkCors } from './cors';
import { normalizeDomain } from './domain';
import { checkEndpoints } from './endpoints';
import { anchorFindings, type ProbeState } from './findings';
import { probeInfo } from './info';
import type { InfoEndpointOutcome } from './info-endpoint';
import type { Fetcher, HorizonPort } from './ports';
import type {
  AnchorProbeResult,
  AnchorTestSep,
  AnchorTestsReport,
  AnchorToml,
  ProbeDetails,
  StageRecord,
} from './schemas';
import { probeSep10 } from './sep10';
import { probeSep31 } from './sep31';
import { probeSep38 } from './sep38';
import { SKIP_REASONS, type SkipReason, skippedStage, stageRecord, startTimer } from './stage';
import { fetchToml } from './toml';

export type RunAnchorTests = (domain: string, seps: AnchorTestSep[]) => Promise<AnchorTestsReport>;

export type AnchorProbePorts = NetworkSelection & {
  fetch: Fetcher;
  horizon: HorizonPort;
  runAnchorTests?: RunAnchorTests;
};

export type ProbeAnchorOptions = { runAnchorTests?: boolean; tags?: string[] };

export const anchorTestSeps = (toml: AnchorToml): AnchorTestSep[] => [
  1,
  ...(toml.webAuthEndpoint ? [10 as const] : []),
  ...(toml.kycServer ? [12 as const] : []),
  ...(toml.transferServerSep24 ? [24 as const] : []),
  ...(toml.directPaymentServer ? [31 as const] : []),
  ...(toml.anchorQuoteServer ? [38 as const] : []),
];

const emptyDetails = (): ProbeDetails => ({
  accounts: [],
  endpoints: [],
  info: [],
  sep10: null,
  sep38: null,
  sep31: null,
  cors: [],
});

const testsFailures = (summary: AnchorTestsReport): string | null => {
  if (summary.error) return summary.error;
  const failing = Object.entries(summary.perSep)
    .filter(([, result]) => result.failed > 0)
    .map(([sep, result]) => `${sep} (${result.failed})`);
  return failing.length > 0 ? `failed: ${failing.join(', ')}` : null;
};

const runTestsStage = async (
  domain: string,
  toml: AnchorToml,
  ports: AnchorProbePorts,
  requested: boolean,
): Promise<{ record: StageRecord; summary: AnchorTestsReport | null }> => {
  if (!requested)
    return { record: skippedStage('tests', SKIP_REASONS.notRequested), summary: null };
  if (!ports.runAnchorTests) {
    return { record: skippedStage('tests', SKIP_REASONS.testsUnavailable), summary: null };
  }
  const elapsed = startTimer();
  try {
    const summary = await ports.runAnchorTests(domain, anchorTestSeps(toml));
    const error = testsFailures(summary);
    return { record: stageRecord('tests', error === null, null, elapsed(), error), summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'anchor tests failed to run';
    return { record: stageRecord('tests', false, null, elapsed(), message), summary: null };
  }
};

const corsInputs = (
  tomlInput: CorsInput,
  info: Awaited<ReturnType<typeof probeInfo>>,
  sep38: InfoEndpointOutcome,
  sep31: InfoEndpointOutcome,
): CorsInput[] => [
  tomlInput,
  ...info.probes.map(({ server, probe }) => ({
    target: server.sep === 'sep6' ? ('sep6_info' as const) : ('sep24_info' as const),
    url: probe.url,
    response: probe.response,
    fetchError: probe.fetchError,
  })),
  ...(
    [
      ['sep38_info', sep38],
      ['sep31_info', sep31],
    ] as const
  ).flatMap(([target, outcome]) =>
    outcome.probe
      ? [
          {
            target,
            url: outcome.probe.url,
            response: outcome.probe.response,
            fetchError: outcome.probe.fetchError,
          },
        ]
      : [],
  ),
];

export const probeAnchor = async (
  domainInput: string,
  ports: AnchorProbePorts,
  opts: ProbeAnchorOptions = {},
): Promise<AnchorProbeResult> => {
  const domain = normalizeDomain(domainInput);
  if (!domain) return fail('INVALID_INPUT', `not a public hostname: ${domainInput}`);

  const records = new Map<AnchorStage, StageRecord>();
  const details = emptyDetails();
  const tags: string[] = [];
  let anchorTests: AnchorTestsReport | null = null;

  const { passphrase } = resolveNetwork(ports);
  const tomlOutcome = await fetchToml(domain, ports.fetch, passphrase);
  records.set('toml', tomlOutcome.record);
  const toml = tomlOutcome.toml;

  const finish = (reason: SkipReason | null): AnchorProbeResult => {
    if (reason) {
      for (const stage of ANCHOR_STAGES) {
        if (!records.has(stage)) records.set(stage, skippedStage(stage, reason));
      }
    }
    const state: ProbeState = {
      domain,
      tomlUrl: tomlOutcome.url,
      stages: ANCHOR_STAGES.flatMap((stage) => records.get(stage) ?? []),
      toml,
      tags,
      details,
      anchorTests,
    };
    return { ...state, findings: anchorFindings(state, opts.tags) };
  };

  if (!toml) return finish(SKIP_REASONS.tomlUnreachable);
  if (tomlOutcome.passphrase === 'other_network') {
    const reason =
      tomlOutcome.passphraseNetwork === 'mainnet'
        ? SKIP_REASONS.mainnetToml
        : SKIP_REASONS.testnetToml;
    tags.push(reason);
    return finish(reason);
  }
  if (tomlOutcome.passphrase === 'nonstandard') tags.push('nonstandard_passphrase');

  const accounts = await probeAccounts(domain, toml, ports.horizon);
  records.set('accounts', accounts.record);
  details.accounts = accounts.accounts;

  const endpoints = checkEndpoints(toml);
  records.set('endpoints', endpoints.record);
  details.endpoints = endpoints.endpoints;
  if (!endpoints.record.ok) return finish(SKIP_REASONS.noSepEndpoints);

  const [info, sep10, sep38, sep31] = await Promise.all([
    probeInfo(toml, ports.fetch),
    probeSep10(domain, toml, ports.fetch, passphrase),
    probeSep38(toml, ports.fetch),
    probeSep31(toml, ports.fetch),
  ]);
  records.set('info', info.record);
  records.set('sep10', sep10.record);
  records.set('sep38', sep38.record);
  records.set('sep31', sep31.record);
  details.info = info.servers;
  details.sep10 = sep10.probe;
  details.sep38 = sep38.endpoint;
  details.sep31 = sep31.endpoint;

  const cors = checkCors(
    corsInputs(
      {
        target: 'toml',
        url: tomlOutcome.url,
        response: tomlOutcome.response,
        fetchError: tomlOutcome.fetchError,
      },
      info,
      sep38,
      sep31,
    ),
  );
  records.set('cors', cors.record);
  details.cors = cors.checks;

  const tests = await runTestsStage(domain, toml, ports, opts.runAnchorTests ?? false);
  records.set('tests', tests.record);
  anchorTests = tests.summary;

  return finish(null);
};
