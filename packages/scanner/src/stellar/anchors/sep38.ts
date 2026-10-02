import { type InfoEndpointOutcome, probeInfoEndpoint } from './info-endpoint';
import type { Fetcher } from './ports';
import type { AnchorToml } from './schemas';

export const probeSep38 = (toml: AnchorToml, fetch: Fetcher): Promise<InfoEndpointOutcome> =>
  probeInfoEndpoint('sep38', toml.anchorQuoteServer, fetch, 'assets', Array.isArray);
