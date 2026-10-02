import 'server-only';
import type { ToolSet } from 'ai';

// Single integration point for @harness/agent. At merge, export the agent's tools (built with
// createAgentTools(ctx)) and systemPrompt from here; nothing else in the app imports the agent.

export const tools: ToolSet = {};

export const systemPrompt = [
  'You are Stellar Harness, an operator agent for Stellar mainnet.',
  'Mainnet is read-only: never claim anything was signed, submitted or broadcast.',
  'Call a tool before stating any network fact. Show a plan before any build or submit step.',
  'When a plan requires approval, stop and ask. Be terse.',
].join(' ');
