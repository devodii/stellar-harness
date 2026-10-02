import type { Org } from '@harness/schema';
import {
  buildPaymentPreflight,
  type Clients,
  getAccount,
  getContractTtl,
  probeAnchor,
  simulateExtendTtl,
  simulateRestore,
} from '@harness/stellar-tools';
import type { Storage } from '@harness/storage';
import { type InferUITools, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import { ProposeActionInput, proposeAction } from './propose-action';

export { isWithinPolicy, orgSubjects, proposeAction } from './propose-action';

export const SYSTEM_PROMPT =
  "You are Stellar Harness, the operator agent for one organisation. You only talk about this organisation's accounts, contracts and anchor domain, which you get from getOrg. Use tools before stating any fact. When you notice something that needs fixing, call simulate tools to get the cost, then call proposeAction. Say in one or two plain sentences what you found, what you propose, what it costs, and whether it is within the organisation's policy. You cannot execute anything in this demo; never say you did. Be terse. No marketing language.";

const address = z.string().describe('A Stellar account address (G...)');
const contractId = z.string().describe('A Soroban contract id (C...)');

const simulationSource = (org: Org): string =>
  (org.accounts.find((account) => account.role === 'treasury') ?? org.accounts[0])?.address ?? '';

export const createAgentTools = (storage: Storage, clients: Clients) => ({
  getOrg: tool({
    description:
      'Read-only. Returns the organisation this harness operates for: its name, network, accounts (address, label, role), contracts (id, label), anchor domain and policy (daily spend limit, allowed operations, approval threshold in XLM). Call it first; every other tool should only be used on subjects it returns.',
    inputSchema: z.object({}),
    execute: () => storage.getOrg(),
  }),
  getAccount: tool({
    description:
      'Read-only. Loads one account from Horizon: whether it exists, its XLM balance, sequence number, number of signers and its trustlines with balances and limits.',
    inputSchema: z.object({ address }),
    execute: ({ address }) => getAccount(clients, address),
  }),
  getContractTtl: tool({
    description:
      'Read-only. Reads the contract instance and its wasm code from Soroban RPC and returns how many days each has left before it is archived, whether it is already archived, and the wasm hash. Contracts with only a few days left need their TTL extended.',
    inputSchema: z.object({ contractId }),
    execute: ({ contractId }) => getContractTtl(clients, contractId),
  }),
  probeAnchor: tool({
    description:
      "Read-only. Probes an anchor domain over HTTPS: fetches its stellar.toml, checks the signing key, calls each transfer server's /info and requests a SEP-10 challenge, which it verifies without signing. Returns each stage as ok, fail or skip with a reason.",
    inputSchema: z.object({
      domain: z.string().describe('The anchor home domain, e.g. example.com'),
    }),
    execute: ({ domain }) => probeAnchor(clients, domain),
  }),
  simulateExtendTtl: tool({
    description:
      'Simulate-only. Asks Soroban RPC simulateTransaction what an ExtendFootprintTTL for the contract instance and its wasm code would cost, extending them to the given number of days from now. Nothing is signed or submitted. Returns the operation, the resource fee in stroops and the estimated cost in XLM.',
    inputSchema: z.object({ contractId, days: z.number().int().min(1).max(365) }),
    execute: async ({ contractId, days }) =>
      simulateExtendTtl(clients, {
        contractId,
        days,
        source: simulationSource(await storage.getOrg()),
      }),
  }),
  simulateRestore: tool({
    description:
      'Simulate-only. Asks Soroban RPC simulateTransaction what a RestoreFootprint for an archived contract instance and its wasm code would cost. Nothing is signed or submitted. Returns the operation, the resource fee in stroops and the estimated cost in XLM.',
    inputSchema: z.object({ contractId }),
    execute: async ({ contractId }) =>
      simulateRestore(clients, { contractId, source: simulationSource(await storage.getOrg()) }),
  }),
  buildPaymentPreflight: tool({
    description:
      'Read-only. Checks whether a payment would succeed before anyone builds it: that the receiver exists and trusts the asset, and that the sender holds enough of it without breaking its XLM reserve. Returns ok, or the blockers, each with its result code, a plain explanation and the fix.',
    inputSchema: z.object({
      from: address,
      to: address,
      asset: z.string().describe('XLM, or CODE:ISSUER for an issued asset'),
      amount: z.number().positive(),
    }),
    execute: (input) => buildPaymentPreflight(clients, input),
  }),
  proposeAction: tool({
    description:
      "Records a proposed fix for one of the organisation's subjects so the owner can see it. Give a short title, one plain sentence on why, the operation (one of the policy's allowed operations, or unsupported) and the estimated cost in XLM from a simulation when there is one. Returns the action with withinPolicy computed against the organisation's policy. It does not execute anything.",
    inputSchema: ProposeActionInput,
    execute: (input) => proposeAction(storage, input),
  }),
});

export type AgentTools = ReturnType<typeof createAgentTools>;
export type HarnessMessage = UIMessage<unknown, never, InferUITools<AgentTools>>;
