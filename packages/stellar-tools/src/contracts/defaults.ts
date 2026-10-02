import { DEFAULT_NETWORK, type Network } from '@harness/schema';

export const SIMULATION_SOURCES: Record<Network, string> = {
  mainnet: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  testnet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
};

export const simulationSourceFor = (network: Network = DEFAULT_NETWORK): string =>
  SIMULATION_SOURCES[network];

export const DEFAULT_SIMULATION_SOURCE = simulationSourceFor(DEFAULT_NETWORK);

export const DEFAULT_LEDGER_CLOSE_SECONDS = 5;

export const RENT_HORIZON_DAYS = 365;
