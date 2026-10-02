import { Keypair, StrKey, WebAuth } from '@stellar/stellar-sdk';
import { parse } from 'smol-toml';
import type { Clients } from './clients';

export type StageStatus = 'ok' | 'fail' | 'skip';
export type Stage = { name: string; status: StageStatus; detail: string };
export type AnchorProbe = { domain: string; stages: Stage[] };

type Toml = Record<string, unknown>;

const stage = (name: string, status: StageStatus, detail = ''): Stage => ({ name, status, detail });

const text = (toml: Toml, key: string): string | null =>
  typeof toml[key] === 'string' ? (toml[key] as string) : null;

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const getJson = async (clients: Clients, url: string): Promise<Record<string, unknown>> => {
  const response = await clients.fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
};

const fetchToml = async (clients: Clients, domain: string): Promise<Toml> => {
  const response = await clients.fetch(`https://${domain}/.well-known/stellar.toml`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parse(await response.text());
};

const infoStage = async (clients: Clients, toml: Toml): Promise<Stage> => {
  const servers = ['TRANSFER_SERVER_SEP0024', 'TRANSFER_SERVER']
    .map((key) => text(toml, key))
    .filter((server): server is string => server !== null);
  if (servers.length === 0) return stage('/info', 'skip', 'no transfer server declared');
  const failures: string[] = [];
  for (const server of servers) {
    await getJson(clients, `${server.replace(/\/$/, '')}/info`).catch((error) =>
      failures.push(`${server}/info: ${reason(error)}`),
    );
  }
  return failures.length > 0 ? stage('/info', 'fail', failures.join('; ')) : stage('/info', 'ok');
};

const sep10Stage = async (
  clients: Clients,
  domain: string,
  toml: Toml,
  signingKey: string | null,
): Promise<Stage> => {
  const endpoint = text(toml, 'WEB_AUTH_ENDPOINT');
  if (!endpoint) return stage('sep-10', 'skip', 'no WEB_AUTH_ENDPOINT declared');
  if (!signingKey) return stage('sep-10', 'fail', 'no signing key to verify the challenge');
  try {
    const url = new URL(endpoint);
    url.searchParams.set('account', Keypair.random().publicKey());
    const body = await getJson(clients, url.toString());
    if (typeof body.transaction !== 'string') throw new Error('no challenge transaction');
    WebAuth.readChallengeTx(body.transaction, signingKey, clients.passphrase, domain, url.host);
    return stage('sep-10', 'ok');
  } catch (error) {
    return stage('sep-10', 'fail', reason(error));
  }
};

export const probeAnchor = async (clients: Clients, domain: string): Promise<AnchorProbe> => {
  let toml: Toml;
  try {
    toml = await fetchToml(clients, domain);
  } catch (error) {
    return { domain, stages: [stage('toml', 'fail', reason(error))] };
  }
  const signingKey = text(toml, 'SIGNING_KEY');
  const validKey = signingKey !== null && StrKey.isValidEd25519PublicKey(signingKey);
  return {
    domain,
    stages: [
      stage('toml', 'ok'),
      stage('signing key', validKey ? 'ok' : 'fail', validKey ? '' : 'missing or invalid'),
      await infoStage(clients, toml),
      await sep10Stage(clients, domain, toml, validKey ? signingKey : null),
    ],
  };
};
